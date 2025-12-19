const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs'); // O projeto usa 'bcrypt' ou 'bcryptjs'? Vou checar package.json, se falhar tento o outro. O server.js usa 'bcrypt'.

// Tentando carregar bcrypt (pode ser nativo ou js)
let bcryptModule;
try {
  bcryptModule = require('bcrypt');
} catch (e) {
  try {
    bcryptModule = require('bcryptjs');
  } catch (e2) {
    console.error('Nenhum módulo bcrypt encontrado.');
    process.exit(1);
  }
}

const dbPath = path.resolve(__dirname, 'aoi.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    process.exit(1);
  }
});

db.get("SELECT password_hash FROM users WHERE username = 'DevAdmin'", [], async (err, row) => {
  if (err) {
    console.error('Erro na query:', err.message);
  } else if (row) {
    const match = await bcryptModule.compare('123456', row.password_hash);
    console.log(`Senha '123456' válida? ${match}`);
  } else {
    console.log('Usuário não encontrado.');
  }
  db.close();
});
