const prisma = require('../config/prisma');

async function listRequisicoes(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;

    const where = {};
    if (om) where.om = om;
    if (status) where.status = status;
    if (dataIni || dataFim) {
      where.created_at = {};
      if (dataIni) where.created_at.gte = dataIni;
      if (dataFim) where.created_at.lte = dataFim;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const rows = await prisma.requisicoes.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limitNum,
    });

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
    const registrosRaw = await prisma.registros.findMany({
      where: {
        id: { in: registroIds },
      },
    });

    const registros = registrosRaw.map(r => ({
      ...r,
      tipodefeito: r.tipodefeito || '',
      pn: r.pn || '',
    }));

    if (registros.length === 0)
      return res.status(400).json({ error: 'Nenhum registro encontrado.' });

    const DEFEITOS_REQUISICAO = ['Ausente', 'Danificado', 'Incorreto'];

    const registrosValidos = registros.filter(r => {
      const tipo = r.tipodefeito ? r.tipodefeito.trim() : '';
      return DEFEITOS_REQUISICAO.includes(tipo);
    });

    if (registrosValidos.length === 0) {
      return res.status(400).json({
        error:
          'Nenhum dos registros selecionados necessita de requisição de componente. Apenas "Ausente", "Danificado" ou "Incorreto" podem gerar requisição.',
      });
    }

    const registrosPorOM = {};
    for (const r of registrosValidos) {
      if (!registrosPorOM[r.om]) {
        registrosPorOM[r.om] = [];
      }
      registrosPorOM[r.om].push(r);
    }

    const createdIds = [];
    const created_by = req.user.username || 'Sistema';

    await prisma.$transaction(async tx => {
      for (const [om, regs] of Object.entries(registrosPorOM)) {
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

        const newReq = await tx.requisicoes.create({
          data: {
            om,
            items: JSON.stringify(items),
            created_at: new Date().toISOString(),
            created_by,
          },
        });
        createdIds.push(newReq.id);
      }
    });

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
  const { status } = req.body;
  try {
    await prisma.requisicoes.update({
      where: { id: parseInt(id, 10) },
      data: { status },
    });
    res.json({ message: `Status atualizado para ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateItems(req, res) {
  const { id } = req.params;
  const { items } = req.body;
  try {
    const jsonItems = JSON.stringify(items);

    let computedStatus = 'pendente';
    const allDelivered = items.every(i => i.quantidade_entregue >= i.quantidade_requisitada);
    if (allDelivered) {
      computedStatus = 'entregue';
    } else {
      const someDelivered = items.some(i => i.quantidade_entregue > 0);
      if (someDelivered) computedStatus = 'parcialmente_entregue';
    }

    await prisma.requisicoes.update({
      where: { id: parseInt(id, 10) },
      data: { items: jsonItems, status: computedStatus },
    });

    res.json({ message: 'Itens atualizados com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteRequisicao(req, res) {
  const { id } = req.params;
  try {
    await prisma.requisicoes.delete({
      where: { id: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Requisição não encontrada.' });
    }
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
