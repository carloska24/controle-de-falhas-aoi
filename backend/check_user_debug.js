const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'aoi.db');

console.log('Abrindo banco em:', dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    process.exit(1);
  }
});

db.all(
  "SELECT id, username, role, password_hash FROM users WHERE username = 'DevAdmin'",
  [],
  (err, rows) => {
    if (err) {
      console.error('Erro na query:', err.message);
    } else {
      console.log('Usuários encontrados:', JSON.stringify(rows, null, 2));
    }
    db.close();
  }
);
