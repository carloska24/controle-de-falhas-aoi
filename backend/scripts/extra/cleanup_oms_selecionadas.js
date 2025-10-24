// Script para remover OMs selecionadas por ID (informe os IDs no array)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

// Informe os IDs das OMs a serem removidas abaixo:
const idsParaRemover = [
  // 'id1', 'id2', 'id3'
];

if (idsParaRemover.length === 0) {
  console.log('Nenhum ID informado. Edite o script e adicione os IDs das OMs a serem removidas.');
  db.close();
  process.exit(0);
}

const placeholders = idsParaRemover.map(() => '?').join(',');
db.run(`DELETE FROM registros WHERE id IN (${placeholders})`, idsParaRemover, function(err) {
  if (err) {
    console.error('Erro ao deletar OMs selecionadas:', err.message);
  } else {
    console.log(`OMs selecionadas removidas da tabela registros. Linhas afetadas: ${this.changes}`);
  }
  db.close();
});
