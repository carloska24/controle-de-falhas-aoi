// Remove OMs da tabela oms_finalizadas por status (finalizada, pausada, etc)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

if (process.argv.length < 3) {
  console.log('Uso: node cleanup_oms_mem_por_status.js <status>');
  process.exit(1);
}
const status = process.argv[2];

db.all('SELECT omNumber FROM oms_finalizadas', [], (err, rows) => {
  if (err) {
    console.error('Erro ao buscar OMs:', err.message);
    db.close();
    process.exit(1);
  }
  if (!rows.length) {
    console.log('Nenhuma OM encontrada na tabela oms_finalizadas.');
    db.close();
    return;
  }
  // Aqui, status é apenas informativo, pois a tabela não salva o status textual, só que está finalizada
  // Portanto, só faz sentido para status 'finalizada'.
  if (status !== 'finalizada') {
    console.log('Apenas OMs finalizadas são persistidas na tabela oms_finalizadas.');
    db.close();
    return;
  }
  db.run('DELETE FROM oms_finalizadas', function(err) {
    if (err) {
      console.error('Erro ao deletar OMs finalizadas:', err.message);
    } else {
      console.log(`Todas as OMs finalizadas removidas da tabela oms_finalizadas. Linhas afetadas: ${this.changes}`);
    }
    db.close();
  });
});
