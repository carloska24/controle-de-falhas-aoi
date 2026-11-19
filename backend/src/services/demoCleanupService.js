// DEMO- is the reserved namespace already excluded from operational reports.
// Caller owns the transaction so cleanup and session revocation commit together.
async function clearDemoData(tx) {
  const demo = { startsWith: 'DEMO-' };
  const mixedLink = await tx.requisicao_registros.findFirst({ where: { OR: [
    { registro: { om: demo }, requisicao: { om: { not: demo } } },
    { registro: { om: { not: demo } }, requisicao: { om: demo } },
  ] } });
  if (mixedLink) throw new Error('Demo data is linked to operational data; cleanup refused');

  const deleted = {};
  deleted.entregas = (await tx.eventos_entrega.deleteMany({ where: { requisicao: { om: demo } } })).count;
  deleted.vinculos = (await tx.requisicao_registros.deleteMany({ where: { requisicao: { om: demo } } })).count;
  deleted.exclusoes = (await tx.exclusoes_requisicoes.deleteMany({ where: {
    snapshot: { path: ['requisicao', 'om'], string_starts_with: 'DEMO-' },
  } })).count;
  deleted.requisicoes = (await tx.requisicoes.deleteMany({ where: { om: demo } })).count;
  deleted.falhas = (await tx.registros.deleteMany({ where: { om: demo } })).count;
  deleted.inspecoes = (await tx.placas_inspecionadas.deleteMany({ where: { omNumber: demo } })).count;
  deleted.eventosOM = (await tx.eventos_om.deleteMany({ where: { omNumber: demo } })).count;
  for (const table of ['oms_ativas', 'oms_pausadas', 'oms_finalizadas', 'ordens_manufatura']) {
    deleted[table] = (await tx[table].deleteMany({ where: { omNumber: demo } })).count;
  }
  return deleted;
}

module.exports = { clearDemoData };
