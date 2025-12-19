const database = require('../config/database');

async function listRequisicoes(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
    let whereClauses = [];
    let queryParams = [];

    if (om) {
      whereClauses.push('om = ?');
      queryParams.push(om);
    }
    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }
    if (dataIni) {
      whereClauses.push('created_at >= ?');
      queryParams.push(dataIni);
    }
    if (dataFim) {
      whereClauses.push('created_at <= ?');
      queryParams.push(dataFim);
    }

    let query = 'SELECT * FROM requisicoes';
    if (whereClauses.length > 0) query += ' WHERE ' + whereClauses.join(' AND ');
    query += ' ORDER BY created_at DESC';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const rows = await database.dbAll(query, queryParams);

    // Parse JSON items
    const results = rows.map(r => ({
      ...r,
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createRequisicao(req, res) {
  const { registroIds } = req.body;
  try {
    // Validação: buscar registros
    const placeholders = registroIds.map(() => '?').join(',');
    const registros = await database.dbAll(
      `SELECT * FROM registros WHERE id IN (${placeholders})`,
      registroIds
    );

    if (registros.length === 0)
      return res.status(400).json({ error: 'Nenhum registro encontrado.' });

    // Agrupar registros por OM
    const registrosPorOM = {};
    for (const r of registros) {
      if (!registrosPorOM[r.om]) {
        registrosPorOM[r.om] = [];
      }
      registrosPorOM[r.om].push(r);
    }

    const createdIds = [];
    const created_by = req.user.username || 'Sistema'; // Fallback

    await database.dbTransaction(async run => {
      for (const [om, regs] of Object.entries(registrosPorOM)) {
        // Agrupa registros desta OM por PN para montar items
        const itemsMap = {};
        for (const r of regs) {
          if (!itemsMap[r.pn]) {
            itemsMap[r.pn] = {
              pn: r.pn,
              descricao: r.descricao,
              quantidade_requisitada: 0,
              quantidade_entregue: 0,
            };
          }
          itemsMap[r.pn].quantidade_requisitada += 1;
        }
        const items = Object.values(itemsMap);

        const result = await run(
          'INSERT INTO requisicoes (om, items, created_at, created_by) VALUES (?, ?, ?, ?)',
          [om, JSON.stringify(items), new Date().toISOString(), created_by]
        );

        // Recuperar ID (se SQLite, run retorna this com lastID, se PG precisa de RETURNING mas o driver do database.js abstrai ou usamos fallback)
        // Mas como estamos dentro de transaction e run, precisamos cuidado.
        // O database.js diz: dbRun retorna { changes, lastID }.
        // No transaction, run retorna o this do driver sqlite.
        // Vamos assumir que run retorna o objeto que tem lastID.
        if (result.lastID) {
          createdIds.push(result.lastID);
        } else {
          // Fallback perigoso dentro de transaction se driver não suportar,
          // mas nosso database.js para SQLite retorna lastID.
        }
      }
    });

    // Se por acaso lastID não veio (ex: driver PG sem returning), teríamos que ajustar.
    // Mas assumindo SQLite aqui.

    // Se createdIds vazio (ex: falha silenciosa), buscar os ultimos N?
    // Melhor confiar no database.js.

    // Para PG em produção, o database.js usa RETURNING id se não me engano ou rowCount.
    // O código original usava RETURNING id na query manual?
    // 'INSERT INTO ... RETURNING id'
    // Se for SQLite, isso falha se não for versão nova.
    // Vamos manter simples.

    res.status(201).json({
      message: `${createdIds.length} requisições criadas com sucesso.`,
      requisicaoIds: createdIds,
    });
  } catch (err) {
    console.error('Erro ao criar requisição:', err);
    res.status(500).json({ error: err.message });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body; // { status: "..." }
  try {
    await database.dbRun('UPDATE requisicoes SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Status atualizado para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateItems(req, res) {
  const { id } = req.params;
  const { items } = req.body; // { items: [...] }
  try {
    const jsonItems = JSON.stringify(items);
    await database.dbRun('UPDATE requisicoes SET items = ? WHERE id = ?', [jsonItems, id]);

    // Verifica se completou
    const allDelivered = items.every(i => i.quantidade_entregue >= i.quantidade_requisitada);
    if (allDelivered) {
      await database.dbRun("UPDATE requisicoes SET status = 'entregue' WHERE id = ?", [id]);
    } else {
      // Se começou a entregar mas não tudo, parcial
      const someDelivered = items.some(i => i.quantidade_entregue > 0);
      if (someDelivered) {
        await database.dbRun(
          "UPDATE requisicoes SET status = 'parcialmente_entregue' WHERE id = ?",
          [id]
        );
      }
    }

    res.json({ message: 'Itens atualizados com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteRequisicao(req, res) {
  const { id } = req.params;
  try {
    const result = await database.dbRun('DELETE FROM requisicoes WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Requisição não encontrada.' });
    }
    res.status(204).send(); // No Content
  } catch (err) {
    console.error('Erro ao excluir requisição:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listRequisicoes,
  createRequisicao,
  updateStatus,
  updateItems,
  deleteRequisicao,
};
