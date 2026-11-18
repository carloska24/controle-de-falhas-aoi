const prisma = require('../config/prisma');
const { OMError } = require('./omService');
const { lockOMs, verifyActiveOM, registrarPlacaComFalha } = require('./inspecaoService');
const { randomUUID } = require('node:crypto');

async function createRegistros(registros, actor) {
  const oms = [...new Set(registros.map(registro => registro.om))].sort();
  await prisma.$transaction(async tx => {
    const byOM = await lockOMs(tx, oms);
    for (const registro of registros) {
      const om = byOM.get(registro.om);
      verifyActiveOM(om, registro.omVersion);
      if (om.rastreamentoInspecao && !registro.serial) {
        throw new OMError(400, 'Informe o serial da placa para lançar a falha nesta OM.');
      }
    }
    const createdat = new Date().toISOString();
    for (const registro of registros) {
      const { omVersion, ...data } = registro;
      await tx.registros.create({ data: {
        ...data, id: registro.id || 'REG-' + randomUUID(), createdat,
        status: 'pendente', operador: actor.name || actor.email,
      } });
      if (registro.serial) await registrarPlacaComFalha(tx, registro.om, registro.serial, actor.id);
    }
  }, { isolationLevel: 'ReadCommitted', timeout: 10000 });
  return registros.length;
}

module.exports = { createRegistros };
