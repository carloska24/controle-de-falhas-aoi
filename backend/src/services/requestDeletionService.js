const prisma = require('../config/prisma');

function reject(status, message) { throw Object.assign(new Error(message), { status }); }

async function deleteRequest(id, { version, motivo }, actor) {
  if (!['admin', 'almoxarifado'].includes(actor.role)) reject(403, 'Perfil sem permissão para excluir requisições.');
  return prisma.$transaction(async tx => {
    const current = await tx.requisicoes.findUnique({ where: { id } });
    if (!current) reject(404, 'Requisição não encontrada. Atualize a lista.');
    if (current.version !== version) reject(409, 'A requisição mudou. Atualize a lista e revise a exclusão.');
    const history = await tx.eventos_entrega.findMany({ where: { requisicaoId: id }, orderBy: { version: 'asc' } });
    let items;
    try { items = typeof current.items === 'string' ? JSON.parse(current.items) : current.items; } catch { items = null; }
    const hasDelivery = history.length > 0 || current.status !== 'pendente' || !Array.isArray(items)
      || items.some(item => Number(item.quantidade_entregue || 0) > 0);
    if (hasDelivery && actor.role !== 'admin') reject(403, 'Somente o administrador pode excluir uma requisição com entregas ou histórico.');
    // The same parent-row lock used by delivery updates prevents a stale deletion.
    const locked = await tx.requisicoes.updateMany({ where: { id, version }, data: { version: { increment: 1 } } });
    if (locked.count !== 1) reject(409, 'A requisição mudou. Atualize a lista e revise a exclusão.');
    const links = await tx.requisicao_registros.findMany({ where: { requisicao_id: id } });
    // Independent archive has no FK to the deleted request. Failure rolls back everything.
    await tx.exclusoes_requisicoes.create({ data: {
      requisicaoId: id, actorId: actor.id, actorName: actor.name || actor.email,
      motivo, snapshot: JSON.parse(JSON.stringify({ requisicao: current, entregas: history, vinculos: links })),
    } });
    await tx.eventos_entrega.deleteMany({ where: { requisicaoId: id } });
    await tx.requisicao_registros.deleteMany({ where: { requisicao_id: id } });
    await tx.requisicoes.delete({ where: { id } });
  }, { isolationLevel: 'ReadCommitted' });
}

module.exports = { deleteRequest };
