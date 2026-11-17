const prisma = require('../config/prisma');

class OMError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function serializeOM(row, now = Date.now()) {
  const result = { ...row };
  for (const key of ['startTime', 'endTime', 'pausedTime', 'pauseStartedAt', 'elapsedAtPause']) {
    result[key] = row[key] == null ? null : Number(row[key]);
  }
  const end = result.status === 'finalizada' ? result.endTime
    : result.status === 'pausada' ? result.pauseStartedAt : now;
  result.elapsed = Math.max(0, (end ?? now) - result.startTime - (result.pausedTime || 0));
  return result;
}

async function transition(omNumber, action, actor, qtdlote) {
  try {
    return await prisma.$transaction(async tx => {
      const current = await tx.ordens_manufatura.findUnique({ where: { omNumber } });
      const now = BigInt(Date.now());
      let saved;
      if (action === 'start') {
        if (current) throw new OMError(409, current.status === 'finalizada'
          ? 'OM finalizada não pode ser reiniciada. Solicite um fluxo de reabertura.'
          : 'Já existe uma OM aberta com esse número.');
        saved = await tx.ordens_manufatura.create({
          data: { omNumber, status: 'em_andamento', startTime: now, qtdlote: qtdlote ?? null },
        });
      } else {
        if (!current) throw new OMError(404, 'OM não encontrada.');
        const expected = { pause: ['em_andamento'], resume: ['pausada'], finish: ['em_andamento', 'pausada'] }[action];
        if (!expected || !expected.includes(current.status)) throw new OMError(409, 'A OM mudou de estado. Atualize a tela antes de continuar.');
        const data = { version: { increment: 1 } };
        if (action === 'pause') Object.assign(data, {
          status: 'pausada', pauseStartedAt: now,
          elapsedAtPause: now - current.startTime - current.pausedTime,
        });
        if (action === 'resume') Object.assign(data, {
          status: 'em_andamento', pausedTime: current.pausedTime + now - current.pauseStartedAt,
          pauseStartedAt: null, elapsedAtPause: null,
        });
        if (action === 'finish') Object.assign(data, {
          status: 'finalizada', endTime: now, pauseStartedAt: null, elapsedAtPause: null,
          pausedTime: current.pausedTime + (current.status === 'pausada' ? now - current.pauseStartedAt : 0n),
        });
        const update = await tx.ordens_manufatura.updateMany({
          where: { omNumber, version: current.version, status: current.status }, data,
        });
        if (update.count !== 1) throw new OMError(409, 'Outro terminal alterou esta OM. Atualize a tela.');
        saved = await tx.ordens_manufatura.findUnique({ where: { omNumber } });
      }
      const serialized = serializeOM(saved);
      await tx.eventos_om.create({ data: {
        omNumber, action, actorId: actor.id, actorName: actor.name || actor.email,
        snapshot: { before: current ? serializeOM(current) : null, after: serialized },
      } });
      return serialized;
    });
  } catch (error) {
    if (error.code === 'P2002' || error.code === 'P2034') {
      throw new OMError(409, 'Outro terminal alterou esta OM. Atualize a tela.');
    }
    throw error;
  }
}

module.exports = { OMError, serializeOM, transition };
