// Script para remover OMs por status informado via argumento
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

if (process.argv.length < 3) {
  console.log('Uso: node cleanup_oms_por_status.js <status>');
  process.exit(1);
}
const status = process.argv[2];
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.run('DELETE FROM registros WHERE status = ?', [status], function(err) {
  if (err) {
    console.error('Erro ao deletar OMs:', err.message);
  } else {
    console.log(`OMs com status '${status}' removidas da tabela registros. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
