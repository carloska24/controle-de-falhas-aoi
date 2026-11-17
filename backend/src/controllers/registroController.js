const prisma = require('../config/prisma');
const { randomUUID } = require('node:crypto');
const { getPagination } = require('../utils/pagination');

async function listRegistros(req, res) {
  try {
    const { om, status, dataIni, dataFim } = req.query;
    const { page, limit, skip } = getPagination(req.query);
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

    const [total, registrosRaw] = await prisma.$transaction(async tx => [
      await tx.registros.count({ where }),
      await tx.registros.findMany({
        where,
        orderBy: [{ createdat: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ], { isolationLevel: 'RepeatableRead' });

    const registros = registrosRaw.map(r => ({
      ...r,
      tipodefeito: r.tipodefeito,
      createdat: r.createdat,
    }));

    res.json({
      data: registros,
      meta: {
        total: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Falha ao consultar registros.' });
  }
}

async function createRegistrosBatch(req, res) {
  const registros = req.body;
  const now = new Date().toISOString();
  const operador = req.user.name || req.user.email;

  try {
    await prisma.$transaction(async tx => {
      for (const reg of registros) {
        const id = reg.id || 'REG-' + randomUUID();
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
  const { ids, versions } = req.body;
  const { status } = req.params;

  try {
    await prisma.$transaction(async tx => {
      const current = await tx.registros.findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (current.length !== ids.length) throw Object.assign(new Error('Um ou mais registros não foram encontrados.'), { status: 404 });
      const updated = await tx.registros.updateMany({
        where: { OR: ids.map(id => ({ id, version: versions[id] })) },
        data: { status, version: { increment: 1 } },
      });
      if (updated.count !== ids.length) {
        throw Object.assign(new Error('O lote foi alterado por outro usuário. Atualize a lista e tente novamente.'), { status: 409 });
      }
    });
    res.json({ message: `${ids.length} registros atualizados para ${status}.` });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Falha ao atualizar o lote.' });
  }
}

async function updateRegistro(req, res) {
  const { id } = req.params;
  const { version, ...data } = req.body;
  try {
    const updated = await prisma.registros.update({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      const exists = await prisma.registros.findUnique({ where: { id }, select: { id: true } });
      return res.status(exists ? 409 : 404).json({ error: exists
        ? 'Registro alterado por outro usuário. Atualize a lista antes de salvar.' : 'Registro não encontrado.' });
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
    if (err.code === 'P2003') return res.status(409).json({ error: 'Registro vinculado a uma requisição. Preserve o histórico do material solicitado.' });
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
    if (err.code === 'P2003') return res.status(409).json({ error: 'O lote contém registros vinculados a requisições.' });
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
