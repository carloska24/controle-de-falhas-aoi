// Lista todas as OMs presentes na tabela oms_finalizadas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../aoi.db');
console.log('Caminho absoluto do banco:', dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    console.error('Verifique se o arquivo existe e se há permissões de leitura.');
    process.exit(1);
  }
});

console.log('--- Todas as OMs na tabela oms_finalizadas ---');

db.all('SELECT * FROM oms_finalizadas', [], (err, rows) => {
  if (err) {
    console.error('Erro ao buscar OMs em oms_finalizadas:', err.message);
    db.close();
    process.exit(1);
  }
  if (rows.length === 0) {
    console.log('Nenhuma OM encontrada na tabela oms_finalizadas.');
  } else {
    rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
  }
  db.close();
});
