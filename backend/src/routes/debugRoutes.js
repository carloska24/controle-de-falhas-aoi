const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Rotas protegidas (apenas admin deveria conseguir gerar/limpar em teoria, mas para dev deixaremos auth simples)
router.post('/populate', authenticateToken, debugController.populateDemoData);
router.post('/clear', authenticateToken, debugController.clearDemoData);

module.exports = router;
