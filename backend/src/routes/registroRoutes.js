const express = require('express');
const router = express.Router();
const {
  validate,
  registrosBatchSchema,
  idsArraySchema,
  registroUpdateSchema,
  registroStatusSchema,
} = require('../utils/schemas');
const { authenticateToken, hasRole } = require('../middleware/auth');
const registroController = require('../controllers/registroController');

router.get(
  '/',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo', 'qualidade', 'almoxarifado', 'lider_smt'),
  registroController.listRegistros
);
router.post(
  '/batch',
  authenticateToken,
  hasRole('admin', 'operator'),
  validate(registrosBatchSchema),
  registroController.createRegistrosBatch
);
// Rota para update de status individual
router.put(
  '/:id/status',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo'),
  validate(registroStatusSchema),
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
  hasRole('admin', 'operator', 'reparo'),
  validate(idsArraySchema),
  registroController.updateStatusBatch
);

router.put(
  '/:id',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo', 'lider_smt'),
  validate(registroUpdateSchema),
  registroController.updateRegistro
);
router.delete('/:id', authenticateToken, hasRole('admin', 'operator', 'reparo'), registroController.deleteRegistro);
router.delete(
  '/',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo'),
  registroController.deleteRegistrosBatch
);

module.exports = router;
