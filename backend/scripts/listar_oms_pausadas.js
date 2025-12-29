// Lista todas as OMs pausadas da tabela oms_pausadas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

db.all('SELECT * FROM oms_pausadas', [], (err, rows) => {
  if (err) {
    console.error('Erro ao listar OMs pausadas:', err.message);
  } else if (rows.length === 0) {
    console.log('📋 Nenhuma OM pausada encontrada.');
  } else {
    console.log(`📋 Total de OMs pausadas: ${rows.length}\n`);
    console.log('─'.repeat(60));
    rows.forEach((row, index) => {
      console.log(`${index + 1}. OM: ${row.omNumber}`);
      console.log(`   Qtd Lote: ${row.qtdlote || 'N/A'}`);
      console.log(`   Iniciada em: ${row.startTime || 'N/A'}`);
      console.log(`   Pausada em: ${row.pausedTime || 'N/A'}`);
      console.log('─'.repeat(60));
    });
  }
  db.close();
});
