const prisma = require('../config/prisma');

async function listRegistros(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
    const isAdminUser = req.user && req.user.role === 'admin';

    const where = {};

    if (!isAdminUser) {
      where.NOT = { om: { startsWith: 'DEMO-' } };
    }
    if (om) where.om = om;
    if (status) where.status = status;

    if (dataIni || dataFim) {
      where.createdat = {};
      if (dataIni) where.createdat.gte = dataIni;
      if (dataFim) where.createdat.lte = dataFim;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const [total, registrosRaw] = await Promise.all([
      prisma.registros.count({ where }),
      prisma.registros.findMany({
        where,
        orderBy: { createdat: 'desc' },
        skip: offset,
        take: limitNum,
      }),
    ]);

    const registros = registrosRaw.map(r => ({
      ...r,
      tipodefeito: r.tipodefeito,
      createdat: r.createdat,
    }));

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
  const registros = req.body;
  const now = new Date().toISOString();
  const operador = req.user.name || req.user.username;

  try {
    await prisma.$transaction(async tx => {
      for (const reg of registros) {
        const id = reg.id || 'REG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const r = {
          ...reg,
          id,
          createdat: reg.createdat || now,
          status: 'pendente',
          operador: operador,
        };

        await tx.registros.create({
          data: {
            id: r.id,
            om: r.om,
            qtdlote: r.qtdlote,
            serial: r.serial,
            designador: r.designador,
            tipodefeito: r.tipodefeito,
            pn: r.pn,
            descricao: r.descricao,
            obs: r.obs,
            createdat: r.createdat,
            status: r.status,
            operador: r.operador,
            prioridade: r.prioridade,
          },
        });
      }
    });
    res.status(201).json({ message: `${registros.length} registros criados com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStatusBatch(req, res) {
  const { ids } = req.body;
  const { status } = req.params;

  try {
    await prisma.registros.updateMany({
      where: { id: { in: ids } },
      data: { status },
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
    const updated = await prisma.registros.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function deleteRegistro(req, res) {
  const { id } = req.params;
  try {
    await prisma.registros.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }
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
    await prisma.registros.deleteMany({
      where: { id: { in: ids } },
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
