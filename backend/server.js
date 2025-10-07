// trigger redeploy - 2025-10-07
// Endpoint de manutenção: redefinir senha de um usuário específico (DISPONÍVEL EM PRODUÇÃO)
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
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-padrao';
const DEV_SEED_KEY = process.env.DEV_SEED_KEY || 'local-dev-2024';

// Segurança: exigir um JWT_SECRET válido em produção
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'seu-segredo-super-secreto-padrao')) {
    // Falha logo no startup se estiver mal configurado
    throw new Error('Configuração inválida: defina JWT_SECRET no ambiente de produção.');
}

// --- Lógica de Banco de Dados Dinâmico ---
let db, dbAll, dbGet, dbRun, dbTransaction;

// CORS configurável: em desenvolvimento (sem CORS_ORIGIN) libera geral; em produção, exige CORS_ORIGIN
const corsOrigin = process.env.CORS_ORIGIN;
if (!isProduction && !corsOrigin) {
    app.use(cors());
} else if (corsOrigin) {
    const allowed = corsOrigin.split(',').map(s => s.trim());
    app.use(cors({ origin: allowed }));
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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  if (token == null) return res.sendStatus(401); 

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
        res.json({ token, user: tokenPayload });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
app.get('/api/registros', authenticateToken, async (req, res) => {
    try {
        let registros;
        if (req.user && req.user.role === 'admin') {
                registros = await dbAll('SELECT * FROM registros ORDER BY createdat DESC');
        } else {
                registros = await dbAll("SELECT * FROM registros WHERE om NOT LIKE 'DEMO-%' ORDER BY createdat DESC");
        }
        res.json(registros);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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

// =================================================================
// ROTAS DE REQUISIÇÃO (ALMOXARIFADO)
// =================================================================
app.post('/api/requisicoes', authenticateToken, validate(requisicoesCreateSchema), async (req, res) => {
    // Apenas admin e almoxarifado podem criar requisições
    if (!['admin','almoxarifado'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Apenas administradores e almoxarifado podem criar requisições.' });
    }
    const { registroIds } = req.body;
    const created_by = req.user.name || req.user.username;

    // registroIds já validado pelo schema

    try {
        const placeholders = registroIds.map(() => '?').join(','); // Cria placeholders como ?,?,?
        const registros = await dbAll(`SELECT om, pn, descricao FROM registros WHERE id IN (${placeholders})`, registroIds);

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

            const items = registrosDaOM.map(registro => ({
                pn: registro.pn,
                descricao: registro.descricao || 'Sem descrição',
                quantidade_requisitada: 1,
                quantidade_entregue: 0
            }));

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
        const isAdminUser = req.user && req.user.role === 'admin';
        const sql = isAdminUser
            ? 'SELECT * FROM requisicoes ORDER BY created_at DESC'
            : "SELECT * FROM requisicoes WHERE om NOT LIKE 'DEMO-%' ORDER BY created_at DESC";
        const requisicoes = await dbAll(sql);
        // O campo 'items' é armazenado como TEXT/JSON, então precisamos fazer o parse.
        const requisicoesComItems = requisicoes.map(r => ({
            ...r,
            // Para PostgreSQL (JSON/JSONB), r.items já é um objeto.
            // Para SQLite (TEXT), r.items é uma string que precisa de parse.
            items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items
        }));
        res.json(requisicoesComItems);
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

app.delete('/api/requisicoes/:id', authenticateToken, isAdmin, async (req, res) => {
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

// =================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =================================================================
async function startServer() {
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
        console.log('Tabelas requisicoes, users e registros verificadas/criadas no PostgreSQL.');
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

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

startServer();
