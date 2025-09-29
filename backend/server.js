require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'seu-segredo-super-secreto-padrao'; 

app.use(cors());
app.use(express.json());

const connectionString = process.env.DATABASE_URL;

// Configuração do banco de dados
const dbConfig = {
  connectionString: connectionString
};

// Adiciona a configuração SSL apenas em ambiente de produção (como no Render)
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = new Pool(dbConfig);

const setupDatabase = async () => {
  const createRegistrosTable = `
    CREATE TABLE IF NOT EXISTS registros (
      id TEXT PRIMARY KEY, om TEXT NOT NULL, qtdlote INTEGER NOT NULL, serial TEXT,
      designador TEXT NOT NULL, tipodefeito TEXT NOT NULL, pn TEXT, descricao TEXT,
      obs TEXT, createdat TEXT NOT NULL, status TEXT, operador TEXT
    );`;
  
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'operator'
    );`;
  
  try {
    await pool.query(createRegistrosTable);
    console.log('Tabela "registros" verificada com sucesso.');
    await pool.query(createUsersTable);
    console.log('Tabela "users" verificada com sucesso.');

    // Verifica se existe algum usuário. Se não, cria um admin padrão.
    const userCheck = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
      console.log('Nenhum usuário encontrado. Criando usuário "admin" padrão...');
      const adminName = 'Administrador';
      const adminUsername = 'admin';
      const adminPassword = 'admin'; // Senha simples para o primeiro acesso
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(adminPassword, salt);
      await pool.query(
        "INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        [adminName, adminUsername, password_hash]
      );
      console.log('Usuário "admin" com senha "admin" criado com sucesso!');
    }
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
};

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
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];
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
        const result = await pool.query('SELECT id, name, username, role FROM users ORDER BY id');
        res.json(result.rows);
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
        const newUser = await pool.query("INSERT INTO users (name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, username, role", [name, username, password_hash, role]);
        res.status(201).json(newUser.rows[0]);
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
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir usuário." });
    }
});

// ROTAS DE REGISTROS (PROTEGIDAS)
app.get('/api/registros', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY createdat DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/registros', authenticateToken, async (req, res) => {
    const r = req.body;
    const queryText = `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, r.createdat, r.status, r.operador];
    try {
        await pool.query(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registros/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    const queryText = `UPDATE registros SET om = $1, qtdlote = $2, serial = $3, designador = $4, tipodefeito = $5, pn = $6, descricao = $7, obs = $8 WHERE id = $9`;
    const values = [r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.descricao, r.obs, id];
    try {
        const result = await pool.query(queryText, values);
        if (result.rowCount === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Registro atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros', authenticateToken, async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) return res.status(400).json({ "error": "Nenhum ID fornecido" });
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const queryText = `DELETE FROM registros WHERE id IN (${placeholders})`;
    try {
        const result = await pool.query(queryText, ids);
        res.json({ message: `Registros excluídos: ${result.rowCount}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  setupDatabase();
});