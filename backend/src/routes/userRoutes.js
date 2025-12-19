const express = require('express');
const router = express.Router();
const { validate, userCreateSchema, userUpdateSchema } = require('../utils/schemas');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Todas as rotas abaixo (exceto debug se exposto incorretamente) requerem auth + admin
router.get('/', authenticateToken, isAdmin, userController.listUsers);
router.post('/', authenticateToken, isAdmin, validate(userCreateSchema), userController.createUser);
router.put(
  '/:id',
  authenticateToken,
  isAdmin,
  validate(userUpdateSchema),
  userController.updateUser
);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);

// Rota de debug que estava solta (mantendo apenas em dev se necessário, mas aqui deixo protegida ou removida)
// router.get('/debug', userController.debugUsers);

module.exports = router;
