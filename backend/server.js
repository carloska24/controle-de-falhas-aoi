const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // <-- 1. ADICIONE ESTA LINHA AQUI

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors()); // <-- 2. ADICIONE ESTA LINHA AQUI
app.use(express.json());

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database('./aoi.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

// --- NOSSOS ENDPOINTS DA API ---

// Endpoint para PEGAR (GET) todos os registros
app.get('/api/registros', (req, res) => {
  const sql = "SELECT * FROM registros ORDER BY createdAt DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json(rows);
  });
});

// Endpoint para CRIAR (POST) um novo registro
app.post('/api/registros', (req, res) => {
  const data = req.body;
  const sql = `INSERT INTO registros (id, om, qtdLote, serial, designador, tipoDefeito, pn, descricao, obs, createdAt, status, operador)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [data.id, data.om, data.qtdLote, data.serial, data.designador, data.tipoDefeito, data.pn, data.descricao, data.obs, data.createdAt, data.status, data.operador];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.status(201).json({ "id": data.id });
  });
});

// Endpoint para ATUALIZAR (PUT) um registro existente
app.put('/api/registros/:id', (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const sql = `UPDATE registros SET
                    om = ?, qtdLote = ?, serial = ?, designador = ?, tipoDefeito = ?,
                    pn = ?, descricao = ?, obs = ?
                 WHERE id = ?`;
    const params = [data.om, data.qtdLote, data.serial, data.designador, data.tipoDefeito, data.pn, data.descricao, data.obs, id];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "Registro atualizado com sucesso", "changes": this.changes });
    });
});


// Endpoint para EXCLUIR (DELETE) um ou mais registros
app.delete('/api/registros', (req, res) => {
  const { ids } = req.body;
  if (!ids || ids.length === 0) {
    return res.status(400).json({ "error": "Nenhum ID fornecido para exclusão" });
  }
  
  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM registros WHERE id IN (${placeholders})`;

  db.run(sql, ids, function(err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "message": `Registros excluídos: ${this.changes}` });
  });
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta http://localhost:${PORT}`);
});