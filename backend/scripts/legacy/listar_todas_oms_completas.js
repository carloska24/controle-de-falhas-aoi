// Script para listar todas as OMs presentes nas tabelas 'registros' e 'oms_finalizadas'
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

console.log('--- OMs na tabela registros ---');
db.all('SELECT id, omNumber, status FROM registros', [], (err, rows) => {
  if (err) {
    console.error('Erro ao buscar OMs em registros:', err.message);
  } else if (rows.length === 0) {
    console.log('Nenhuma OM encontrada na tabela registros.');
  } else {
    rows.forEach(r => console.log(`id: ${r.id}, omNumber: ${r.omNumber}, status: ${r.status}`));
  }

  console.log('\n--- OMs na tabela oms_finalizadas ---');
  db.all('SELECT id, omNumber, status FROM oms_finalizadas', [], (err2, rows2) => {
    if (err2) {
      console.error('Erro ao buscar OMs em oms_finalizadas:', err2.message);
    } else if (rows2.length === 0) {
      console.log('Nenhuma OM encontrada na tabela oms_finalizadas.');
    } else {
      rows2.forEach(r => console.log(`id: ${r.id}, omNumber: ${r.omNumber}, status: ${r.status}`));
    }
    db.close();
  });
});
