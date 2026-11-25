const prisma = require('../config/prisma');
const { OMError } = require('./omService');
const { lockOMs, verifyActiveOM, registrarPlacaComFalha } = require('./inspecaoService');
const { randomUUID } = require('node:crypto');
const { isDemoEnabled } = require('../config/demo');

async function createRegistros(registros, actor, options = {}) {
  // Internal-only history simulation; the normal HTTP endpoint never passes options.
  const demoDates = options.demoCreatedAt;
  if (demoDates !== undefined) {
    if (actor.role !== 'admin' || !isDemoEnabled() || registros.some(row => !row.om.startsWith('DEMO-'))) {
      throw new OMError(403, 'Datas simuladas são permitidas somente para demonstração habilitada e administrador autenticado.');
    }
    const now = Date.now();
    if (!(demoDates instanceof Map) || demoDates.size !== registros.length || registros.some(row => {
      const date = demoDates.get(row.id);
      const time = typeof date === 'string' ? Date.parse(date) : NaN;
      return !Number.isFinite(time) || time > now || time < now - 30 * 86400000;
    })) throw new OMError(400, 'As datas de demonstração devem ser válidas e estar nos últimos 30 dias.');
  }
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
        ...data, id: registro.id || 'REG-' + randomUUID(), createdat: demoDates?.get(registro.id) || createdat,
        status: 'pendente', operador: actor.name || actor.email,
      } });
      if (registro.serial) await registrarPlacaComFalha(tx, registro.om, registro.serial, actor.id,
        demoDates ? new Date(demoDates.get(registro.id)) : undefined);
    }
  }, { isolationLevel: 'ReadCommitted', timeout: 10000 });
  return registros.length;
}

module.exports = { createRegistros };
