// Remove OMs "iniciadas" da tabela oms_finalizadas (caso existam no futuro)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

// A tabela oms_finalizadas só armazena OMs finalizadas, mas se no futuro armazenar "iniciadas", adapte aqui:
db.run("DELETE FROM oms_finalizadas WHERE status = 'iniciada'", function(err) {
  if (err) {
    console.error('Erro ao deletar OMs iniciadas:', err.message);
  } else {
    console.log(`OMs iniciadas removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
