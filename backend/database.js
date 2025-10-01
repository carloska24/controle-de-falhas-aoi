// Importa a biblioteca do SQLite
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Define o caminho para o arquivo do banco de dados
const dbPath = path.resolve(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath); // Cria ou conecta ao arquivo do banco

// Funções utilitárias para usar async/await com o sqlite3
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});
const dbGet = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

async function initializeDatabase() {
  const createRegistrosTable = `
  CREATE TABLE IF NOT EXISTS registros (
    id TEXT PRIMARY KEY,
    om TEXT NOT NULL,
    qtdlote INTEGER NOT NULL,
    serial TEXT,
    designador TEXT NOT NULL,
    tipodefeito TEXT NOT NULL,
    pn TEXT,
    descricao TEXT,
    obs TEXT,
    createdat TEXT NOT NULL,
    status TEXT,
    operador TEXT
  )`;

  // SQL para criar a tabela "users"
  const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator'
  )`;

  // SQL para criar a tabela "requisicoes"
  const createRequisicoesTable = `
  CREATE TABLE IF NOT EXISTS requisicoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    om TEXT NOT NULL,
    items TEXT NOT NULL, -- JSON com a lista de {pn, quantidade}
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, separado, entregue
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL
  )`;

  try {
    console.log('Iniciando a inicialização do banco de dados...');
    await dbRun(createRegistrosTable);
    await dbRun(createRequisicoesTable);
    console.log('Tabela "registros" verificada/criada com sucesso!');
    
    // FORÇA A RECRIAÇÃO DA TABELA DE USUÁRIOS PARA RESETAR O AMBIENTE DE DESENVOLVIMENTO
    await dbRun('DROP TABLE IF EXISTS users');
    console.log('Tabela "users" antiga removida (reset de desenvolvimento).');

    await dbRun(createUsersTable);
    console.log('Tabela "users" recriada com sucesso!');

    // Adiciona o usuário admin padrão
    console.log('Criando usuário "admin" padrão...');
    const saltRounds = 10;
    const adminPassword = 'admin';
    const hash = await bcrypt.hash(adminPassword, saltRounds);
    await dbRun('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', ['Administrador', 'admin', hash, 'admin']);
    console.log('Usuário "admin" criado com sucesso!');
    
    console.log('Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('Erro fatal durante a inicialização do banco de dados:', err.message);
    process.exit(1); // Encerra o processo se o DB falhar
  }
}

// Exporta a instância do banco de dados para ser usada em outros módulos
module.exports = { db, initializeDatabase };