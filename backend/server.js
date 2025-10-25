// Endpoint temporário para listar todos os registros do banco (para análise) - somente em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    const _t_debug = setTimeout(() => {
        if (typeof app !== 'undefined' && typeof dbAll !== 'undefined') {
            app.get('/api/debug/listar-todos-registros', async (req, res) => {
                try {
                    const registros = await dbAll('SELECT * FROM registros ORDER BY createdat DESC');
                    res.json(registros);
                } catch (err) {
                    res.status(500).json({ error: err.message });
                }
            });
        }
    }, 1000);
    if (typeof _t_debug.unref === 'function') _t_debug.unref();
}
// redeploy: estrutura backend limpa em 2025-10-07
// trigger redeploy - 2025-10-07
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const cookieParser = require('cookie-parser');
const cache = require('./cache');

// Logging gate: controla o que será impresso por console.log dependendo do ambiente
const isProduction = process.env.NODE_ENV === 'production';
const SILENCE_LOGS = String(process.env.SILENCE_LOGS || '').toLowerCase() === 'true';
const LOG_LEVEL = (process.env.LOG_LEVEL || (isProduction ? 'error' : 'debug')).toLowerCase();
const _levelOrder = { error: 0, warn: 1, info: 2, debug: 3 };
const _currentLevel = _levelOrder[LOG_LEVEL] !== undefined ? _levelOrder[LOG_LEVEL] : 3;
const _origConsoleLog = console.log.bind(console);
console.log = function (...args) {
    if (SILENCE_LOGS) return; // suprime todos os console.log quando ativado
    try {
        const first = typeof args[0] === 'string' ? args[0] : '';
        let msgLevel = 'info';
        if (/^\[debug/i.test(first) || first.toLowerCase().includes('[debug') || first.toLowerCase().includes('debug:')) msgLevel = 'debug';
        if (/error|failed|exception|traceback/i.test(first)) msgLevel = 'error';
        if (/warn|warning|limite/i.test(first)) msgLevel = 'warn';
        if (_levelOrder[msgLevel] <= _currentLevel) {
            _origConsoleLog(...args);
        }
    } catch (e) {
        // se algo falhar ao decidir nível, não bloqueamos logs críticos
        _origConsoleLog(...args);
    }
};

console.log('Deploy forçado em 2025-10-07 para Render.');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-padrao';
const DEV_SEED_KEY = process.env.DEV_SEED_KEY || 'local-dev-2024';

// Middleware para interpretar JSON deve vir antes de todas as rotas
app.use(express.json());
// Parser de cookies (necessário para autenticação via HttpOnly cookie)
app.use(cookieParser());

// Endpoint de manutenção: redefinir senha de um usuário específico (SOMENTE EM DESENVOLVIMENTO)
if (!isProduction) {
    app.post('/api/debug/reset-password', async (req, res) => {
        const { username, password } = req.body || {};
        if (!username || !password) return res.status(400).json({ error: 'username e password são obrigatórios' });
        try {
            const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id]);
            res.json({ message: `Senha redefinida para ${username}.` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

// Segurança: exigir um JWT_SECRET válido em produção
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'seu-segredo-super-secreto-padrao')) {
    // Falha logo no startup se estiver mal configurado
    throw new Error('Configuração inválida: defina JWT_SECRET no ambiente de produção.');
}

// --- Lógica de Banco de Dados Dinâmico ---
let db, dbAll, dbGet, dbRun, dbTransaction;

// CORS configurável: em desenvolvimento (sem CORS_ORIGIN) libera geral; em produção, exige CORS_ORIGIN
const corsOrigin = process.env.CORS_ORIGIN;
// Habilita CORS com suporte a credenciais (cookies). Em dev, permite origem dinâmica;
// em produção, respeita CORS_ORIGIN (lista separada por vírgula).
if (!isProduction && !corsOrigin) {
    app.use(cors({ origin: true, credentials: true }));
} else if (corsOrigin) {
    const allowed = corsOrigin.split(',').map(s => s.trim());
    app.use(cors({ origin: allowed, credentials: true }));
} else {
    // produção sem CORS_ORIGIN definido
    app.use((_req, res, _next) => res.status(500).json({ error: 'CORS_ORIGIN não configurado no ambiente de produção.' }));
}
app.use(express.json());

// Healthcheck simples
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Servir frontend estatico: permite abrir a aplicação diretamente em /
// Mapeia a pasta ../frontend como conteúdo estático
const frontendDir = path.join(__dirname, '..', 'frontend');
// Segurança: bloqueia acesso público a arquivos de log por padrão.
// Para testes locais, definir EXPOSE_LOGS=true antes de iniciar o servidor permitirá
// a visualização somente se a requisição vier do host local.
app.use((req, res, next) => {
    try {
        const urlPath = req.path || '';
        if (urlPath.endsWith('.log')) {
            const expose = String(process.env.EXPOSE_LOGS || '').toLowerCase() === 'true';
            // permite exposição apenas quando EXPOSE_LOGS=true E requisição local
            if (expose) {
                const ip = (req.ip || req.connection && req.connection.remoteAddress || '').toString();
                const forwarded = (req.headers && req.headers['x-forwarded-for']) || '';
                const combined = `${ip} ${forwarded}`;
                if (/127\.0\.0\.1|::1|::ffff:127\.0\.0\.1/.test(combined)) {
                    return next();
                }
            }
            return res.status(404).send('Not found');
        }
    } catch (e) {
        // Em caso de erro inesperado, prossegue para não bloquear o app
        console.error('[log-blocker] erro ao verificar path:', e && e.message);
    }
    next();
});

console.log(`[static] Servindo frontend de: ${frontendDir}`);
app.use(express.static(frontendDir));
// Redireciona raiz para login.html por conveniência
app.get('/', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'login.html'));
});

// Fallback: qualquer GET que não seja /api/* retorna o login.html (evita "Cannot GET /")
app.get(/^(?!\/api\/).+/, (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(frontendDir, 'login.html'));
});

