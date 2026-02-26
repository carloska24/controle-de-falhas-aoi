// Redeploy: estrutura backend limpa em 2025-12-10 (Refatorado)
console.log('--- STARTING SERVER.JS ---');
require('dotenv').config();
console.log('Dotenv loaded');
const express = require('express');
console.log('Express loaded');
const cors = require('cors');
console.log('Cors loaded');
const cookieParser = require('cookie-parser');
console.log('CookieParser loaded');

const { setupLogger, morganMiddleware } = require('./src/middleware/logger');
console.log('Logger loaded');

// Rotas
const authRoutes = require('./src/routes/authRoutes');
console.log('AuthRoutes loaded');
const userRoutes = require('./src/routes/userRoutes');
console.log('UserRoutes loaded');
const registroRoutes = require('./src/routes/registroRoutes');
console.log('RegistroRoutes loaded');
const requisicaoRoutes = require('./src/routes/requisicaoRoutes');
console.log('RequisicaoRoutes loaded');
const omRoutes = require('./src/routes/omRoutes');
console.log('OMRoutes loaded');
const debugRoutes = require('./src/routes/debugRoutes');
console.log('DebugRoutes loaded');

const omController = require('./src/controllers/omController');
console.log('OMController loaded');
const { authenticateToken, hasRole } = require('./src/middleware/auth');
console.log('Auth middleware loaded');
const prisma = require('./src/config/prisma');
console.log('Prisma loaded');

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Setup Logger (console override)
// setupLogger();
console.log(`Backend iniciando em modo ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

const app = express();

// Middlewares Globais
app.use(morganMiddleware);
// CORS Config
const corsOrigin = process.env.CORS_ORIGIN;

// Configuração de CORS simplificada para resolver problemas de conexão
if (!isProduction) {
  // Em desenvolvimento, permite qualquer origem (reflete a origem do request)
  // Isso resolve problemas ao acessar via IP (ex: 192.168.x.x) ou localhost
  app.use(cors({ origin: true, credentials: true }));
  console.log('CORS: Modo desenvolvimento - Permitindo todas as origens (origin: true)');
} else if (corsOrigin) {
  // Em produção, respeita estritamente a variável de ambiente
  const allowed = corsOrigin.split(',').map(s => s.trim());
  app.use(cors({ origin: allowed, credentials: true }));
  console.log(`CORS: Permitindo origens específicas: ${allowed.join(', ')}`);
} else {
  // Fallback (Intranet/Sem config)
  app.use(
    cors({
      origin: function (origin, callback) {
        // Permite requests sem origin (como curl ou apps mobile nativos) ou qualquer origem na intranet
        callback(null, true);
      },
      credentials: true,
    })
  );
  console.log('CORS: Modo fallback - Permitindo dinamicamente');
}

app.use(express.json());
app.use(cookieParser());

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'reachable', time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      db: 'unreachable',
      error: 'Falha ao consultar banco de dados',
      time: new Date().toISOString(),
    });
  }
});

// Arquivos Estáticos / Frontend Logs Blocker (Simplificado)
app.use((req, res, next) => {
  if (req.path.endsWith('.log')) return res.status(404).send('Not found');
  next();
});

// Rotas da API
app.get('/', (req, res) => res.json({ message: 'Backend API Refatorado', api: '/api/*' }));

// Montagem de Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/registros', registroRoutes);
app.use('/api/requisicoes', requisicaoRoutes);
app.use('/api/debug', debugRoutes);

// OM Routes - um pouco misturadas no original, mantendo compatibilidade
app.use('/api/om', omRoutes); // /api/om/start, /api/om/:omNumber, etc.

// Rotas soltas (Legacy/Reports) que estavam no server.js raiz
app.get(
  '/api/om-time/:omNumber',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo', 'qualidade', 'almoxarifado'),
  omController.getOMTime
);
app.get(
  '/api/relatorio-falhas',
  authenticateToken,
  hasRole('admin', 'qualidade'),
  omController.getRelatorioFalhas
);
app.get(
  '/api/oms/finalizadas',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo', 'qualidade', 'almoxarifado'),
  omController.listFinalizadas
); // Esta era solta

// Rota para listar OMs pausadas e ativas (frontend chama /api/oms?status=pausada ou status=ativa)
app.get(
  '/api/oms',
  authenticateToken,
  hasRole('admin', 'operator', 'reparo', 'qualidade', 'almoxarifado'),
  (req, res) => {
    const { status } = req.query;
    if (status === 'pausada') {
      return omController.listPausadas(req, res);
    }
    if (status === 'ativa') {
      return omController.listAtivas(req, res);
    }
    // Fallback: retorna lista vazia se status não for reconhecido
    res.json([]);
  }
);

// Debug (manter apenas se não for produção ou se tiver chave, mas simplificando aqui)
// Se precisar das rotas de debug, criar um debugRoutes.js. Por enquanto vou omitir para limpeza,
// a menos que sejam cruciais. O relatório mencionou removê-las.

// Inicialização
async function startServer() {
  console.log('startServer called');
  try {
    console.log('Loading OMs via Prisma...');
    await omController.carregarOMsPausadas();
    console.log('OMs loaded. Starting listener...');

    app.listen(PORT, '0.0.0.0', () => {
      console.info(`Servidor rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Error inside startServer:', err);
    throw err;
  }
}

console.log('Checking require.main === module:', require.main === module);
if (require.main === module) {
  startServer().catch(err => {
    console.error('FATAL ERROR starting server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
