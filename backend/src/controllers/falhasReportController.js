const { getFalhasReport } = require('../services/falhasReportService');

async function getSnapshot(req, res) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getFalhasReport(req.query, req.user));
  } catch (error) {
    if ([400, 403, 413].includes(error.status)) return res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
    console.error('[Relatório de falhas] Consulta não concluída:', error.code || 'unexpected_error');
    res.status(503).json({ error: 'Não foi possível consultar o relatório completo. Tente atualizar novamente.' });
  }
}

module.exports = { getSnapshot };
