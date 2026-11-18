const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { OMError } = require('./omService');
const { randomUUID } = require('node:crypto');

async function createRegistros(registros, actor) {
  const oms = [...new Set(registros.map(registro => registro.om))].sort();
  await prisma.$transaction(async tx => {
    // FOR UPDATE conflita com o UPDATE de pausa/finalização da mesma OM.
    // ReadCommitted lê o estado confirmado depois de esperar pelo lock.
    const locked = await tx.$queryRaw(Prisma.sql`
      SELECT "omNumber", status::text AS status, version
      FROM ordens_manufatura
      WHERE "omNumber" IN (${Prisma.join(oms)})
      ORDER BY "omNumber" FOR UPDATE
    `);
    const byOM = new Map(locked.map(om => [om.omNumber, om]));
    for (const registro of registros) {
      const om = byOM.get(registro.om);
      if (!om) throw new OMError(404, 'OM não cadastrada. Inicie a OM antes de lançar falhas.');
      if (om.status !== 'em_andamento') throw new OMError(409, 'A OM está pausada ou finalizada. Atualize o estado antes de continuar.');
      if (om.version !== registro.omVersion) throw new OMError(409, 'A OM mudou de versão. Atualize o estado e confira o lançamento antes de tentar novamente.');
    }
    const createdat = new Date().toISOString();
    for (const registro of registros) {
      const { omVersion, ...data } = registro;
      await tx.registros.create({ data: {
        ...data, id: registro.id || 'REG-' + randomUUID(), createdat,
        status: 'pendente', operador: actor.name || actor.email,
      } });
    }
  }, { isolationLevel: 'ReadCommitted', timeout: 10000 });
  return registros.length;
}

module.exports = { createRegistros };
