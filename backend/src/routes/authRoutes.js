const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { validate, loginSchema } = require('../utils/schemas');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

module.exports = router;
