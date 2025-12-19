const express = require('express');
const router = express.Router();
const {
  validate,
  requisicoesCreateSchema,
  requisicaoStatusSchema,
  requisicaoItensSchema,
} = require('../utils/schemas');
const { authenticateToken } = require('../middleware/auth');
const requisicaoController = require('../controllers/requisicaoController');

router.get('/', authenticateToken, requisicaoController.listRequisicoes);
router.post(
  '/',
  authenticateToken,
  validate(requisicoesCreateSchema),
  requisicaoController.createRequisicao
);
router.put(
  '/:id/status',
  authenticateToken,
  validate(requisicaoStatusSchema),
  requisicaoController.updateStatus
);
router.put(
  '/:id/itens',
  authenticateToken,
  validate(requisicaoItensSchema),
  requisicaoController.updateItems
);
router.delete('/:id', authenticateToken, requisicaoController.deleteRequisicao);

module.exports = router;
