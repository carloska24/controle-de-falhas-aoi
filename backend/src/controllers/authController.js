const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { JWT_SECRET } = require('../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const user = await prisma.users.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    const tokenPayload = { email: user.username, role: user.role, id: user.id, name: user.name };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    const cookieOptions = {
      httpOnly: true,
      path: '/',
      secure: String(process.env.COOKIE_SECURE || 'false') === 'true',
      sameSite: process.env.COOKIE_SAMESITE || 'Lax',
      maxAge: 8 * 60 * 60 * 1000,
    };

    if (isProduction && process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }

    res.cookie('aoi_token', token, cookieOptions);
    res.json({ user: tokenPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function logout(req, res) {
  try {
    // Limpar dados de demonstração
    await prisma.registros.deleteMany({ where: { om: { startsWith: 'DEMO-' } } });
    await prisma.requisicoes.deleteMany({ where: { om: { startsWith: 'DEMO-' } } });
    await prisma.oms_pausadas.deleteMany({ where: { omNumber: { startsWith: 'DEMO-' } } });
    await prisma.oms_finalizadas.deleteMany({ where: { omNumber: { startsWith: 'DEMO-' } } });
    console.log('[Auth] Dados de DEMO limpos no logout.');
  } catch (err) {
    console.error('[Auth] Erro ao limpar dados de DEMO:', err);
  }

  res.clearCookie('aoi_token', { path: '/' });
  res.json({ message: 'Desconectado' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
