const prisma = require('../config/prisma');

// Estrutura em memória original preservada (mantendo a lógica do timer no nodejs runtime)
const oms = {};

async function salvarOMPausada(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'pausada') return;

  const regQtd = await prisma.registros.findFirst({
    where: { om: omNumber },
    select: { qtdlote: true },
  });

  const qtdloteValue = regQtd ? regQtd.qtdlote : null;
  om.qtdlote = qtdloteValue;

  await prisma.oms_pausadas.upsert({
    where: { omNumber: om.omNumber },
    update: {
      startTime: om.startTime,
      pausedTime: om.pausedTime || 0,
      pauseStartedAt: om.pauseStartedAt || null,
      elapsedAtPause: om.elapsedAtPause || null,
      qtdlote: qtdloteValue,
    },
    create: {
      omNumber: om.omNumber,
      startTime: om.startTime,
      pausedTime: om.pausedTime || 0,
      pauseStartedAt: om.pauseStartedAt || null,
      elapsedAtPause: om.elapsedAtPause || null,
      qtdlote: qtdloteValue,
    },
  });
}

async function removerOMPausada(omNumber) {
  try {
    await prisma.oms_pausadas.deleteMany({ where: { omNumber } });
  } catch (error) {
    console.error('[OM] Erro ao remover OM pausada:', error);
  }
}

async function salvarOMAtiva(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'em_andamento') return;
  try {
    await prisma.oms_ativas.upsert({
      where: { omNumber: om.omNumber },
      update: {
        startTime: om.startTime,
        pausedTime: om.pausedTime || 0,
        qtdlote: om.qtdlote || null,
      },
      create: {
        omNumber: om.omNumber,
        startTime: om.startTime,
        pausedTime: om.pausedTime || 0,
        qtdlote: om.qtdlote || null,
      },
    });
  } catch (error) {
    console.error('[OM] Erro ao salvar OM ativa:', error);
  }
}

async function removerOMAtiva(omNumber) {
  try {
    await prisma.oms_ativas.deleteMany({ where: { omNumber } });
  } catch (error) {
    console.error('[OM] Erro ao remover OM ativa:', error);
  }
}

async function salvarOMFinalizada(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'finalizada') return;

  const regQtd = await prisma.registros.findFirst({
    where: { om: omNumber },
    select: { qtdlote: true },
  });

  const qtdloteValue = regQtd ? regQtd.qtdlote : null;
  om.qtdlote = qtdloteValue;

  await prisma.oms_finalizadas.upsert({
    where: { omNumber: om.omNumber },
    update: {
      startTime: om.startTime,
      endTime: om.endTime,
      pausedTime: om.pausedTime || 0,
      qtdlote: qtdloteValue,
    },
    create: {
      omNumber: om.omNumber,
      startTime: om.startTime,
      endTime: om.endTime,
      pausedTime: om.pausedTime || 0,
      qtdlote: qtdloteValue,
    },
  });
}

// Convert BigInt to Number on load (since JS precision limit is fine for timestamps)
function toNum(val) {
  return val ? Number(val) : null;
}

async function carregarOMsPausadas() {
  try {
    const pausedOMs = await prisma.oms_pausadas.findMany();
    pausedOMs.forEach(row => {
      oms[row.omNumber] = {
        omNumber: row.omNumber,
        startTime: toNum(row.startTime),
        pausedTime: toNum(row.pausedTime) || 0,
        status: 'pausada',
        pauseStartedAt: toNum(row.pauseStartedAt),
        elapsedAtPause: toNum(row.elapsedAtPause),
        endTime: null,
        qtdlote: row.qtdlote || null,
      };
    });
    if (pausedOMs.length > 0)
      console.log(`[OM] Carregadas ${pausedOMs.length} OMs pausadas do banco`);

    const activeOMs = await prisma.oms_ativas.findMany();
    activeOMs.forEach(row => {
      if (!oms[row.omNumber]) {
        oms[row.omNumber] = {
          omNumber: row.omNumber,
          startTime: toNum(row.startTime),
          pausedTime: toNum(row.pausedTime) || 0,
          status: 'em_andamento',
          pauseStartedAt: null,
          elapsedAtPause: null,
          endTime: null,
          qtdlote: row.qtdlote || null,
        };
      }
    });
    if (activeOMs.length > 0)
      console.log(`[OM] Carregadas ${activeOMs.length} OMs ativas do banco`);
  } catch (error) {
    console.error('[OM] Erro ao carregar OMs:', error);
  }
}

