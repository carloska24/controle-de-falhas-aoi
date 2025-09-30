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

if (process.env.DATABASE_URL) {
    // Ambiente de Produção (Render com PostgreSQL)
    console.log('Ambiente de produção detectado. Usando PostgreSQL.');
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    db = pool; // Para consistência, embora não seja usado diretamente
    dbAll = (query, params = []) => pool.query(query, params).then(res => res.rows);
    dbGet = (query, params = []) => pool.query(query, params).then(res => res.rows[0]);
    dbRun = (query, params = []) => pool.query(query, params).then(res => ({ changes: res.rowCount, lastID: res.rows[0]?.id }));
} else {
    // Ambiente de Desenvolvimento (Local com SQLite)
    console.log('Ambiente de desenvolvimento detectado. Usando SQLite.');
    const sqliteDb = require('./database');
    db = sqliteDb;
    dbAll = (query, params = []) => new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
    dbGet = (query, params = []) => new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
    });
    dbRun = (query, params = []) => new Promise(function(resolve, reject) {
        db.run(query, params, function(err) { err ? reject(err) : resolve(this); });
    });
}

app.use(cors());
app.use(express.json());

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

// ROTAS DE AUTENTICAÇÃO
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await dbGet("SELECT * FROM users WHERE username = $1", [username]);
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
        // A query agora usa RETURNING para PostgreSQL, mas o lastID ainda funciona para SQLite
        const result = await dbRun("INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id", [name, username, password_hash, role]);
        const newUser = await dbGet("SELECT id, name, username, role FROM users WHERE id = $1", [result.lastID]);
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: "Nome de usuário já cadastrado ou erro no servidor." });
    }
});

app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    if (parseInt(id, 10) === adminId) {
        return res.status(400).json({ error: "Você não pode excluir sua própria conta de administrador." });
    }
    try {
        await dbRun("DELETE FROM users WHERE id = $1", [id]);
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
    const queryText = `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador];
    try {
        await dbRun(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registros/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    const queryText = `UPDATE registros SET om = $1, qtdlote = $2, serial = $3, designador = $4, tipodefeito = $5, pn = $6, descricao = $7, obs = $8 WHERE id = $9`;
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

    try { // A query agora usa $1, $2
        const result = await dbRun(`UPDATE registros SET status = $1 WHERE id = $2`, [status, id]);
        if (result.changes === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Status atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros', authenticateToken, async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ "error": "Nenhum ID fornecido" });
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const queryText = `DELETE FROM registros WHERE id IN (${placeholders})`;
    try {
        const result = await dbRun(queryText, ids);
        res.json({ message: `Registros excluídos: ${result.changes}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});