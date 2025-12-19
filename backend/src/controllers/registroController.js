const database = require('../config/database');

async function listRegistros(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
    // req.user já vem do middleware
    const isAdminUser = req.user && req.user.role === 'admin';

    let whereClauses = [];
    let queryParams = [];

    if (!isAdminUser) {
      whereClauses.push("om NOT LIKE 'DEMO-%'"); // Filtra demos para não admins
    }
    if (om) {
      whereClauses.push('om = ?');
      queryParams.push(om);
    }
    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }
    if (dataIni) {
      whereClauses.push('createdat >= ?');
      queryParams.push(dataIni);
    }
    if (dataFim) {
      whereClauses.push('createdat <= ?');
      queryParams.push(dataFim);
    }

    let query = 'SELECT * FROM registros';
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    query += ' ORDER BY createdat DESC';

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const registrosRaw = await database.dbAll(query, queryParams);

    // Normaliza chaves para garantir compatibilidade com frontend (que espera lowercase)
    // O banco existente pode ter colunas em camelCase (tipoDefeito, createdAt)
    const registros = registrosRaw.map(r => ({
      ...r,
      tipodefeito: r.tipodefeito || r.tipoDefeito, // Fallback para camelCase
      createdat: r.createdat || r.createdAt, // Fallback para camelCase
    }));

    // Count total para paginação (não muda)
    let countQuery = 'SELECT COUNT(*) as total FROM registros';
    if (whereClauses.length > 0) {
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }
    const countRes = await database.dbGet(countQuery, queryParams);
    const total = countRes
      ? countRes.total !== undefined
        ? countRes.total
        : Object.values(countRes)[0]
      : 0;

    res.json({
      data: registros,
      meta: {
        total: total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createRegistrosBatch(req, res) {
  const registros = req.body; // Já validado pelo schema batch
  const now = new Date().toISOString();
  const operador = req.user.name || req.user.username;

  try {
    // Usando dbTransaction para garantir atomicidade
    await database.dbTransaction(async run => {
      for (const reg of registros) {
        const id = reg.id || 'REG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const r = {
          ...reg,
          id,
          createdat: reg.createdat || now,
          status: 'pendente',
          operador: operador,
        };

        await run(
          'INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador, prioridade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            r.id,
            r.om,
            r.qtdlote,
            r.serial,
            r.designador,
            r.tipodefeito,
            r.pn,
            r.descricao,
            r.obs,
            r.createdat,
            r.status,
            r.operador,
            r.prioridade,
          ]
        );
      }
    });
    res.status(201).json({ message: `${registros.length} registros criados com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStatusBatch(req, res) {
  const { ids } = req.body;
  const { status } = req.params; // Vem da URL: /status/:status

  // Validar status permitido se necessário (mas o schema já cuida de string min 1, aqui podemos restringir enum)
  const validStatus = ['pendente', 'em_analise', 'reparado', 'sucata'];
  // Nota: O código original não validava enum estrito no backend além do Zod string, mas vamos manter simples.

  try {
    await database.dbTransaction(async run => {
      for (const id of ids) {
        await run('UPDATE registros SET status = ? WHERE id = ?', [status, id]);
      }
    });
    res.json({ message: `${ids.length} registros atualizados para ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateRegistro(req, res) {
  const { id } = req.params;
  const data = req.body;
  try {
    // Constrói query dinâmica
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);

    const result = await database.dbRun(
      `UPDATE registros SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Registro não encontrado' });

    const updated = await database.dbGet('SELECT * FROM registros WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteRegistro(req, res) {
  const { id } = req.params;
  try {
    // Verificar se o registro existe antes de deletar
    const registro = await database.dbGet('SELECT * FROM registros WHERE id = ?', [id]);

    if (!registro) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    // Opcional: Verificar permissões (se for regra de negócio)
    // Se for DEMO, permitir sempre? Ou manter regra padrão?
    // Por enquanto, apenas execute o delete.

    await database.dbRun('DELETE FROM registros WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir registro:', err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteRegistrosBatch(req, res) {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs inválida.' });
  }

  try {
    await database.dbTransaction(async run => {
      for (const id of ids) {
        // Verificar se registro existe
        await run('DELETE FROM registros WHERE id = ?', [id]);
      }
    });

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir registros em lote:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listRegistros,
  createRegistrosBatch,
  updateStatusBatch,
  updateRegistro,
  deleteRegistro,
  deleteRegistrosBatch,
};
