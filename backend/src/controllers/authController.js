const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { JWT_SECRET, getToken } = require('../middleware/auth');
const { SESSION_DURATION_MS, getAuthCookieOptions } = require('../config/authCookie');
const { clearDemoData } = require('../services/demoCleanupService');
const { isDemoEnabled } = require('../config/demo');

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
      await prisma.$transaction(async tx => {
        const revoked = await tx.users.updateMany({
          where: { id: payload.id, session_version: payload.sessionVersion },
          data: { session_version: { increment: 1 } },
        });
        // Replayed/expired sessions cannot remove another session's demonstrations.
        if (revoked.count !== 1 || !isDemoEnabled()) return;
        const user = await tx.users.findUnique({ where: { id: payload.id }, select: { role: true } });
        if (user?.role === 'admin') await clearDemoData(tx);
      }, { isolationLevel: 'Serializable', timeout: 15000 });
    } catch {
      return res.status(503).json({ error: 'Não foi possível concluir a saída e a limpeza dos testes. A sessão foi mantida. Tente novamente.' });
    }
  }
  res.clearCookie('aoi_token', getAuthCookieOptions());
  res.json({ message: 'Desconectado' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, logout, me };
