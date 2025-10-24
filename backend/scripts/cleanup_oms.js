// Script para remover todas as OMs (registros) do banco SQLite (aoi.db)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run('DELETE FROM registros', function(err) {
    if (err) {
      console.error('Erro ao deletar registros:', err.message);
    } else {
      console.log(`Todas as OMs removidas da tabela registros. Linhas afetadas: ${this.changes}`);
    }
  });
});

db.close();
