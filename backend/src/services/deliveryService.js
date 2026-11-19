const prisma = require('../config/prisma');

function reject(status, message) {
  throw Object.assign(new Error(message), { status });
}

function parseDeliveryItems(raw) {
  const items = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(items) || !items.length) reject(409, 'Requisição sem itens válidos para conferência.');
  const groups = new Map();
  for (const item of items) {
    if (!item.pn || !Number.isSafeInteger(item.quantidade_requisitada) || item.quantidade_requisitada < 0
      || !Number.isSafeInteger(item.quantidade_entregue) || item.quantidade_entregue < 0
      || item.quantidade_entregue > item.quantidade_requisitada) {
      reject(409, 'A requisição contém quantidades inválidas. Solicite a revisão do cadastro.');
    }
    const group = groups.get(item.pn) || { requested: 0, delivered: 0 };
    group.requested += item.quantidade_requisitada;
    group.delivered += item.quantidade_entregue;
    groups.set(item.pn, group);
  }
  return { items, groups };
}

function deliveryStatus(items) {
  if (!items.some(item => item.quantidade_entregue > 0)) return 'pendente';
  return items.every(item => item.quantidade_entregue === item.quantidade_requisitada)
    ? 'entregue' : 'parcialmente_entregue';
}

async function confirmDelivery(id, body, actor, statusOnly = false) {
  return prisma.$transaction(async tx => {
    const current = await tx.requisicoes.findUnique({ where: { id } });
    if (!current) reject(404, 'Requisição não encontrada.');
    if (current.version !== body.version) reject(409, 'Outro terminal alterou a requisição. Atualize a lista e confira as quantidades novamente.');
    const { items, groups } = parseDeliveryItems(current.items);
    if (statusOnly) {
      if (body.status !== deliveryStatus(items)) reject(409, 'Confira e confirme as quantidades na ação de entregas para mudar este status.');
      return { ...current, items };
    }
    const submitted = new Map(body.items.map(item => [item.pn, item.quantidade_entregue]));
    if (submitted.size !== body.items.length || submitted.size !== groups.size
      || [...groups.keys()].some(pn => !submitted.has(pn))) {
      reject(400, 'Envie uma quantidade conferida para cada PN da requisição, sem duplicações.');
    }
    let reduced = false;
    for (const [pn, group] of groups) {
      const delivered = submitted.get(pn);
      if (!Number.isSafeInteger(delivered) || delivered < 0 || delivered > group.requested) {
        reject(400, 'A quantidade entregue deve estar entre zero e a quantidade requisitada.');
      }
      if (delivered < group.delivered) reduced = true;
    }
    if (reduced && !body.motivo?.trim()) reject(400, 'Informe o motivo da correção de quantidades já entregues.');
    const remaining = new Map([...groups].map(([pn, group]) => [pn, submitted.get(pn) - group.delivered]));
    const updated = items.map(item => {
      const delta = remaining.get(item.pn);
      const change = delta > 0 ? Math.min(delta, item.quantidade_requisitada - item.quantidade_entregue)
        : -Math.min(-delta, item.quantidade_entregue);
      remaining.set(item.pn, delta - change);
      return { ...item, quantidade_entregue: item.quantidade_entregue + change };
    });
    const status = deliveryStatus(updated);
    const saved = await tx.requisicoes.updateMany({
      where: { id, version: body.version },
      data: { items: JSON.stringify(updated), status, version: { increment: 1 } },
    });
    if (saved.count !== 1) reject(409, 'Outro terminal alterou a requisição. Atualize a lista e confira as quantidades novamente.');
    await tx.eventos_entrega.create({ data: {
      requisicaoId: id, version: body.version + 1, actorId: actor.id,
      actorName: actor.name || actor.email, motivo: body.motivo?.trim() || null,
      antes: { items, status: current.status }, depois: { items: updated, status },
    } });
    return { ...current, items: updated, status, version: body.version + 1 };
  });
}

module.exports = { confirmDelivery, parseDeliveryItems, deliveryStatus };
