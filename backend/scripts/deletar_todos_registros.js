// Deleta todos os registros da tabela 'registros'
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.run('DELETE FROM registros', function(err) {
  if (err) {
    console.error('Erro ao deletar todos os registros:', err.message);
  } else {
    console.log(`Todos os registros removidos da tabela 'registros'. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
