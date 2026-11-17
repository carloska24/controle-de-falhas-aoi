const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o backend.');
}

function getToken(req) {
  const cookieToken = req.cookies && req.cookies['aoi_token'];
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  return cookieToken || headerToken;
}

async function authenticateToken(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado. Faça login para continuar.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
    if (!Number.isInteger(payload.id) || !Number.isInteger(payload.sessionVersion)) {
      throw new Error('Token sem versão de sessão.');
    }
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, name: true, role: true, session_version: true },
    });
    if (!user || user.session_version !== payload.sessionVersion) {
      return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
    }
    // Nome/perfil atuais vêm do banco, não de claims possivelmente desatualizadas.
    req.user = { id: user.id, email: user.username, username: user.username, name: user.name, role: user.role };
    next();
  } catch {
    return res.status(503).json({ error: 'Não foi possível validar a sessão. Tente novamente.' });
  }
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Rota exclusiva para administradores.' });
  }
}

function hasRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Acesso negado para o seu perfil.' });
  };
}

module.exports = { authenticateToken, isAdmin, hasRole, JWT_SECRET, getToken };
