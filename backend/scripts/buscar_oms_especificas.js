// Script para buscar OMs específicas (por om/omNumber) nas tabelas 'registros' e 'oms_finalizadas'
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

const omsParaBuscar = ['10', '1000'];

console.log('--- Buscando OMs nas tabelas por om/omNumber ---');

function printRows(tabela, rows) {
  if (rows.length === 0) {
    console.log(`Nenhuma OM encontrada na tabela ${tabela}.`);
    return;
  }
  rows.forEach(r => console.log(`[${tabela}]`, JSON.stringify(r, null, 2)));
}

// Buscar em registros pela coluna 'om'
db.all(
  `SELECT * FROM registros WHERE om IN (${omsParaBuscar.map(() => '?').join(',')})`,
  omsParaBuscar,
  (err, rows) => {
    if (err) {
      console.error('Erro ao buscar OMs em registros:', err.message);
    } else {
      printRows('registros', rows);
    }
    // Buscar em oms_finalizadas pela coluna 'omNumber'
    db.all(
      `SELECT * FROM oms_finalizadas WHERE omNumber IN (${omsParaBuscar.map(() => '?').join(',')})`,
      omsParaBuscar,
      (err2, rows2) => {
        if (err2) {
          console.error('Erro ao buscar OMs em oms_finalizadas:', err2.message);
        } else {
          printRows('oms_finalizadas', rows2);
        }
        db.close();
      }
    );
  }
);

// Script para listar todas as OMs presentes na tabela 'oms_finalizadas'
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