function getElapsed(om) {
  if (!om) return 0;
  if (om.status === 'finalizada') {
    return om.endTime - om.startTime - (om.pausedTime || 0);
  }
  if (om.status === 'pausada') {
    if (typeof om.elapsedAtPause === 'number') return om.elapsedAtPause;
    if (om.pauseStartedAt && om.startTime)
      return om.pauseStartedAt - om.startTime - (om.pausedTime || 0);
    return 0;
  }
  let now = Date.now();
  let paused = om.pausedTime || 0;
  return now - om.startTime - paused;
}

async function startOM(req, res) {
  const { omNumber, qtdLote } = req.body;
  if (!omNumber) return res.status(400).json({ error: 'omNumber obrigatório' });
  if (oms[omNumber] && oms[omNumber].status !== 'finalizada') {
    return res.status(400).json({ error: 'Já existe OM em andamento com esse número' });
  }
  oms[omNumber] = {
    omNumber,
    startTime: Date.now(),
    pausedTime: 0,
    status: 'em_andamento',
    endTime: null,
    pauseStartedAt: null,
    qtdlote: qtdLote || null,
  };
  await salvarOMAtiva(omNumber);
  res.json({ ...oms[omNumber], elapsed: 0 });
}

async function getOM(req, res) {
  const { omNumber } = req.params;
  const om = oms[omNumber];
  if (om) {
    let elapsed = getElapsed(om);
    return res.json({ ...om, elapsed });
  }
  try {
    const omData = await prisma.oms_finalizadas.findUnique({ where: { omNumber } });
    if (!omData) return res.status(404).json({ error: 'OM não encontrada' });

    const startTime = toNum(omData.startTime);
    const endTime = toNum(omData.endTime);
    const pausedTime = toNum(omData.pausedTime);

    const elapsed = endTime - startTime - (pausedTime || 0);
    res.json({
      omNumber: omData.omNumber,
      status: 'finalizada',
      startTime,
      pausedTime,
      endTime,
      elapsed,
      qtdlote: omData.qtdlote || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function pauseOM(req, res) {
  const { omNumber } = req.body;
  const om = oms[omNumber];
  if (!om || om.status !== 'em_andamento') {
    return res.status(400).json({ error: 'OM não encontrada ou não está em andamento' });
  }
  if (!om.pausedTime) om.pausedTime = 0;
  if (!om.pauseStartedAt) {
    om.pauseStartedAt = Date.now();
    om.status = 'pausada';
    om.elapsedAtPause = Date.now() - om.startTime - om.pausedTime;
  }
  const elapsed = getElapsed(om);
  await removerOMAtiva(omNumber);
  await salvarOMPausada(omNumber);
  res.json({ ...om, elapsed });
}

async function resumeOM(req, res) {
  const { omNumber } = req.body;
  const om = oms[omNumber];
  if (!om || om.status !== 'pausada') {
    return res.status(400).json({ error: 'OM não encontrada ou não está pausada' });
  }
  if (om.pauseStartedAt) {
    om.pausedTime += Date.now() - om.pauseStartedAt;
  }
  om.status = 'em_andamento';
  om.pauseStartedAt = null;
  om.elapsedAtPause = null;
  await removerOMPausada(omNumber);
  await salvarOMAtiva(omNumber);
  res.json({ ...om, elapsed: getElapsed(om) });
}

async function finishOM(req, res) {
  const { omNumber } = req.body;
  const om = oms[omNumber];
  if (!om || (om.status !== 'em_andamento' && om.status !== 'pausada')) {
    return res.status(400).json({ error: 'OM não encontrada ou já finalizada' });
  }
  if (om.status === 'pausada' && om.pauseStartedAt) {
    om.pausedTime += Date.now() - om.pauseStartedAt;
    om.pauseStartedAt = null;
    await removerOMPausada(omNumber);
  }
  await removerOMAtiva(omNumber);
  om.status = 'finalizada';
  om.endTime = Date.now();
  await salvarOMFinalizada(omNumber);
  res.json({ ...om, elapsed: getElapsed(om) });
}

async function getOMTime(req, res) {
  const { omNumber } = req.params;
  try {
    const omData = await prisma.oms_finalizadas.findUnique({ where: { omNumber } });
    if (!omData)
      return res.status(404).json({ error: 'Dados de tempo para esta OM não encontrados.' });

    const startTime = toNum(omData.startTime);
    const endTime = toNum(omData.endTime);
    const pausedTime = toNum(omData.pausedTime);

    const elapsed = endTime - startTime - (pausedTime || 0);
    res.json({
      elapsed: elapsed,
      startTime: startTime,
      endTime: endTime,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getRelatorioFalhas(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;

    let where = {};
    if (om) where.om = om;
    if (status) where.status = status;
    if (dataIni || dataFim) {
      where.createdat = {};
      if (dataIni) where.createdat.gte = dataIni;
      if (dataFim) where.createdat.lte = dataFim;
    }

    const pageNum = Math.max(1, parseInt(page, 10)) || 1;
    const limitNum = Math.max(1, Math.min(parseInt(limit, 10), 200)) || 50;
    const offset = (pageNum - 1) * limitNum;

    const [total, registros] = await Promise.all([
      prisma.registros.count({ where }),
      prisma.registros.findMany({
        where,
        orderBy: [{ om: 'asc' }, { createdat: 'asc' }],
        skip: offset,
        take: limitNum,
      }),
    ]);

    const porOM = {};
    for (const r of registros) {
      if (!porOM[r.om]) porOM[r.om] = { om: r.om, qtdlote: r.qtdlote, falhas: [] };
      porOM[r.om].falhas.push({
        pn: r.pn,
        serial: r.serial,
        designador: r.designador,
        tipodefeito: r.tipodefeito ?? '',
        descricao: r.descricao,
        createdat: r.createdat ?? '',
        operador: r.operador,
        status: r.status,
        obs: r.obs,
        prioridade: r.prioridade,
      });
    }
    res.json({
      data: Object.values(porOM),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getRelatorioOMs(req, res) {
  try {
    const finalizadas = await prisma.oms_finalizadas.findMany({
      orderBy: { endTime: 'desc' },
    });

    const relatorio = [];
    for (const om of finalizadas) {
      // Fetch only tipodefeitos for this OM
      const registros = await prisma.registros.findMany({
        where: { om: om.omNumber },
        select: { tipodefeito: true },
      });

      const startTime = toNum(om.startTime);
      const endTime = toNum(om.endTime);
      const pausedTime = toNum(om.pausedTime) || 0;

      relatorio.push({
        omNumber: om.omNumber,
        qtdlote: om.qtdlote || '-',
        tempo:
          endTime && startTime ? ((endTime - startTime - pausedTime) / 1000).toFixed(0) + 's' : '-',
        defeitos: registros.map(r => r.tipodefeito).filter(Boolean),
      });
    }
    res.json(relatorio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function listAtivas(req, res) {
  try {
    const ativas = Object.values(oms)
      .filter(om => om.status === 'em_andamento')
      .map(om => ({
        omNumber: om.omNumber,
        qtdlote: om.qtdlote || null,
        startTime: om.startTime,
        pausedTime: om.pausedTime,
        elapsed: getElapsed(om),
      }));
    res.json(ativas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function listPausadas(req, res) {
  try {
    const pausadas = Object.values(oms)
      .filter(om => om.status === 'pausada')
      .map(om => ({
        omNumber: om.omNumber,
        qtdlote: om.qtdlote || null,
        startTime: om.startTime,
        pausedTime: om.pausedTime,
        elapsedAtPause: om.elapsedAtPause,
      }));
    res.json(pausadas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function listFinalizadas(req, res) {
  try {
    const finalizadas = await prisma.oms_finalizadas.findMany({
      select: { omNumber: true, qtdlote: true },
      orderBy: { endTime: 'desc' },
    });
    res.json(finalizadas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  carregarOMsPausadas,
  startOM,
  getOM,
  pauseOM,
  resumeOM,
  finishOM,
  getOMTime,
  getRelatorioFalhas,
  getRelatorioOMs,
  listAtivas,
  listPausadas,
  listFinalizadas,
};
