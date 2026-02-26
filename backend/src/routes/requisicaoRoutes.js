const express = require('express');
const router = express.Router();
const {
  validate,
  requisicoesCreateSchema,
  requisicaoStatusSchema,
  requisicaoItensSchema,
} = require('../utils/schemas');
const { authenticateToken, hasRole } = require('../middleware/auth');
const requisicaoController = require('../controllers/requisicaoController');

router.get(
  '/',
  authenticateToken,
  hasRole('admin', 'operator', 'almoxarifado'),
  requisicaoController.listRequisicoes
);
router.post(
  '/',
  authenticateToken,
  hasRole('admin', 'operator'),
  validate(requisicoesCreateSchema),
  requisicaoController.createRequisicao
);
router.put(
  '/:id/status',
  authenticateToken,
  hasRole('admin', 'almoxarifado'),
  validate(requisicaoStatusSchema),
  requisicaoController.updateStatus
);
router.put(
  '/:id/itens',
  authenticateToken,
  hasRole('admin', 'almoxarifado'),
  validate(requisicaoItensSchema),
  requisicaoController.updateItems
);
router.delete(
  '/:id',
  authenticateToken,
  hasRole('admin', 'almoxarifado'),
  requisicaoController.deleteRequisicao
);

module.exports = router;
