// Script simples para exportar uma cópia do arquivo SQLite (aoi.db) para um arquivo com timestamp
// Uso: node scripts/export_sqlite.js

const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'aoi.db');
if (!fs.existsSync(DB_PATH)) {
  console.error('Arquivo de banco de dados não encontrado em:', DB_PATH);
  process.exit(2);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(__dirname, '..', `aoi-export-${timestamp}.db`);

try {
  fs.copyFileSync(DB_PATH, dest);
  console.log('Export concluído:', dest);
  process.exit(0);
} catch (e) {
  console.error('Falha ao exportar:', e && e.message);
  process.exit(1);
}
