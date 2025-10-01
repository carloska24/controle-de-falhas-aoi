require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-padrao';

// --- Lógica de Banco de Dados Dinâmico ---
let db, dbAll, dbGet, dbRun;

app.use(cors());
app.use(express.json());

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

// =================================================================
// ROTAS
// =================================================================

// ROTA DE SETUP INICIAL (EMERGÊNCIA)
// Esta rota cria o primeiro admin se NENHUM admin existir no banco de dados.
// Ela se torna inoperante após o primeiro admin ser criado.
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

// ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
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
app.post('/api/users', authenticateToken, isAdmin, async (req, res) => {
    const { name, username, password, role = 'operator' } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: "Nome, nome de usuário e senha são obrigatórios." });
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        // Reintroduzindo RETURNING id, crucial para PostgreSQL. A camada de abstração lida com a compatibilidade.
        const result = await dbRun("INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id", [name, username, password_hash, role]);
        const newUser = await dbGet("SELECT id, name, username, role FROM users WHERE id = ?", [result.lastID]);
        if (!newUser) {
            // Se o RETURNING falhou ou o lastID não funcionou, lança um erro claro.
            throw new Error("Falha ao recuperar o usuário recém-criado. O ID não foi retornado.");
        }
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: "Nome de usuário já cadastrado ou erro no servidor." });
    }
});

app.put('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, username, role, password } = req.body; // Adiciona 'password'

    if (!name || !username || !role) {
        return res.status(400).json({ error: "Nome, nome de usuário e função são obrigatórios." });
    }

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
    const registros = await dbAll('SELECT * FROM registros ORDER BY createdat DESC');
    res.json(registros);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/registros', authenticateToken, async (req, res) => {
    const r = req.body;
    const queryText = `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador];
    try {
        await dbRun(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registros/:id', authenticateToken, async (req, res) => {
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

app.put('/api/registros/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status é obrigatório." });

    try {
        const result = await dbRun(`UPDATE registros SET status = ? WHERE id = ?`, [status, id]);
        if (result.changes === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Status atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros', authenticateToken, async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ "error": "Nenhum ID fornecido" });
    const placeholders = ids.map(() => '?').join(',');
    const queryText = `DELETE FROM registros WHERE id IN (${placeholders})`;
    try {
        const result = await dbRun(queryText, ids);
        res.json({ message: `Registros excluídos: ${result.changes}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =================================================================
// ROTAS DE REQUISIÇÃO (ALMOXARIFADO)
// =================================================================
app.post('/api/requisicoes', authenticateToken, async (req, res) => {
    const { registroIds } = req.body;
    const created_by = req.user.name || req.user.username;

    if (!registroIds || registroIds.length === 0) {
        return res.status(400).json({ error: "Nenhum ID de registro fornecido." });
    }

    try {
        const placeholders = registroIds.map(() => '?').join(',');
        const registros = await dbAll(`SELECT om, pn FROM registros WHERE id IN (${placeholders})`, registroIds);

        if (registros.length === 0) {
            return res.status(404).json({ error: "Nenhum registro válido encontrado para os IDs fornecidos." });
        }

        const om = registros[0].om; // Assume que todos os registros são da mesma OM
        const itemsAgrupados = registros.reduce((acc, r) => {
            if (r.pn) { // Apenas considera registros com Part Number
                acc[r.pn] = (acc[r.pn] || 0) + 1;
            }
            return acc;
        }, {});

        const items = Object.entries(itemsAgrupados).map(([pn, quantidade]) => ({ pn, quantidade }));

        const result = await dbRun(
            "INSERT INTO requisicoes (om, items, created_at, created_by) VALUES (?, ?, ?, ?)",
            [om, JSON.stringify(items), new Date().toISOString(), created_by]
        );
        res.status(201).json({ message: "Requisição criada com sucesso", requisicaoId: result.lastID });
    } catch (err) { res.status(500).json({ error: `Erro ao criar requisição: ${err.message}` }); }
});

// =================================================================
// INICIALIZAÇÃO DO SERVIDOR
// =================================================================
async function startServer() {
    // A variável NODE_ENV é o padrão para diferenciar ambientes. Render a define como 'production'.
    const isProduction = process.env.NODE_ENV === 'production';

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
            // Se o RETURNING falhou ou o lastID não funcionou, lança um erro claro.
            throw new Error("Falha ao recuperar o usuário recém-criado. O ID não foi retornado.");
        }