// Utilitário de debug para redefinir senha (somente DEV, via GET com chave)
if (!isProduction) {
    app.get('/api/debug/reset-password', async (req, res) => {
        const { u, p, key } = req.query;
        if (key !== 'local-dev-2024') return res.status(403).json({ error: 'Chave inválida' });
        if (!u || !p) return res.status(400).json({ error: 'Parâmetros u (username) e p (password) são obrigatórios' });
        try {
            const user = await dbGet('SELECT id FROM users WHERE username = ?', [u]);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(String(p), salt);
            await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id]);
            res.json({ message: `Senha redefinida para ${u}.` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

// =================================================================
// VALIDATION HELPERS (Zod)
// =================================================================
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = req[source];
        const result = schema.safeParse(data);
        if (!result.success) {
            const issues = result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
            return res.status(400).json({ error: 'Dados inválidos', details: issues });
        }
        // substitui pelo objeto validado/coercido
        req[source] = result.data;
        next();
    };
}

// Schemas
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const userCreateSchema = z.object({
    name: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    role: z.enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado']).default('operator')
});
const userUpdateSchema = z.object({
    name: z.string().min(1),
    username: z.string().min(1),
    role: z.enum(['admin', 'operator', 'reparo', 'qualidade', 'almoxarifado']),
    password: z.string().min(1).optional()
});

const registroBase = {
    id: z.string().min(1),
    om: z.string().min(1),
    qtdlote: z.coerce.number().int().min(1),
    serial: z.string().optional().nullable(),
    designador: z.string().min(1),
    tipodefeito: z.string().min(1),
    pn: z.string().optional().nullable(),
    descricao: z.string().optional().nullable(),
    obs: z.string().optional().nullable(),
    createdat: z.string().min(1),
    status: z.string().min(1),
    operador: z.string().min(1)
};
const registroCreateSchema = z.object(registroBase);
const registroUpdateSchema = z.object({
    om: z.string().min(1),
    qtdlote: z.coerce.number().int().min(1),
    serial: z.string().optional().nullable(),
    designador: z.string().min(1),
    tipodefeito: z.string().min(1),
    pn: z.string().optional().nullable(),
    descricao: z.string().optional().nullable(),
    obs: z.string().optional().nullable(),
});
const registrosBatchSchema = z.array(registroCreateSchema).min(1);

const idsArraySchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
const registroStatusSchema = z.object({ status: z.string().min(1) });
const requisicoesCreateSchema = z.object({ registroIds: z.array(z.string().min(1)).min(1) });
const requisicaoStatusSchema = z.object({ status: z.enum(['pendente','parcialmente_entregue','entregue']) });
const requisicaoItensSchema = z.object({
    items: z.array(z.object({
        pn: z.string().min(1),
        descricao: z.string().optional().nullable(),
        quantidade_requisitada: z.coerce.number().int().min(0),
        quantidade_entregue: z.coerce.number().int().min(0)
    })).min(1)
});

// =================================================================
// MIDDLEWARES
// =================================================================
function authenticateToken(req, res, next) {
    // Primeiro tenta extrair do cookie HttpOnly, em seguida do header Authorization.
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
        res.status(403).json({ error: "Acesso negado. Rota exclusiva para administradores." });
    }
}

function hasRole(...roles) {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) return next();
        return res.status(403).json({ error: 'Acesso negado para o seu perfil.' });
    };
}

// =================================================================
// ROTAS
// =================================================================

// ROTA DE SETUP INICIAL (EMERGÊNCIA) — desabilitada por padrão e sempre bloqueada em produção
if (process.env.ENABLE_EMERGENCY_ROUTES === 'true' && !isProduction) {
app.get('/api/setup/initial-admin', async (req, res) => {
    // Rota de emergência para resetar todos os usuários e criar um admin.
    // Requer uma chave secreta para ser executada.
    const { key } = req.query;
    if (key !== 'reset-total-2024') {
        return res.status(403).json({ message: "Chave de segurança inválida." });
    }

    try {
        console.log('INICIANDO RESET DE EMERGÊNCIA DE USUÁRIOS...');
        // 1. Apaga todos os usuários existentes.
        await dbRun("DELETE FROM users");
        console.log('Todos os usuários foram excluídos.');

        // 2. Cria o novo usuário administrador.
        const salt = await bcrypt.genSalt(10);
        const newAdmin = {
            name: 'Admin Principal',
            username: 'DevAdmin',
            password: '123456'
        };
        const password_hash = await bcrypt.hash(newAdmin.password, salt);
        await dbRun("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)", [newAdmin.name, newAdmin.username, password_hash, 'admin']);
        console.log(`Novo administrador '${newAdmin.username}' criado com sucesso.`);
        
        res.status(201).json({ message: `Reset concluído. O único usuário agora é '${newAdmin.username}' com a senha '${newAdmin.password}'.` });
    } catch (err) {
        res.status(500).json({ error: `Erro durante o setup inicial: ${err.message}` });
    }
});

// ROTA DE LIMPEZA DE REQUISIÇÕES (EMERGÊNCIA)
app.get('/api/setup/clear-requisicoes', async (req, res) => {
    const { key } = req.query;
    if (key !== 'reset-reqs-2024') {
        return res.status(403).json({ message: "Chave de segurança inválida." });
    }

    try {
        console.log('INICIANDO LIMPEZA DA TABELA DE REQUISIÇÕES...');
        await dbRun("DELETE FROM requisicoes");
        console.log('Tabela "requisicoes" foi limpa com sucesso.');
        res.status(200).send(`
            <h1>Tabela de Requisições Limpa!</h1>
            <p>Todos os registros de requisições do almoxarifado foram excluídos com sucesso.</p>
        `);
    } catch (err) { res.status(500).json({ error: `Erro durante a limpeza: ${err.message}` }); }
});
}

