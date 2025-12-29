// Deleta TODAS as OMs ativas da tabela oms_ativas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.run('DELETE FROM oms_ativas', function (err) {
  if (err) {
    console.error('Erro ao deletar OMs ativas:', err.message);
  } else {
    console.log(`✅ Todas as OMs ativas removidas. Linhas afetadas: ${this.changes}`);
    console.log('⚠️  IMPORTANTE: Reinicie o backend para aplicar as mudanças!');
  }
  db.close();
});
