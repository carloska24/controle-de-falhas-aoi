const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

function ensureDebugEnabled(_req, res, next) {
  const isDev = process.env.NODE_ENV !== 'production';
  const enabledInProd = String(process.env.DEBUG_ROUTES_ENABLED || '').toLowerCase() === 'true';

  if (isDev || enabledInProd) return next();
  return res.status(404).json({ error: 'Rota não encontrada.' });
}

// Rotas de debug
router.get('/seed-admin', ensureDebugEnabled, debugController.seedAdmin);
router.post('/populate', ensureDebugEnabled, authenticateToken, isAdmin, debugController.populateDemoData);
router.post('/clear', ensureDebugEnabled, authenticateToken, isAdmin, debugController.clearDemoData);

module.exports = router;
