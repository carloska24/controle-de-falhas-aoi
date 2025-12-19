const express = require('express');
const router = express.Router();
const {
  validate,
  registrosBatchSchema,
  idsArraySchema,
  registroUpdateSchema,
} = require('../utils/schemas');
const { authenticateToken } = require('../middleware/auth');
const registroController = require('../controllers/registroController');

router.get('/', authenticateToken, registroController.listRegistros);
router.post(
  '/batch',
  authenticateToken,
  validate(registrosBatchSchema),
  registroController.createRegistrosBatch
);
// Rota para update de status individual
router.put(
  '/:id/status',
  authenticateToken,
  validate(registroUpdateSchema), // Pode usar schema parcial ou criar um especifico se necessario, mas o updateSchema serve
  async (req, res) => {
    // Wrapper simples para redirecionar para updateRegistro, ou implementar lógica especifica
    // O frontend envia { status: '...' }
    // updateRegistro espera req.body com campos a atualizar.
    req.params.id = req.params.id; // Ja esta la
    return registroController.updateRegistro(req, res);
  }
);

// Rota para update de status em lote (ex: /mark-reparado)
router.put(
  '/status/:status',
  authenticateToken,
  validate(idsArraySchema),
  registroController.updateStatusBatch
);

router.put(
  '/:id',
  authenticateToken,
  validate(registroUpdateSchema),
  registroController.updateRegistro
);
router.delete('/:id', authenticateToken, registroController.deleteRegistro);
router.delete('/', authenticateToken, registroController.deleteRegistrosBatch);

module.exports = router;
