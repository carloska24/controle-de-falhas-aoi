// Remove OMs da tabela oms_finalizadas por omNumber ou todas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

// Informe os omNumbers a remover, ou deixe vazio para remover todas
const omsParaRemover = [
  // '00001', '00002'
];

if (omsParaRemover.length === 0) {
  db.run('DELETE FROM oms_finalizadas', function(err) {
    if (err) {
      console.error('Erro ao deletar todas as OMs finalizadas:', err.message);
    } else {
      console.log(`Todas as OMs removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
    }
    db.close();
  });
} else {
  const placeholders = omsParaRemover.map(() => '?').join(',');
  db.run(`DELETE FROM oms_finalizadas WHERE omNumber IN (${placeholders})`, omsParaRemover, function(err) {
    if (err) {
      console.error('Erro ao deletar OMs finalizadas selecionadas:', err.message);
    } else {
      console.log(`OMs selecionadas removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
    }
    db.close();
  });
}
