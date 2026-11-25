const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { isDemoEnabled } = require('../config/demo');

function ensureDebugEnabled(_req, res, next) {
  if (isDemoEnabled()) return next();
  return res.status(404).json({ error: 'Rota não encontrada.' });
}

// Rotas de debug
router.post('/populate', ensureDebugEnabled, authenticateToken, isAdmin, debugController.populateDemoData);
router.post('/clear', ensureDebugEnabled, authenticateToken, isAdmin, debugController.clearDemoData);

module.exports = router;
