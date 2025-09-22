// Importa a biblioteca do SQLite
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./aoi.db'); // Cria ou conecta ao arquivo do banco

// Inicia o processo de criação da tabela
db.serialize(() => {
  console.log('Iniciando a criação da tabela de registros...');

  // Cria a tabela "registros" se ela ainda não existir
  // As colunas correspondem aos campos do seu formulário
  db.run(`CREATE TABLE IF NOT EXISTS registros (
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
  )`, (err) => {
    if (err) {
      return console.error('Erro ao criar a tabela:', err.message);
    }
    console.log('Tabela "registros" criada ou já existente com sucesso!');
  });
});

// Fecha a conexão com o banco de dados
db.close();