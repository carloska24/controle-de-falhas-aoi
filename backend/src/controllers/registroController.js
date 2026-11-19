const prisma = require('../config/prisma');
const { createRegistros } = require('../services/registroCreationService');
const { OMError } = require('../services/omService');
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
  try {
    const count = await createRegistros(req.body, req.user);
    res.status(201).json({ message: `${count} registros criados com sucesso.` });
  } catch (err) {
    if (err instanceof OMError) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Um dos registros já existe. Atualize a lista antes de tentar novamente.' });
    if (['P2034', 'P2028'].includes(err.code)) return res.status(409).json({ error: 'A OM está em processamento por outra operação. Atualize o estado e tente novamente.' });
    console.error('[Registros] Falha ao gravar lote:', err.code || 'unexpected_error');
    res.status(500).json({ error: 'Falha ao registrar o lote. Atualize a lista antes de tentar novamente.' });
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
  const { version } = req.body;
  try {
    await prisma.registros.delete({
      where: { id, version },
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2003') return res.status(409).json({ error: 'Registro vinculado a uma requisição. Exclua primeiro a requisição no Almoxarifado; se houver entregas ou histórico, solicite ao administrador.' });
    if (err.code === 'P2025') {
      return res.status(409).json({ error: 'Registro alterado ou removido. Atualize a lista antes de revisar a exclusão novamente.' });
    }
    console.error('Erro ao excluir registro:', err.code || 'unexpected_error');
    res.status(500).json({ error: 'Não foi possível confirmar a exclusão. Atualize a lista antes de tentar novamente.' });
  }
}

async function deleteRegistrosBatch(req, res) {
  const { ids, versions } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de IDs inválida.' });
  }

  try {
    await prisma.$transaction(async tx => {
      const deleted = await tx.registros.deleteMany({
        where: { OR: ids.map(id => ({ id, version: versions[id] })) },
      });
      if (deleted.count !== ids.length) throw Object.assign(new Error('Um ou mais registros foram alterados ou removidos. Atualize a lista e revise a exclusão novamente.'), { status: 409 });
    });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2003') return res.status(409).json({ error: 'O lote contém registros vinculados a requisições. Exclua primeiro as requisições no Almoxarifado; se houver entregas ou histórico, solicite ao administrador.' });
    if (err.status === 409) return res.status(409).json({ error: err.message });
    console.error('Erro ao excluir registros em lote:', err.code || 'unexpected_error');
    res.status(500).json({ error: 'Não foi possível confirmar a exclusão. Atualize a lista antes de tentar novamente.' });
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
