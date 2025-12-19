const database = require('../config/database');

// Estrutura em memória
const oms = {};

// Funções auxiliares de persistência
async function salvarOMPausada(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'pausada') return;
  const qtdRes = await database.dbGet('SELECT qtdlote FROM registros WHERE om = ? LIMIT 1', [
    omNumber,
  ]);
  const qtdloteValue = qtdRes ? qtdRes.qtdlote : null;
  om.qtdlote = qtdloteValue;
  await database.dbRun(
    `INSERT OR REPLACE INTO oms_pausadas (omNumber, startTime, pausedTime, pauseStartedAt, elapsedAtPause, qtdlote) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      om.omNumber,
      om.startTime,
      om.pausedTime || 0,
      om.pauseStartedAt || null,
      om.elapsedAtPause || null,
      qtdloteValue,
    ]
  );
}

async function removerOMPausada(omNumber) {
  try {
    await database.dbRun('DELETE FROM oms_pausadas WHERE omNumber = ?', [omNumber]);
  } catch (error) {
    console.error('[OM] Erro ao remover OM pausada:', error);
  }
}

// Funções para OMs ativas (em andamento)
async function salvarOMAtiva(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'em_andamento') return;
  try {
    await database.dbRun(
      `INSERT OR REPLACE INTO oms_ativas (omNumber, startTime, pausedTime, qtdlote) VALUES (?, ?, ?, ?)`,
      [om.omNumber, om.startTime, om.pausedTime || 0, om.qtdlote || null]
    );
  } catch (error) {
    console.error('[OM] Erro ao salvar OM ativa:', error);
  }
}

async function removerOMAtiva(omNumber) {
  try {
    await database.dbRun('DELETE FROM oms_ativas WHERE omNumber = ?', [omNumber]);
  } catch (error) {
    console.error('[OM] Erro ao remover OM ativa:', error);
  }
}

async function salvarOMFinalizada(omNumber) {
  const om = oms[omNumber];
  if (!om || om.status !== 'finalizada') return;
  const qtdRes = await database.dbGet('SELECT qtdlote FROM registros WHERE om = ? LIMIT 1', [
    omNumber,
  ]);
  const qtdloteValue = qtdRes ? qtdRes.qtdlote : null;
  om.qtdlote = qtdloteValue;
  await database.dbRun(
    `INSERT OR REPLACE INTO oms_finalizadas (omNumber, startTime, endTime, pausedTime, qtdlote) VALUES (?, ?, ?, ?, ?)`,
    [om.omNumber, om.startTime, om.endTime, om.pausedTime || 0, qtdloteValue]
  );
}

async function carregarOMsPausadas() {
  try {
    // Carregar OMs pausadas
    const pausedOMs = await database.dbAll('SELECT * FROM oms_pausadas');
    pausedOMs.forEach(row => {
      oms[row.omNumber] = {
        omNumber: row.omNumber,
        startTime: row.startTime,
        pausedTime: row.pausedTime || 0,
        status: 'pausada',
        pauseStartedAt: row.pauseStartedAt,
        elapsedAtPause: row.elapsedAtPause,
        endTime: null,
        qtdlote: row.qtdlote || null,
      };
    });
    if (pausedOMs.length > 0)
      console.log(`[OM] Carregadas ${pausedOMs.length} OMs pausadas do banco`);

    // Carregar OMs ativas (em andamento)
    const activeOMs = await database.dbAll('SELECT * FROM oms_ativas');
    activeOMs.forEach(row => {
      // Only add if not already in memory (avoid overwriting)
      if (!oms[row.omNumber]) {
        oms[row.omNumber] = {
          omNumber: row.omNumber,
          startTime: row.startTime,
          pausedTime: row.pausedTime || 0,
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

// Handlers
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
  // Persistir OM ativa imediatamente
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
    const omData = await database.dbGet('SELECT * FROM oms_finalizadas WHERE omNumber = ?', [
      omNumber,
    ]);
    if (!omData) return res.status(404).json({ error: 'OM não encontrada' });

    const elapsed = omData.endTime - omData.startTime - (omData.pausedTime || 0);
    res.json({
      omNumber: omData.omNumber,
      status: 'finalizada',
      startTime: omData.startTime,
      pausedTime: omData.pausedTime,
      endTime: omData.endTime,
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
  // Remover de oms_ativas e salvar em oms_pausadas
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
  // Remover de oms_pausadas e salvar em oms_ativas
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
  // Remover de oms_ativas se estava em andamento
  await removerOMAtiva(omNumber);
  om.status = 'finalizada';
  om.endTime = Date.now();
  await salvarOMFinalizada(omNumber);
  res.json({ ...om, elapsed: getElapsed(om) });
}

async function getOMTime(req, res) {
  const { omNumber } = req.params;
  try {
    const omData = await database.dbGet('SELECT * FROM oms_finalizadas WHERE omNumber = ?', [
      omNumber,
    ]);
    if (!omData)
      return res.status(404).json({ error: 'Dados de tempo para esta OM não encontrados.' });

    const elapsed = omData.endTime - omData.startTime - (omData.pausedTime || 0);
    res.json({
      elapsed: elapsed,
      startTime: omData.startTime,
      endTime: omData.endTime,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function getRelatorioFalhas(req, res) {
  try {
    const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
    let whereClauses = [];
    let queryParams = [];

    if (om) {
      whereClauses.push('om = ?');
      queryParams.push(om);
    }
    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }
    if (dataIni) {
      whereClauses.push('createdAt >= ?');
      queryParams.push(dataIni);
    }
    if (dataFim) {
      whereClauses.push('createdAt <= ?');
      queryParams.push(dataFim);
    }

    let countQuery = 'SELECT COUNT(*) as total FROM registros';
    if (whereClauses.length > 0) countQuery += ' WHERE ' + whereClauses.join(' AND ');
    const countRes = await database.dbGet(countQuery, queryParams);
    const total = countRes
      ? countRes.total !== undefined
        ? countRes.total
        : Object.values(countRes)[0]
      : 0;

    let query =
      'SELECT om, qtdlote, serial, designador, tipoDefeito, pn, descricao, obs, createdAt, status, operador, prioridade FROM registros';
    if (whereClauses.length > 0) query += ' WHERE ' + whereClauses.join(' AND ');
    query += ' ORDER BY om, createdAt';
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(parseInt(limit, 10), 200));
    const offset = (pageNum - 1) * limitNum;
    query += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const registros = await database.dbAll(query, queryParams);
    const porOM = {};
    for (const r of registros) {
      if (!porOM[r.om]) porOM[r.om] = { om: r.om, qtdlote: r.qtdlote, falhas: [] };
      porOM[r.om].falhas.push({
        pn: r.pn,
        serial: r.serial,
        designador: r.designador,
        tipodefeito: r.tipoDefeito ?? '',
        descricao: r.descricao,
        createdat: r.createdAt ?? '',
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
    const finalizadas = await database.dbAll('SELECT * FROM oms_finalizadas ORDER BY endTime DESC');
    const relatorio = [];
    for (const om of finalizadas) {
      const registros = await database.dbAll('SELECT tipodefeito FROM registros WHERE om = ?', [
        om.omNumber,
      ]);
      relatorio.push({
        omNumber: om.omNumber,
        qtdlote: om.qtdlote || '-',
        tempo:
          om.endTime && om.startTime
            ? ((om.endTime - om.startTime - (om.pausedTime || 0)) / 1000).toFixed(0) + 's'
            : '-',
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
    // Return active OMs from memory that are currently running
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
    // Return paused OMs from memory that haven't been finalized
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
    const finalizadas = await database.dbAll(
      'SELECT omNumber, qtdlote FROM oms_finalizadas ORDER BY endTime DESC'
    );
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
