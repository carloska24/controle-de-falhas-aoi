// Remove todas as OMs finalizadas da tabela oms_finalizadas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.run('DELETE FROM oms_finalizadas', function(err) {
  if (err) {
    console.error('Erro ao deletar todas as OMs finalizadas:', err.message);
  } else {
    console.log(`Todas as OMs finalizadas removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
