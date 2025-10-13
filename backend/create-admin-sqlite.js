// Script para criar o usuário admin diretamente no banco SQLite
// Execute: node create-admin-sqlite.js

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath);

const username = 'DevAdmin';
const password = '123456';
const name = 'Admin Principal';
const role = 'admin';

(async () => {
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  db.serialize(() => {
    db.run(
      `INSERT OR REPLACE INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      [username, password_hash, name, role],
      function (err) {
        if (err) {
          console.error('Erro ao criar admin:', err.message);
        } else {
          console.log('Usuário admin criado ou atualizado com sucesso!');
        }
        db.close();
      }
    );
  });
})();
