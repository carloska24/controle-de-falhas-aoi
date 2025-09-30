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
    tipoDefeito TEXT NOT NULL,
    pn TEXT,
    descricao TEXT,
    obs TEXT,
    createdAt TEXT NOT NULL,
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

  try {
    console.log('Iniciando a inicialização do banco de dados...');
    await dbRun(createRegistrosTable);
    console.log('Tabela "registros" verificada/criada com sucesso!');
    
    // Verifica se a tabela de usuários já existe
    const tableExists = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    if (!tableExists) {
        console.log('Tabela "users" não encontrada, criando...');
        await dbRun(createUsersTable);
        console.log('Tabela "users" criada com sucesso!');
        
        // Cria o usuário admin padrão APENAS na primeira vez que a tabela é criada
        console.log('Criando usuário "admin" padrão...');
        const saltRounds = 10;
        const adminPassword = 'admin';
        const hash = await bcrypt.hash(adminPassword, saltRounds);
        await dbRun('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', ['Administrador', 'admin', hash, 'admin']);
        console.log('Usuário "admin" criado com sucesso!');
    } else {
        console.log('Tabela "users" já existente.');
    }
    
    console.log('Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('Erro fatal durante a inicialização do banco de dados:', err.message);
    process.exit(1); // Encerra o processo se o DB falhar
  }
}

// Exporta a instância do banco de dados para ser usada em outros módulos
module.exports = { db, initializeDatabase };