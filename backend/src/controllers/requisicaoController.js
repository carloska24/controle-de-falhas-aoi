const prisma = require('../config/prisma');
const { getPagination } = require('../utils/pagination');

function reject(status, message, details) {
  throw Object.assign(new Error(message), { status, details });
}

async function listRequisicoes(req, res) {
  try {
    const { om, status, dataIni, dataFim } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    if (om) where.om = om;
    if (status) where.status = status;
    if (dataIni || dataFim) {
      where.created_at = {};
      if (dataIni) where.created_at.gte = dataIni;
      if (dataFim) where.created_at.lte = dataFim;
    }
    const [total, rows] = await prisma.$transaction(async tx => [
      await tx.requisicoes.count({ where }),
      await tx.requisicoes.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip, take: limit }),
    ], { isolationLevel: 'RepeatableRead' });
    const data = rows.map(row => ({ ...row, items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items }));
    res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Falha ao consultar requisições.' });
  }
}

async function createRequisicao(req, res) {
  const { registroIds } = req.body;
  try {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await prisma.$transaction(async tx => {
          const registros = await tx.registros.findMany({ where: { id: { in: registroIds } } });
          if (registros.length !== registroIds.length) reject(404, 'Um ou mais registros não foram encontrados.');
          const invalidRecords = registros.flatMap(registro => {
            const reasons = [];
            const tipo = (registro.tipodefeito || '').trim();
            if (!['Ausente', 'Danificado', 'Incorreto'].includes(tipo)) {
              reasons.push(tipo === 'Possível Incorreto'
                ? 'Defeito Possível Incorreto aguarda conferência SMT.'
                : 'Defeito não elegível: use Ausente, Danificado ou Incorreto.');
            }
            if (!registro.pn?.trim()) reasons.push('PN não informado.');
            return reasons.length ? [{ id: registro.id, reason: reasons.join(' ') }] : [];
          });
          if (invalidRecords.length) {
            reject(400, 'A seleção contém registros que não podem gerar requisição. Revise os itens indicados.', { invalidRecords });
          }
          const links = await tx.requisicao_registros.findMany({ where: { registro_id: { in: registroIds } } });
          const linkedIds = new Set(links.map(link => link.registro_id));
          const requisicaoIds = new Set(links.map(link => link.requisicao_id));
          const groups = new Map();
          for (const registro of registros) {
            if (linkedIds.has(registro.id)) continue;
            if (!groups.has(registro.om)) groups.set(registro.om, []);
            groups.get(registro.om).push(registro);
          }
          for (const [om, records] of groups) {
            const items = new Map();
            for (const record of records) {
              const pn = record.pn.trim();
              if (!items.has(pn)) items.set(pn, {
                pn, descricao: record.descricao,
                quantidade_requisitada: 0, quantidade_entregue: 0,
              });
              items.get(pn).quantidade_requisitada++;
            }
            const requisicao = await tx.requisicoes.create({ data: {
              om, items: JSON.stringify([...items.values()]),
              created_at: new Date().toISOString(),
              created_by: req.user.email || `user:${req.user.id}`,
            } });
            await tx.requisicao_registros.createMany({ data: records.map(record => ({
              registro_id: record.id, requisicao_id: requisicao.id,
            })) });
            requisicaoIds.add(requisicao.id);
          }
          return {
            requisicaoIds: [...requisicaoIds].sort((a, b) => a - b),
            summary: {
              selectedRecords: registroIds.length,
              createdRecords: registros.length - linkedIds.size,
              existingRecords: linkedIds.size,
              createdRequests: groups.size,
            },
          };
        }, { isolationLevel: 'Serializable' });
        break;
      } catch (error) {
        if (!['P2034', 'P2002'].includes(error.code) || attempt === 2) throw error;
      }
    }
    const { summary } = result;
    res.status(summary.createdRequests ? 201 : 200).json({
      message: summary.createdRequests
        ? `Requisições criadas: ${summary.createdRequests}. Registros incluídos: ${summary.createdRecords}. Registros já vinculados: ${summary.existingRecords}.`
        : `Nenhuma requisição nova. Registros já vinculados: ${summary.existingRecords}.`,
      requisicaoIds: result.requisicaoIds,
      summary,
    });
  } catch (error) {
    const conflict = ['P2034', 'P2002'].includes(error.code);
    res.status(error.status || (conflict ? 409 : 500)).json({
      error: error.status ? error.message : conflict ? 'Solicitação concorrente. Atualize a lista e tente novamente.' : 'Falha ao criar requisição.',
      ...(error.status === 400 && error.details ? { details: error.details } : {}),
    });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await prisma.requisicoes.update({ where: { id: Number(id) }, data: { status } });
    res.json({ message: `Status atualizado para ${status}` });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Requisição não encontrada.' : 'Falha ao atualizar status.' });
  }
}

async function updateItems(req, res) {
  const { id } = req.params;
  const { items } = req.body;
  try {
    let status = 'pendente';
    if (items.every(item => item.quantidade_entregue >= item.quantidade_requisitada)) status = 'entregue';
    else if (items.some(item => item.quantidade_entregue > 0)) status = 'parcialmente_entregue';
    await prisma.requisicoes.update({ where: { id: Number(id) }, data: { items: JSON.stringify(items), status } });
    res.json({ message: 'Itens atualizados com sucesso.' });
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Requisição não encontrada.' : 'Falha ao atualizar itens.' });
  }
}

async function deleteRequisicao(req, res) {
  try {
    await prisma.requisicoes.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(error.code === 'P2025' ? 404 : 500).json({ error: error.code === 'P2025' ? 'Requisição não encontrada.' : 'Falha ao excluir requisição.' });
  }
}

module.exports = { listRequisicoes, createRequisicao, updateStatus, updateItems, deleteRequisicao };
