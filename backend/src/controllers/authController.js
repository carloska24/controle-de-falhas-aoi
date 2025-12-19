const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const database = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const user = await database.dbGet('SELECT * FROM users WHERE username = ?', [username]);
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
    await database.dbRun("DELETE FROM registros WHERE om LIKE 'DEMO-%'");
    await database.dbRun("DELETE FROM requisicoes WHERE om LIKE 'DEMO-%'");
    await database.dbRun("DELETE FROM oms_pausadas WHERE omNumber LIKE 'DEMO-%'");
    await database.dbRun("DELETE FROM oms_finalizadas WHERE omNumber LIKE 'DEMO-%'");
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