// ROTA DE DEBUG (apenas dev): lista usuários sem dados sensíveis
if (!isProduction) {
    app.get('/api/debug/users', async (_req, res) => {
        try {
            const users = await dbAll('SELECT id, name, username, role FROM users ORDER BY id');
            res.json(users);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    const seedLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
    app.post('/api/debug/seed-admin', seedLimiter, async (req, res) => {
        const key = req.query.key;
        if (key !== DEV_SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });
        try {
            const existing = await dbGet('SELECT id FROM users WHERE username = ?', ['DevAdmin']);
            if (existing) return res.json({ message: 'Usuário DevAdmin já existe.' });
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash('123456', salt);
            await dbRun('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin Principal', 'DevAdmin', password_hash, 'admin']);
            res.status(201).json({ message: 'Usuário admin semeado: DevAdmin/123456' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

        // Aceita também GET para facilitar em ambientes sem ferramenta de POST
        app.get('/api/debug/seed-admin', seedLimiter, async (req, res) => {
            const key = req.query.key;
            if (key !== DEV_SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });
            try {
                const existing = await dbGet('SELECT id FROM users WHERE username = ?', ['DevAdmin']);
                if (existing) return res.json({ message: 'Usuário DevAdmin já existe.' });
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash('123456', salt);
                await dbRun('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin Principal', 'DevAdmin', password_hash, 'admin']);
                res.status(201).json({ message: 'Usuário admin semeado: DevAdmin/123456' });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // Rota para redefinir senha de um usuário específico (DEV ONLY)
        app.post('/api/debug/set-password', async (req, res) => {
            const { username, password } = req.body || {};
            if (!username || !password) return res.status(400).json({ error: 'username e password são obrigatórios' });
            try {
                const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
                if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(password, salt);
                await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, user.id]);
                res.json({ message: `Senha redefinida para ${username}.` });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // Rotas de SEED (DEV ONLY) para popular rapidamente
        app.get('/api/debug/seed-registros', seedLimiter, async (req, res) => {
            const key = req.query.key;
            const n = Math.max(1, Math.min(parseInt(req.query.n || '8', 10), 50));
            if (key !== DEV_SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });
            try {
                const now = Date.now();
                // Tipos de defeito válidos (alinhados ao frontend)
                const exemplos = [
                    'Curto-circuito','Solda Fria','Excesso de Solda','Insuficiência de Solda','Tombstone','Bilboard','Solder Ball',
                    'Componente Ausente','Componente Danificado','Componente Deslocado','Componente Incorreto','Componente Invertido','Polaridade Incorreta'
                ];
                const oms = ['DEMO-OM-01','DEMO-OM-02','DEMO-OM-03'];
                const registros = [];
                for (let i=0; i<n; i++) {
                    const id = 'DEMO-' + (now + i);
                    registros.push({
                        id,
                        om: oms[i % oms.length],
                        qtdlote: 1 + (i % 5),
                        serial: 'S' + (1000 + i),
                        designador: 'U' + (i % 10),
                        tipodefeito: exemplos[i % exemplos.length],
                        pn: 'PN-' + (2000 + i),
                        descricao: 'Peça de demonstração ' + i,
                        obs: null,
                        createdat: new Date(now - i*60000).toISOString(),
                        status: 'pendente',
                        operador: 'DevAdmin'
                    });
                }
                // Inserir em lote com transação se disponível
                const doInserts = async (runner) => {
                    for (const r of registros) {
                        await runner('INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador]);
                    }
                };
                if (typeof dbTransaction === 'function') {
                    await dbTransaction(async (run) => { await doInserts(run); });
                } else {
                    await dbRun('BEGIN');
                    await doInserts(dbRun);
                    await dbRun('COMMIT');
                }
                console.log(`[seed] Inseridos ${registros.length} registros DEMO por rota de debug.`);
                res.status(201).json({ message: `Inseridos ${registros.length} registros demo.` });
            } catch (e) {
                try { await dbRun('ROLLBACK'); } catch (_) {}
                res.status(500).json({ error: e.message });
            }
        });

        app.get('/api/debug/seed-requisicoes', seedLimiter, async (req, res) => {
            const key = req.query.key;
            if (key !== DEV_SEED_KEY) return res.status(403).json({ error: 'Chave inválida' });
            try {
                const regs = await dbAll("SELECT om, pn, descricao FROM registros WHERE om LIKE 'DEMO-%' LIMIT 30");
                if (regs.length === 0) return res.status(404).json({ error: 'Sem registros DEMO para criar requisições' });
                const porOM = regs.reduce((acc, r) => { (acc[r.om] ||= []).push(r); return acc; }, {});
                const ids = [];
                for (const [om, list] of Object.entries(porOM)) {
                    const items = list.slice(0, 5).map((r, idx) => ({
                        pn: r.pn,
                        descricao: r.descricao || 'Sem descrição',
                        quantidade_requisitada: 1 + (idx % 2),
                        quantidade_entregue: 0
                    }));
                    const result = await dbRun('INSERT INTO requisicoes (om, items, created_at, created_by) VALUES (?, ?, ?, ?)', [om, JSON.stringify(items), new Date().toISOString(), 'DevAdmin']);
                    ids.push(result.lastID);
                }
                console.log(`[seed] Criadas ${ids.length} requisições DEMO por rota de debug.`);
                res.status(201).json({ message: `Criadas ${ids.length} requisições DEMO.`, ids });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
}

// ROTAS DE AUTENTICAÇÃO
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
app.post('/api/auth/login', loginLimiter, validate(loginSchema), async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) return res.status(401).json({ error: "Usuário ou senha inválidos." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Usuário ou senha inválidos." });
        const tokenPayload = { email: user.username, role: user.role, id: user.id, name: user.name }; // Note: email is username
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        // Define cookie HttpOnly para autenticação. A configuração de 'secure' e 'sameSite'
        // pode ser ajustada via variáveis de ambiente. Para cross-site em produção,
        // sameSite='None' e secure=true são recomendados (requer HTTPS).
        const cookieOptions = {
            httpOnly: true,
            // default path
            path: '/',
            // permitir controle via env
            secure: String(process.env.COOKIE_SECURE || 'false') === 'true',
            sameSite: process.env.COOKIE_SAMESITE || 'Lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 horas
        };

        res.cookie('aoi_token', token, cookieOptions);
        // Retorna apenas dados do usuário (sem token) para que o frontend saiba o perfil
        res.json({ user: tokenPayload });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para logout — limpa o cookie HttpOnly
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('aoi_token', { path: '/' });
    res.json({ message: 'Desconectado' });
});

// Endpoint que retorna o usuário autenticado (útil para o frontend validar sessão)
app.get('/api/auth/me', authenticateToken, (req, res) => {
    // req.user é injetado pelo authenticateToken
    res.json({ user: req.user });
});

// ROTAS DE GERENCIAMENTO DE USUÁRIOS
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, name, username, role FROM users ORDER BY id');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para criar um novo usuário (protegida, apenas para admins)
app.post('/api/users', authenticateToken, isAdmin, validate(userCreateSchema), async (req, res) => {
    const { name, username, password, role = 'operator' } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        // Reintroduzindo RETURNING id, crucial para PostgreSQL. A camada de abstração lida com a compatibilidade.
        const result = await dbRun("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id", [name, username, password_hash, role]);
        const newUser = await dbGet("SELECT id, name, username, role FROM users WHERE id = ?", [result.lastID]);
        if (!newUser) throw new Error("Falha ao recuperar o usuário recém-criado. O ID não foi retornado.");
         res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: "Nome de usuário já cadastrado ou erro no servidor." });
    }
});

app.put('/api/users/:id', authenticateToken, isAdmin, validate(userUpdateSchema), async (req, res) => {
    const { id } = req.params;
    const { name, username, role, password } = req.body; // Adiciona 'password'

    try {
        let result;
        if (password) {
            // Se uma nova senha foi fornecida, cria o hash e atualiza tudo
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            result = await dbRun(
                "UPDATE users SET name = ?, username = ?, role = ?, password_hash = ? WHERE id = ?",
                [name, username, role, password_hash, id]
            );
        } else {
            // Se não, atualiza apenas os outros campos
            result = await dbRun(
                "UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?",
                [name, username, role, id]
            );
        }
        if (result.changes === 0) return res.status(404).json({ message: "Usuário não encontrado" });
        const updatedUser = await dbGet("SELECT id, name, username, role FROM users WHERE id = ?", [id]);
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: "Erro ao atualizar usuário. O nome de usuário pode já estar em uso." }); }
});

app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    if (parseInt(id, 10) === adminId) {
        return res.status(400).json({ error: "Você não pode excluir sua própria conta de administrador." });
    }
    try {
        await dbRun("DELETE FROM users WHERE id = ?", [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir usuário." });
    }
});

// ROTAS DE REGISTROS (PROTEGIDAS)
// ================== INÍCIO DA ALTERAÇÃO ==================
app.get('/api/registros', authenticateToken, async (req, res) => {
    try {
        // Parâmetros de paginação e filtros
        const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
        const isAdminUser = req.user && req.user.role === 'admin';

        let whereClauses = [];
        let queryParams = [];

        if (!isAdminUser) {
            whereClauses.push("om NOT LIKE 'DEMO-%'");
        }
        if (om) {
            whereClauses.push("om = ?");
            queryParams.push(om);
        }
        if (status) {
            whereClauses.push("status = ?");
            queryParams.push(status);
        }
        if (dataIni) {
            whereClauses.push("createdat >= ?");
            queryParams.push(dataIni);
        }
        if (dataFim) {
            whereClauses.push("createdat <= ?");
            queryParams.push(dataFim);
        }

        // Monta consulta principal
        let query = 'SELECT * FROM registros';
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY createdat DESC';

        // Paginação
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, Math.min(parseInt(limit, 10), 200));
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT ${limitNum} OFFSET ${offset}`;

        // Consulta total de registros para metadados
        let countQuery = 'SELECT COUNT(*) as total FROM registros';
        if (whereClauses.length > 0) {
            countQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
        const countRes = await dbGet(countQuery, queryParams);
        const total = countRes ? (countRes.total || 0) : 0;

        // Consulta paginada
        const registros = await dbAll(query, queryParams);
        const mapped = registros.map(r => ({
            id: r.id,
            om: r.om,
            qtdlote: r.qtdlote,
            serial: r.serial,
            designador: r.designador,
            tipodefeito: r.tipodefeito ?? r.tipoDefeito ?? '',
            pn: r.pn,
            descricao: r.descricao,
            obs: r.obs,
            createdat: r.createdat ?? r.createdAt ?? '',
            status: r.status,
            operador: r.operador
        }));
        res.json({
            data: mapped,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// ================== FIM DA ALTERAÇÃO ==================

app.post('/api/registros', authenticateToken, validate(registroCreateSchema), async (req, res) => {
    const r = req.body;
    // Somente admin pode criar registros DEMO (OM iniciando com 'DEMO-')
    if (typeof r.om === 'string' && r.om.startsWith('DEMO-') && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar registros de demonstração.' });
    }
    const queryText = `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador];
    try {
        await dbRun(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/registros/batch', authenticateToken, validate(registrosBatchSchema), async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "O corpo da requisição deve ser um array de registros." });
    }

    // Somente admin pode criar registros DEMO (OM iniciando com 'DEMO-')
    const hasDemo = records.some(r => typeof r.om === 'string' && r.om.startsWith('DEMO-'));
    if (hasDemo && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar registros de demonstração (DEMO-).' });
    }

    try {
                const doInserts = async (runner) => {
                    for (const r of records) {
                        const queryText = 'INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador];
                        await runner(queryText, values);
                    }
                };

                if (typeof dbTransaction === 'function') {
                    await dbTransaction(async (run) => {
                        await doInserts(run);
                    });
                } else {
                    // Fallback simples (SQLite antigo): BEGIN/COMMIT no mesmo handle
                    await dbRun('BEGIN');
                    await doInserts(dbRun);
                    await dbRun('COMMIT');
                }
        res.status(201).json(records); // Retorna os registros criados
    } catch (err) {
                try { await dbRun('ROLLBACK'); } catch (_) {}
        res.status(500).json({ error: `Erro ao inserir registros em lote: ${err.message}` });
    }
});

app.put('/api/registros/:id', authenticateToken, validate(registroUpdateSchema), async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    const queryText = `UPDATE registros SET om = ?, qtdlote = ?, serial = ?, designador = ?, tipodefeito = ?, pn = ?, descricao = ?, obs = ? WHERE id = ?`;
    const values = [r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, id];
    try {
        const result = await dbRun(queryText, values);
        if (result.changes === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Registro atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registros/:id/status', authenticateToken, validate(registroStatusSchema), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const result = await dbRun(`UPDATE registros SET status = ? WHERE id = ?`, [status, id]);
        if (result.changes === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Status atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros', authenticateToken, validate(idsArraySchema), async (req, res) => {
    const { ids } = req.body;
    const placeholders = ids.map(() => '?').join(',');
    const queryText = `DELETE FROM registros WHERE id IN (${placeholders})`;
    try {
        const result = await dbRun(queryText, ids);
        res.json({ message: `Registros excluídos: ${result.changes}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros/demo', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await dbRun("DELETE FROM registros WHERE om LIKE 'DEMO-%'");
        console.log(`Limpeza de Demos: ${result.changes} registros de demonstração foram excluídos.`);
        res.status(200).json({ message: `${result.changes} registros de demonstração foram excluídos.` });
    } catch (err) {
        console.error(`Erro ao limpar registros de demonstração: ${err.message}`);
        res.status(500).json({ error: `Erro ao limpar registros de demonstração: ${err.message}` });
    }
});

// Opcional: endpoint de logout admin que limpa demos (se desejar acionar via frontend com uma chamada explícita)
app.post('/api/admin/logout', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const r1 = await dbRun("DELETE FROM registros WHERE om LIKE 'DEMO-%'");
        const r2 = await dbRun("DELETE FROM requisicoes WHERE om LIKE 'DEMO-%'");
        res.json({ message: `Logout admin: ${r1.changes || 0} registros DEMO e ${r2.changes || 0} requisições DEMO removidos.` });
    } catch (err) {
        res.status(500).json({ error: `Erro no logout admin: ${err.message}` });
    }
});

// Endpoint seguro para exportar o arquivo SQLite (apenas em ambiente sem DATABASE_URL)
app.get('/api/admin/export-sqlite', authenticateToken, isAdmin, async (req, res) => {
    try {
        if (process.env.DATABASE_URL) {
            return res.status(400).json({ error: 'Export SQLite somente disponível quando usando SQLite local.' });
        }
        const DB_PATH = path.join(__dirname, 'aoi.db');
        if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: 'Arquivo SQLite não encontrado.' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tmpName = `aoi-export-${timestamp}.db`;
        const tmpPath = path.join(__dirname, tmpName);
        fs.copyFileSync(DB_PATH, tmpPath);
        res.setHeader('Content-Disposition', `attachment; filename="${tmpName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        const stream = fs.createReadStream(tmpPath);
        stream.pipe(res);
        stream.on('end', () => {
            try { fs.unlinkSync(tmpPath); } catch(e) { /* ignore */ }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// ROTAS DE REQUISIÇÃO (ALMOXARIFADO)
// =================================================================
app.post('/api/requisicoes', authenticateToken, validate(requisicoesCreateSchema), async (req, res) => {
    // Agora admin, almoxarifado e operator podem criar requisições
    if (!['admin','almoxarifado','operator'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Apenas administradores, almoxarifado e operadores podem criar requisições.' });
    }
    const { registroIds } = req.body;
    const created_by = req.user.name || req.user.username;

    // registroIds já validado pelo schema

    try {
        const placeholders = registroIds.map(() => '?').join(','); // Cria placeholders como ?,?,?
    // NOTE: include `designador` so the later splitting logic can create one item per designador
    const registros = await dbAll(`SELECT om, pn, descricao, designador FROM registros WHERE id IN (${placeholders})`, registroIds);
    console.log('[debug:/api/requisicoes] registros fetched count=', (registros && registros.length) || 0);
    try { console.log('[debug:/api/requisicoes] registros sample:', JSON.stringify(registros.slice(0,5), null, 2)); } catch(e) { console.log('[debug:/api/requisicoes] failed to stringify registros', e && e.message); }

        if (registros.length === 0) {
            return res.status(404).json({ error: "Nenhum registro válido encontrado para os IDs fornecidos." });
        }

        // Nova Lógica: Agrupa os registros por OM para criar requisições separadas.
        const registrosPorOM = registros.reduce((acc, registro) => {
            const om = registro.om;
            if (!acc[om]) {
                acc[om] = [];
            }
            acc[om].push(registro);
            return acc;
        }, {});

        const requisicoesCriadas = [];
        for (const om in registrosPorOM) {
            const registrosDaOM = registrosPorOM[om];

            // Construir lista de itens com agregação por PN + descricao base.
            // Se houver múltiplos designadores para o mesmo PN, somamos a quantidade_requisitada
            // e agregamos os designadores na descrição entre parênteses.
            const agg = new Map();
            for (const registro of registrosDaOM) {
                const pn = registro.pn || '';
                const baseDesc = registro.descricao || '';
                const raw = registro.designador || '';
                const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
                console.log('[debug:/api/requisicoes] registro.id?', registro.id || '(no id field)', 'pn=', pn, 'designador raw=', raw, 'parts=', parts);

                const key = `${pn}||${baseDesc}`;
                const entry = agg.get(key) || { pn, descricaoBase: baseDesc, designadores: [], quantidade: 0 };

                if (parts.length > 0) {
                    entry.designadores.push(...parts);
                    entry.quantidade += parts.length;
                } else {
                    // Sem designador (ou string vazia) -> conta como 1 unidade do PN
                    entry.quantidade += 1;
                }
                agg.set(key, entry);
            }

            // Constrói o array final de items agregados
            const items = Array.from(agg.values()).map(e => {
                const descr = e.descricaoBase ? (e.designadores.length ? `${e.descricaoBase} (${e.designadores.join(',')})` : e.descricaoBase) : (e.designadores.length ? e.designadores.join(',') : 'Sem descrição');
                return {
                    pn: e.pn,
                    descricao: descr,
                    quantidade_requisitada: e.quantidade,
                    quantidade_entregue: 0
                };
            });

            console.log('[debug:/api/requisicoes] about to insert items count=', items.length);
            try { console.log('[debug:/api/requisicoes] items:', JSON.stringify(items.slice(0,10), null, 2)); } catch(e) { console.log('[debug:/api/requisicoes] failed to stringify items', e && e.message); }
            const result = await dbRun(
                "INSERT INTO requisicoes (om, items, created_at, created_by) VALUES (?, ?, ?, ?)",
                [om, JSON.stringify(items), new Date().toISOString(), created_by]
            );
            requisicoesCriadas.push(result.lastID);
        }

        res.status(201).json({ message: `${requisicoesCriadas.length} requisição(ões) criada(s) com sucesso.`, requisicaoIds: requisicoesCriadas });
    } catch (err) { res.status(500).json({ error: `Erro ao criar requisição: ${err.message}` }); }
});

app.get('/api/requisicoes', authenticateToken, async (req, res) => {
    try {
        // Parâmetros de paginação e filtros
        const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
        const isAdminUser = req.user && req.user.role === 'admin';

        let whereClauses = [];
        let queryParams = [];

        if (!isAdminUser) {
            whereClauses.push("om NOT LIKE 'DEMO-%'");
        }
        if (om) {
            whereClauses.push("om = ?");
            queryParams.push(om);
        }
        if (status) {
            whereClauses.push("status = ?");
            queryParams.push(status);
        }
        if (dataIni) {
            whereClauses.push("created_at >= ?");
            queryParams.push(dataIni);
        }
        if (dataFim) {
            whereClauses.push("created_at <= ?");
            queryParams.push(dataFim);
        }

        // Monta consulta principal
        let query = 'SELECT * FROM requisicoes';
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY created_at DESC';

        // Paginação
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, Math.min(parseInt(limit, 10), 200));
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT ${limitNum} OFFSET ${offset}`;

        // Consulta total de registros para metadados
        let countQuery = 'SELECT COUNT(*) as total FROM requisicoes';
        if (whereClauses.length > 0) {
            countQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
        const countRes = await dbGet(countQuery, queryParams);
        const total = countRes ? (countRes.total || 0) : 0;

        // Consulta paginada
        const requisicoes = await dbAll(query, queryParams);
        const requisicoesComItems = requisicoes.map(r => ({
            ...r,
            items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
        res.json({
            data: requisicoesComItems,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err) { res.status(500).json({ error: `Erro ao buscar requisições: ${err.message}` }); }
});

app.put('/api/requisicoes/:id/status', authenticateToken, hasRole('admin','almoxarifado'), validate(requisicaoStatusSchema), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await dbRun('UPDATE requisicoes SET status = ? WHERE id = ?', [status, id]);
        if (result.changes === 0) return res.status(404).json({ message: "Requisição não encontrada" });
        res.json({ message: "Status da requisição atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: `Erro ao atualizar status da requisição: ${err.message}` }); }
});

app.put('/api/requisicoes/:id/itens', authenticateToken, hasRole('admin','almoxarifado'), validate(requisicaoItensSchema), async (req, res) => {
    const { id } = req.params;
    const { items } = req.body; // Espera receber o array de itens atualizado

    try {
        // Calcula o novo status geral da requisição
        const totalRequisitado = items.reduce((sum, item) => sum + item.quantidade_requisitada, 0);
        const totalEntregue = items.reduce((sum, item) => sum + item.quantidade_entregue, 0);

        let novoStatus = 'pendente';
        if (totalEntregue > 0 && totalEntregue < totalRequisitado) novoStatus = 'parcialmente_entregue';
        else if (totalEntregue >= totalRequisitado) novoStatus = 'entregue';

        await dbRun('UPDATE requisicoes SET items = ?, status = ? WHERE id = ?', [JSON.stringify(items), novoStatus, id]);
        res.json({ message: "Itens da requisição atualizados com sucesso", novoStatus });

    } catch (err) { res.status(500).json({ error: `Erro ao atualizar itens da requisição: ${err.message}` }); }
});

app.delete('/api/requisicoes/:id', authenticateToken, hasRole('admin','almoxarifado','operator'), async (req, res) => {
    console.log(`[DELETE /api/requisicoes/${req.params.id}] Usuário:`, req.user && req.user.username, '| Papel:', req.user && req.user.role);
    const { id } = req.params;
    try {
        const result = await dbRun('DELETE FROM requisicoes WHERE id = ?', [id]);
        if (result.changes === 0) return res.status(404).json({ message: "Requisição não encontrada" });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: `Erro ao excluir requisição: ${err.message}` });
    }
});

// Limpeza de requisições DEMO (admin)
app.delete('/api/requisicoes/demo', authenticateToken, isAdmin, async (_req, res) => {
    try {
        const result = await dbRun("DELETE FROM requisicoes WHERE om LIKE 'DEMO-%'");
        console.log(`Limpeza de Demos (requisicoes): ${result.changes} removidas.`);
        res.status(200).json({ message: `${result.changes} requisições DEMO foram excluídas.` });
    } catch (err) {
        res.status(500).json({ error: `Erro ao limpar requisições DEMO: ${err.message}` });

        }
});

// ================= OM Persistence (In-Memory) =================
// Cria tabela de OMs finalizadas se não existir
// Endpoint para listar OMs em memória por status
// Exemplo: /api/oms?status=pausada  ou  /api/oms?status=em_andamento  ou  /api/oms (todas)
app.get('/api/oms', (req, res) => {
    const { status } = req.query;
    let lista = Object.values(oms);
    if (status) {
        lista = lista.filter(om => om.status === status);
    }
    // Não retorna OMs finalizadas (essas vão para o banco)
    lista = lista.filter(om => om.status !== 'finalizada');
    // Busca qtdlote de cada OM nos registros
    Promise.all(lista.map(async om => {
        let qtdlote = null;
        try {
            const qtdRes = await dbGet('SELECT qtdlote FROM registros WHERE om = ? LIMIT 1', [om.omNumber]);
            qtdlote = qtdRes ? qtdRes.qtdlote : null;
        } catch {}
        return {
            omNumber: om.omNumber,
            status: om.status,
            startTime: om.startTime,
            pausedTime: om.pausedTime,
            endTime: om.endTime,
            pauseStartedAt: om.pauseStartedAt,
            qtdlote
        };
    })).then(result => res.json(result));
});
const _t_oms = setTimeout(async () => {
    if (typeof dbRun === 'function') {
        await dbRun(`CREATE TABLE IF NOT EXISTS oms_finalizadas (
            omNumber TEXT PRIMARY KEY,
            startTime INTEGER,
            endTime INTEGER,
            pausedTime INTEGER,
            qtdlote INTEGER
        )`);
    }
}, 1500);
if (typeof _t_oms.unref === 'function') _t_oms.unref();

// Salva OM finalizada no banco
async function salvarOMFinalizada(omNumber) {
    const om = oms[omNumber];
    if (!om || om.status !== 'finalizada') return;
    // Busca qtdlote
    const qtdRes = await dbGet('SELECT qtdlote FROM registros WHERE om = ? LIMIT 1', [omNumber]);
    await dbRun(`INSERT OR REPLACE INTO oms_finalizadas (omNumber, startTime, endTime, pausedTime, qtdlote) VALUES (?, ?, ?, ?, ?)`, [
        om.omNumber,
        om.startTime,
        om.endTime,
        om.pausedTime || 0,
        qtdRes ? qtdRes.qtdlote : null
    ]);
}
// Estrutura: { omNumber: { omNumber, startTime, pausedTime, endTime, status, pauseStartedAt } }
const oms = {};

function getElapsed(om) {
    if (!om) return 0;
    if (om.status === 'finalizada') {
        return (om.endTime - om.startTime - (om.pausedTime || 0));
    }
    let now = Date.now();
    let paused = om.pausedTime || 0;
    if (om.status === 'pausada' && om.pauseStartedAt) {
        paused += (now - om.pauseStartedAt);
    }
    return (now - om.startTime - paused);
}

// POST /api/om/start
app.post('/api/om/start', (req, res) => {
    const { omNumber } = req.body;
    if (!omNumber) return res.status(400).json({ error: 'omNumber obrigatório' });
    if (oms[omNumber] && oms[omNumber].status !== 'finalizada') {
        return res.status(400).json({ error: 'Já existe OM em andamento com esse número' });
    }
    oms[omNumber] = {
        omNumber,
        startTime: Date.now(),
        pausedTime: 0,
        status: 'em_andamento',
        endTime: null,
        pauseStartedAt: null
    };
    console.log(`[OM] Iniciada: ${omNumber}`);
    res.json({ ...oms[omNumber], elapsed: 0 });
});

// GET /api/om/:omNumber
app.get('/api/om/:omNumber', (req, res) => {
    const { omNumber } = req.params;
    const om = oms[omNumber];
    if (!om) return res.status(404).json({ error: 'OM não encontrada' });
    let elapsed = getElapsed(om);
    res.json({
        omNumber: om.omNumber,
        status: om.status,
        startTime: om.startTime,
        pausedTime: om.pausedTime,
        endTime: om.endTime,
        elapsed
    });
});

// PUT /api/om/pause
app.put('/api/om/pause', (req, res) => {
    const { omNumber } = req.body;
    const om = oms[omNumber];
    if (!om || om.status !== 'em_andamento') {
        return res.status(400).json({ error: 'OM não encontrada ou não está em andamento' });
    }
    om.status = 'pausada';
    om.pauseStartedAt = Date.now();
    console.log(`[OM] Pausada: ${omNumber}`);
    res.json({ ...om, elapsed: getElapsed(om) });
});

// PUT /api/om/resume
app.put('/api/om/resume', (req, res) => {
    const { omNumber } = req.body;
    const om = oms[omNumber];
    if (!om || om.status !== 'pausada') {
        return res.status(400).json({ error: 'OM não encontrada ou não está pausada' });
    }
    if (om.pauseStartedAt) {
        om.pausedTime += (Date.now() - om.pauseStartedAt);
    }
    om.status = 'em_andamento';
    om.pauseStartedAt = null;
    console.log(`[OM] Retomada: ${omNumber}`);
    res.json({ ...om, elapsed: getElapsed(om) });
});

// PUT /api/om/finalizar
app.put('/api/om/finalizar', (req, res) => {
    const { omNumber } = req.body;
    const om = oms[omNumber];
    if (!om || (om.status !== 'em_andamento' && om.status !== 'pausada')) {
        return res.status(400).json({ error: 'OM não encontrada ou já finalizada' });
    }
    if (om.status === 'pausada' && om.pauseStartedAt) {
        om.pausedTime += (Date.now() - om.pauseStartedAt);
        om.pauseStartedAt = null;
    }
    om.status = 'finalizada';
    om.endTime = Date.now();
    console.log(`[OM] Finalizada: ${omNumber}`);
    salvarOMFinalizada(omNumber).then(() => {
        res.json({ ...om, elapsed: getElapsed(om) });
    });
});
// ================= Fim OM Persistence =================

// Endpoint para buscar o tempo de uma OM específica
// Endpoint para buscar o tempo de uma OM específica
app.get('/api/om-time/:omNumber', async (req, res) => {
    const { omNumber } = req.params;
    try {
        const omData = await dbGet('SELECT * FROM oms_finalizadas WHERE omNumber = ?', [omNumber]);
        if (!omData) {
            return res.status(404).json({ error: 'Dados de tempo para esta OM não encontrados.' });
        }
        const elapsed = (omData.endTime - omData.startTime) - (omData.pausedTime || 0);
        // <<< MUDANÇA AQUI >>>
        // Envia o objeto completo em vez de apenas o 'elapsed'
        res.json({ 
            elapsed: elapsed,
            startTime: omData.startTime,
            endTime: omData.endTime
        });
        // <<< FIM DA MUDANÇA >>>
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Endpoint para relatório de inspeções (OMs finalizadas)
// Endpoint para relatório completo de falhas agrupadas por OM
app.get('/api/relatorio-falhas', async (req, res) => {
    try {
        // Parâmetros de paginação e filtros
        const { om, status, dataIni, dataFim, page = 1, limit = 50 } = req.query;
        const cacheKey = JSON.stringify({ om, status, dataIni, dataFim, page, limit });
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        let whereClauses = [];
        let queryParams = [];

        if (om) {
            whereClauses.push("om = ?");
            queryParams.push(om);
        }
        if (status) {
            whereClauses.push("status = ?");
            queryParams.push(status);
        }
        if (dataIni) {
            whereClauses.push("createdAt >= ?");
            queryParams.push(dataIni);
        }
        if (dataFim) {
            whereClauses.push("createdAt <= ?");
            queryParams.push(dataFim);
        }

        // Consulta total para metadados
        let countQuery = 'SELECT COUNT(*) as total FROM registros';
        if (whereClauses.length > 0) {
            countQuery += ' WHERE ' + whereClauses.join(' AND ');
        }
        const countRes = await dbGet(countQuery, queryParams);
        const total = countRes ? (countRes.total || 0) : 0;

        // Consulta paginada
        let query = 'SELECT om, qtdlote, serial, designador, tipoDefeito, pn, descricao, obs, createdAt, status, operador FROM registros';
        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY om, createdAt';
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, Math.min(parseInt(limit, 10), 200));
        const offset = (pageNum - 1) * limitNum;
        query += ` LIMIT ${limitNum} OFFSET ${offset}`;

        const registros = await dbAll(query, queryParams);
        // Agrupa por OM
        const porOM = {};
        for (const r of registros) {
            if (!porOM[r.om]) porOM[r.om] = { om: r.om, qtdlote: r.qtdlote, falhas: [] };
            porOM[r.om].falhas.push({
                pn: r.pn,
                serial: r.serial,
                designador: r.designador,
                tipodefeito: r.tipoDefeito ?? '',
                descricao: r.descricao,
                createdat: r.createdAt ?? '',
                operador: r.operador,
                status: r.status,
                obs: r.obs
            });
        }
        // Retorna como array + metadados
        const result = {
            data: Object.values(porOM),
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        };
        cache.set(cacheKey, result, 60000); // cache por 60s
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/om/relatorio', async (req, res) => {
    try {
        console.log('[OM RELATORIO] Iniciando consulta de OMs finalizadas...');
        const finalizadas = await dbAll('SELECT * FROM oms_finalizadas ORDER BY endTime DESC');
        console.log(`[OM RELATORIO] Encontradas ${finalizadas.length} OMs finalizadas.`);
        const relatorio = [];
        for (const om of finalizadas) {
            console.log(`[OM RELATORIO] Processando OM:`, om);
            const registros = await dbAll('SELECT tipodefeito FROM registros WHERE om = ?', [om.omNumber]);
            console.log(`[OM RELATORIO] Registros encontrados:`, registros);
            relatorio.push({
                omNumber: om.omNumber,
                qtdlote: om.qtdlote || '-',
                tempo: om.endTime && om.startTime ? ((om.endTime - om.startTime - (om.pausedTime || 0)) / 1000).toFixed(0) + 's' : '-',
                defeitos: registros.map(r => r.tipodefeito).filter(Boolean)
            });
        }
        console.log('[OM RELATORIO] Relatório gerado:', relatorio);
        res.json(relatorio);
    } catch (e) {
        console.error('[OM RELATORIO] Erro:', e);
        res.status(500).json({ error: e.message });
    }
});

// =================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =================================================================
async function initApp() {
    // isProduction já foi calculado acima; aqui só referencia

    if (isProduction && process.env.DATABASE_URL) {
        // --- AMBIENTE DE PRODUÇÃO (RENDER) ---
        console.log('Ambiente de produção detectado. Conectando ao PostgreSQL com SSL.');
        const connectionString = process.env.DATABASE_URL;

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: connectionString,
            // Força SSL em produção, que é um requisito do Render.
            ssl: { rejectUnauthorized: false }
        });

        db = pool;
        const convertToPg = (query) => {
            let i = 0;
            return query.replace(/\?/g, () => `$${++i}`);
        };
                dbAll = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows);
                dbGet = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows[0]);
                dbRun = (query, params = []) => pool.query(convertToPg(query), params).then(res => {
            // Garante que lastID funcione para INSERT ... RETURNING id
            const lastID = res.rows[0]?.id || null;
            return { changes: res.rowCount, lastID: lastID };
        });

                // Transação segura usando o mesmo client do pool
                dbTransaction = async (fn) => {
                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');
                        const run = (q, p = []) => client.query(convertToPg(q), p);
                        await fn(run);
                        await client.query('COMMIT');
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        client.release();
                    }
                };

        // Cria as tabelas necessárias se não existirem (PostgreSQL)
        await dbRun(`
            CREATE TABLE IF NOT EXISTS requisicoes (
                id SERIAL PRIMARY KEY,
                om VARCHAR(255) NOT NULL,
                items JSONB NOT NULL,
                status VARCHAR(50) DEFAULT 'pendente',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255)
            );
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'operator'
            );
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS registros (
                id VARCHAR(64) PRIMARY KEY,
                om VARCHAR(255) NOT NULL,
                qtdlote INTEGER,
                serial VARCHAR(255),
                designador VARCHAR(255),
                tipodefeito VARCHAR(255),
                pn VARCHAR(255),
                descricao TEXT,
                obs TEXT,
                createdat TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50),
                operador VARCHAR(255)
            );
        `);
        // Índices para performance de filtros
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_registros_om ON registros (om);`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_registros_status ON registros (status);`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_registros_createdat ON registros (createdat DESC);`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_requisicoes_om ON requisicoes (om);`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_requisicoes_status ON requisicoes (status);`);
        await dbRun(`CREATE INDEX IF NOT EXISTS idx_requisicoes_created_at ON requisicoes (created_at DESC);`);
        console.log('Tabelas e índices de performance verificadas/criadas no PostgreSQL.');
        // Purga automática de DEMO antigos (se configurado)
        const purgeDays = parseInt(process.env.DEMO_AUTO_PURGE_DAYS || '0', 10);
        if (!isNaN(purgeDays) && purgeDays > 0) {
            const cutoff = new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString();
            try {
                const r1 = await dbRun('DELETE FROM registros WHERE om LIKE \"DEMO-%\" AND createdat < ?', [cutoff]);
                const r2 = await dbRun('DELETE FROM requisicoes WHERE om LIKE \"DEMO-%\" AND created_at < ?', [cutoff]);
                console.log(`[purge] Registros DEMO removidos: ${r1.changes || 0}; Requisições DEMO removidas: ${r2.changes || 0}.`);
            } catch (e) {
                console.warn(`[purge] Falha ao purgar DEMO antigos: ${e.message}`);
            }
        }


    } else if (process.env.DATABASE_URL) {
        // --- AMBIENTE DE DESENVOLVIMENTO COM POSTGRESQL LOCAL ---
        console.log('Ambiente de desenvolvimento com DATABASE_URL detectado. Conectando ao PostgreSQL local SEM SSL.');
        const connectionString = process.env.DATABASE_URL;

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: connectionString,
            ssl: false // Desativa SSL para banco de dados local
        });

        db = pool;
        const convertToPg = (query) => {
            let i = 0;
            return query.replace(/\?/g, () => `$${++i}`);
        };
                dbAll = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows);
                dbGet = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows[0]);
                dbRun = (query, params = []) => pool.query(convertToPg(query), params).then(res => {
            const lastID = res.rows[0]?.id || null;
            return { changes: res.rowCount, lastID: lastID };
        });

                dbTransaction = async (fn) => {
                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');
                        const run = (q, p = []) => client.query(convertToPg(q), p);
                        await fn(run);
                        await client.query('COMMIT');
                    } catch (e) {
                        await client.query('ROLLBACK');
                        throw e;
                    } finally {
                        client.release();
                    }
                };

        // Cria as tabelas necessárias se não existirem (PostgreSQL Local)
        await dbRun(`
            CREATE TABLE IF NOT EXISTS requisicoes (
                id SERIAL PRIMARY KEY,
                om VARCHAR(255) NOT NULL,
                items JSONB NOT NULL,
                status VARCHAR(50) DEFAULT 'pendente',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(255)
            );
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'operator'
            );
        `);
        await dbRun(`
            CREATE TABLE IF NOT EXISTS registros (
                id VARCHAR(64) PRIMARY KEY,
                om VARCHAR(255) NOT NULL,
                qtdlote INTEGER,
                serial VARCHAR(255),
                designador VARCHAR(255),
                tipodefeito VARCHAR(255),
                pn VARCHAR(255),
                descricao TEXT,
                obs TEXT,
                createdat TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(50),
                operador VARCHAR(255)
            );
        `);
        console.log('Tabelas requisicoes, users e registros verificadas/criadas no PostgreSQL local.');
        // Purga automática de DEMO antigos (se configurado)
        const purgeDaysDevPg = parseInt(process.env.DEMO_AUTO_PURGE_DAYS || '0', 10);
        if (!isNaN(purgeDaysDevPg) && purgeDaysDevPg > 0) {
            const cutoff = new Date(Date.now() - purgeDaysDevPg * 24 * 60 * 60 * 1000).toISOString();
            try {
                const r1 = await dbRun('DELETE FROM registros WHERE om LIKE \"DEMO-%\" AND createdat < ?', [cutoff]);
                const r2 = await dbRun('DELETE FROM requisicoes WHERE om LIKE \"DEMO-%\" AND created_at < ?', [cutoff]);
                console.log(`[purge] (PG dev) Registros DEMO removidos: ${r1.changes || 0}; Requisições DEMO removidas: ${r2.changes || 0}.`);
            } catch (e) {
                console.warn(`[purge] (PG dev) Falha ao purgar DEMO antigos: ${e.message}`);
            }
        }

        // Seed de desenvolvimento: cria admin padrão se não existir nenhum usuário
        const userCount = await dbGet('SELECT COUNT(*)::int AS c FROM users');
        if (!userCount || userCount.c === 0) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash('123456', salt);
            await dbRun(
                'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
                ['Admin Principal', 'DevAdmin', password_hash, 'admin']
            );
            console.log("Usuário admin inicial criado em PostgreSQL local: DevAdmin / 123456");
        }

    } else {
        // --- AMBIENTE DE DESENVOLVIMENTO PADRÃO (LOCAL COM SQLITE) ---
        console.log('Ambiente de desenvolvimento detectado. Usando SQLite.');
        const dbModule = require('./database');
        db = dbModule.db;
        
        // Espera o banco de dados ser inicializado
        await dbModule.initializeDatabase();

        // Wrapper para remover "RETURNING" que não é suportado pelo SQLite
        const stripReturning = (query) => query.replace(/RETURNING\s+\w+/i, '');

                // Só então define as funções de acesso
        dbAll = (query, params = []) => new Promise((resolve, reject) => {
            db.all(stripReturning(query), params, (err, rows) => err ? reject(err) : resolve(rows));
        });
        dbGet = (query, params = []) => new Promise((resolve, reject) => {
            db.get(stripReturning(query), params, (err, row) => err ? reject(err) : resolve(row));
        });
        dbRun = (query, params = []) => new Promise(function(resolve, reject) {
            db.run(stripReturning(query), params, function(err) { err ? reject(err) : resolve(this); });
        });

                // Transação simples com o mesmo handle do SQLite
                dbTransaction = async (fn) => {
                    await dbRun('BEGIN');
                    try {
                        const run = (q, p = []) => new Promise((resolve, reject) => {
                            db.run(stripReturning(q), p, function(err){ err ? reject(err) : resolve(this); });
                        });
                        await fn(run);
                        await dbRun('COMMIT');
                    } catch(e) {
                        await dbRun('ROLLBACK');
                        throw e;
                    }
                };

        // Cria a tabela de requisições se não existir (SQLite)
        await dbRun(`
            CREATE TABLE IF NOT EXISTS requisicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                om TEXT NOT NULL,
                items TEXT NOT NULL,
                status TEXT DEFAULT 'pendente',
                created_at TEXT NOT NULL,
                created_by TEXT
            );
        `);
        console.log('Tabela "requisicoes" verificada/criada no SQLite.');
        // Purga automática de DEMO antigos (se configurado)
        const purgeDaysSqlite = parseInt(process.env.DEMO_AUTO_PURGE_DAYS || '0', 10);
        if (!isNaN(purgeDaysSqlite) && purgeDaysSqlite > 0) {
            const cutoff = new Date(Date.now() - purgeDaysSqlite * 24 * 60 * 60 * 1000).toISOString();
            try {
                const r1 = await dbRun('DELETE FROM registros WHERE om LIKE \"DEMO-%\" AND createdat < ?', [cutoff]);
                const r2 = await dbRun('DELETE FROM requisicoes WHERE om LIKE \"DEMO-%\" AND created_at < ?', [cutoff]);
                console.log(`[purge] (SQLite) Registros DEMO removidos: ${r1.changes || 0}; Requisições DEMO removidas: ${r2.changes || 0}.`);
            } catch (e) {
                console.warn(`[purge] (SQLite) Falha ao purgar DEMO antigos: ${e.message}`);
            }
        }
    }

    // Retorna o app já inicializado (sem dar listen) para permitir testes que importem e usem request(app)
    return app;
}

async function startServer() {
    await initApp();
    app.listen(PORT, '0.0.0.0', () => {
    console.info(`Servidor rodando na porta ${PORT} (acessível na rede local)`);
    });
}

// Só inicia o servidor quando o arquivo é executado diretamente (node server.js)
if (require.main === module) {
    startServer();
}

// Export para testes: app e initApp
module.exports = { app, initApp, startServer };
