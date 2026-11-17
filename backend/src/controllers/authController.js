const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { JWT_SECRET, getToken } = require('../middleware/auth');
const { SESSION_DURATION_MS, getAuthCookieOptions } = require('../config/authCookie');

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const user = await prisma.users.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    const userPayload = { email: user.username, username: user.username, role: user.role, id: user.id, name: user.name };
    const token = jwt.sign({ ...userPayload, sessionVersion: user.session_version }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('aoi_token', token, { ...getAuthCookieOptions(), maxAge: SESSION_DURATION_MS });
    res.json({ user: userPayload });
  } catch {
    res.status(503).json({ error: 'Não foi possível autenticar. Tente novamente.' });
  }
}

async function logout(req, res) {
  let payload;
  try {
    payload = jwt.verify(getToken(req), JWT_SECRET);
  } catch {
    // Logout idempotente também limpa cookies ausentes, expirados ou antigos.
  }
  if (Number.isInteger(payload?.id) && Number.isInteger(payload?.sessionVersion)) {
    try {
      await prisma.users.updateMany({
        where: { id: payload.id, session_version: payload.sessionVersion },
        data: { session_version: { increment: 1 } },
      });
    } catch {
      return res.status(503).json({ error: 'Não foi possível encerrar a sessão. Tente novamente.' });
    }
  }
  res.clearCookie('aoi_token', getAuthCookieOptions());
  res.json({ message: 'Desconectado' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
