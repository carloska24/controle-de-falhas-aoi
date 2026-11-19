const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { OMError } = require('./omService');

async function lockOMs(tx, numbers) {
  // A gravação de placas e falhas disputa o mesmo lock que pausa e finalização.
  const locked = await tx.$queryRaw(Prisma.sql`
    SELECT "omNumber", status::text AS status, version, "rastreamentoInspecao"
    FROM ordens_manufatura
    WHERE "omNumber" IN (${Prisma.join(numbers)})
    ORDER BY "omNumber" FOR UPDATE
  `);
  return new Map(locked.map(om => [om.omNumber, om]));
}

function verifyActiveOM(om, version) {
  if (!om) throw new OMError(404, 'OM não cadastrada. Inicie a OM antes de registrar a placa.');
  if (om.status !== 'em_andamento') throw new OMError(409, 'A OM está pausada ou finalizada. Atualize o estado antes de continuar.');
  if (om.version !== version) throw new OMError(409, 'A OM mudou de versão. Atualize o estado e confira o lançamento antes de tentar novamente.');
}

function registrarPlacaComFalha(tx, omNumber, serial, actorId, registradaEm) {
  return tx.placas_inspecionadas.upsert({
    where: { omNumber_serial: { omNumber, serial } },
    create: { omNumber, serial, temFalha: true, registradaPor: actorId, ...(registradaEm ? { registradaEm } : {}) },
    update: { temFalha: true },
  });
}

async function registrarPlacaSemFalha(omNumber, { serial, omVersion }, actor) {
  return prisma.$transaction(async tx => {
    const oms = await lockOMs(tx, [omNumber]);
    verifyActiveOM(oms.get(omNumber), omVersion);
    const where = { omNumber_serial: { omNumber, serial } };
    const placa = await tx.placas_inspecionadas.findUnique({ where });
    if (placa) return { jaRegistrada: true, temFalha: placa.temFalha };

    // Uma OM legada pode ter falhas anteriores à migração para este serial.
    const falhaLegada = !oms.get(omNumber).rastreamentoInspecao && await tx.registros.findFirst({
      where: { om: omNumber, serial },
      select: { id: true },
    });
    if (falhaLegada) throw new OMError(409, 'Já existe uma falha anterior para esta placa na OM.');
    await tx.placas_inspecionadas.create({
      data: { omNumber, serial, temFalha: false, registradaPor: actor.id },
    });
    return { jaRegistrada: false, temFalha: false };
  }, { isolationLevel: 'ReadCommitted' });
}

async function resumirInspecoes({ omNumber, start, end }) {
  const grupos = await prisma.placas_inspecionadas.groupBy({
    by: ['temFalha'],
    where: {
      omNumber,
      NOT: { omNumber: { startsWith: 'DEMO-' } },
      ordem: { rastreamentoInspecao: true, status: 'finalizada' },
      registradaEm: { gte: start, lt: end },
    },
    _count: { _all: true },
  });
  const approvedBoards = grupos.find(grupo => !grupo.temFalha)?._count._all ?? 0;
  const withFindings = grupos.find(grupo => grupo.temFalha)?._count._all ?? 0;
  return { inspectedBoards: approvedBoards + withFindings, approvedBoards };
}

module.exports = { lockOMs, verifyActiveOM, registrarPlacaComFalha, registrarPlacaSemFalha, resumirInspecoes };
