// Deleta TODAS as OMs pausadas da tabela oms_pausadas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.run('DELETE FROM oms_pausadas', function (err) {
  if (err) {
    console.error('Erro ao deletar OMs pausadas:', err.message);
  } else {
    console.log(`✅ Todas as OMs pausadas removidas. Linhas afetadas: ${this.changes}`);
    console.log('⚠️  IMPORTANTE: Reinicie o backend para aplicar as mudanças!');
  }
  db.close();
});
