// Remove OMs específicas da tabela oms_finalizadas (informe os omNumbers)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

// Informe os omNumbers a remover:
const omsParaRemover = [
  '00001', '00002'
];

if (omsParaRemover.length === 0) {
  console.log('Nenhum omNumber informado. Edite o script e adicione os omNumbers das OMs a serem removidas.');
  db.close();
  process.exit(0);
}

const placeholders = omsParaRemover.map(() => '?').join(',');
db.run(`DELETE FROM oms_finalizadas WHERE omNumber IN (${placeholders})`, omsParaRemover, function(err) {
  if (err) {
    console.error('Erro ao deletar OMs específicas:', err.message);
  } else {
    console.log(`OMs específicas removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
