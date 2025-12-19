// Script para criar ou atualizar o usuário admin diretamente no banco SQLite
// Execute: node create-admin-sqlite.js

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'aoi.db');
const db = new sqlite3.Database(dbPath);

const username = 'DevAdmin';
const password = '123456';
const name = 'Admin Principal';
const role = 'admin';

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

(async () => {
  try {
    // Verifica se o usuário já existe
    const existing = await get(db, 'SELECT id FROM users WHERE username = ?', [username]);

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    if (existing) {
      // Atualiza o usuário existente
      await run(db, 'UPDATE users SET password_hash = ?, name = ?, role = ? WHERE username = ?', [
        password_hash,
        name,
        role,
        username,
      ]);
      console.log(`Usuário ${username} atualizado com sucesso! Senha: ${password}`);
    } else {
      // Cria novo usuário
      await run(db, 'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)', [
        username,
        password_hash,
        name,
        role,
      ]);
      console.log(`Usuário ${username} criado com sucesso! Senha: ${password}`);
    }

    db.close();
  } catch (err) {
    console.error('Erro ao criar/atualizar admin:', err.message);
    db.close();
    process.exit(1);
  }
})();
