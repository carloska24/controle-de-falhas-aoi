const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-padrao';

function authenticateToken(req, res, next) {
  const cookieToken = req.cookies && req.cookies['aoi_token'];
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const token = cookieToken || headerToken;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
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

module.exports = { authenticateToken, isAdmin, hasRole, JWT_SECRET };
