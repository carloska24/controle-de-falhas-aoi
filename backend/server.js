const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Usamos o 'pg' em vez de 'sqlite3'

const app = express();
const PORT = process.env.PORT || 3000; // Render usa a variável PORT

app.use(cors());
app.use(express.json());

// --- CONEXÃO COM O POSTGRESQL ---
// O Render vai nos dar essa URL através das Environment Variables
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Necessário para conexões com o Render
  }
});

// Função para criar a tabela se ela não existir
const createTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS registros (
      id TEXT PRIMARY KEY,
      om TEXT NOT NULL,
      qtdLote INTEGER NOT NULL,
      serial TEXT,
      designador TEXT NOT NULL,
      tipoDefeito TEXT NOT NULL,
      pn TEXT,
      descricao TEXT,
      obs TEXT,
      createdAt TEXT NOT NULL,
      status TEXT,
      operador TEXT
    );`;
  try {
    await pool.query(queryText);
    console.log('Tabela "registros" verificada com sucesso.');
  } catch (err) {
    console.error('Erro ao criar a tabela:', err);
  }
};

// --- ENDPOINTS DA API ---

app.get('/api/registros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar registros:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/registros', async (req, res) => {
    const r = req.body;
    const queryText = `INSERT INTO registros (id, om, qtdLote, serial, designador, tipoDefeito, pn, descricao, obs, "createdAt", status, operador)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    const values = [r.id, r.om, r.qtdLote, r.serial, r.designador, r.tipoDefeito, r.pn, r.descricao, r.obs, r.createdAt, r.status, r.operador];
    
    try {
        await pool.query(queryText, values);
        res.status(201).json({ id: r.id });
    } catch (err) {
        console.error('Erro ao criar registro:', err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/registros/:id', async (req, res) => {
    const { id } = req.params;
    const r = req.body;
    const queryText = `UPDATE registros SET
                        om = $1, qtdLote = $2, serial = $3, designador = $4, tipoDefeito = $5,
                        pn = $6, descricao = $7, obs = $8
                     WHERE id = $9`;
    const values = [r.om, r.qtdLote, r.serial, r.designador, r.tipoDefeito, r.pn, r.descricao, r.obs, id];

    try {
        const result = await pool.query(queryText, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Registro não encontrado" });
        }
        res.json({ message: "Registro atualizado com sucesso" });
    } catch (err) {
        console.error('Erro ao atualizar registro:', err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/registros', async (req, res) => {
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
        return res.status(400).json({ "error": "Nenhum ID fornecido para exclusão" });
    }
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const queryText = `DELETE FROM registros WHERE id IN (${placeholders})`;

    try {
        const result = await pool.query(queryText, ids);
        res.json({ message: `Registros excluídos: ${result.rowCount}` });
    } catch (err) {
        console.error('Erro ao excluir registros:', err.stack);
        res.status(500).json({ error: err.message });
    }
});


// Inicia o servidor e cria a tabela
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  createTable();
});