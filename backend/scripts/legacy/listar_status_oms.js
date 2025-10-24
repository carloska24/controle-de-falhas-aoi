// Script para listar todos os status distintos das OMs no banco SQLite (aoi.db)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.all('SELECT DISTINCT status FROM registros', [], (err, rows) => {
  if (err) {
    console.error('Erro ao buscar status distintos:', err.message);
    process.exit(1);
  }
  console.log('Status distintos encontrados nas OMs:');
  rows.forEach(r => console.log('-', r.status));
  db.close();
});
