// 📁 server.js (VERSÃO ATUALIZADA)

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

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const setupDatabase = async () => {
  // ATUALIZADO: Adicionado o campo cod_cad
  const createRegistrosTable = `
    CREATE TABLE IF NOT EXISTS registros (
      id TEXT PRIMARY KEY, 
      om TEXT NOT NULL, 
      qtdlote INTEGER NOT NULL, 
      serial TEXT, 
      designador TEXT NOT NULL, 
      tipodefeito TEXT NOT NULL, 
      pn TEXT, 
      cod_cad TEXT,  -- NOVO CAMPO
      obs TEXT, 
      createdat TEXT NOT NULL, 
      status TEXT, 
      operador TEXT
    );`;
  const createUsersTable = `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL DEFAULT 'operator');`;
  
  try {
    await pool.query(createRegistrosTable);
    console.log('Tabela "registros" verificada com sucesso.');
    await pool.query(createUsersTable);
    console.log('Tabela "users" verificada com sucesso.');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  }
};

// ... (toda a parte de autenticação e usuários continua a mesma) ...

app.post('/api/auth/login', async (req, res) => { /* ...código existente... */ });
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => { /* ...código existente... */ });
app.post('/api/users', authenticateToken, isAdmin, async (req, res) => { /* ...código existente... */ });
app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => { /* ...código existente... */ });


// --- ROTAS DE REGISTROS ATUALIZADAS ---

app.get('/api/registros', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY createdat DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/registros', authenticateToken, async (req, res) => {
    const r = req.body;
    // ATUALIZADO: Adicionado cod_cad
    const queryText = `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, cod_cad, obs, createdat, status, operador) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    const values = [r.id, r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.cod_cad, r.obs, r.createdat, r.status, r.operador];
    try {
        await pool.query(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/registros/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    // ATUALIZADO: Adicionado cod_cad
    const queryText = `UPDATE registros SET om = $1, qtdlote = $2, serial = $3, designador = $4, tipodefeito = $5, pn = $6, cod_cad = $7, obs = $8 WHERE id = $9`;
    const values = [r.om, r.qtdlote, r.serial, r.designador, r.tipodefeito, r.pn, r.cod_cad, r.obs, id];
    try {
        const result = await pool.query(queryText, values);
        if (result.rowCount === 0) return res.status(404).json({ message: "Registro não encontrado" });
        res.json({ message: "Registro atualizado com sucesso" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/registros', authenticateToken, async (req, res) => { /* ...código existente... */ });

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  setupDatabase();
});