const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados na raiz do backend
const dbPath = path.resolve(__dirname, '../aoi.db');

console.log('Tentando abrir banco em:', dbPath);

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
  } else {
    query(db);
  }
});

function query(database) {
  // Check columns
  database.all('PRAGMA table_info(registros)', [], (err, rows) => {
    if (err) {
      console.error('Erro ao ler schema:', err);
      return;
    }
    console.log('--- Schema da Tabela "registros" ---');
    console.log(rows.map(c => `${c.name} (${c.type})`).join(', '));

    // Verificar se existe tipodefeito ou tipoDefeito (case issues)
    const hasLower = rows.some(c => c.name === 'tipodefeito');
    const hasCamel = rows.some(c => c.name === 'tipoDefeito');
    console.log('Colunas de defeito encontradas:', { hasLower, hasCamel });

    // Fetch data
    database.all('SELECT * FROM registros ORDER BY createdat DESC LIMIT 5', [], (err, rows) => {
      if (err) {
        console.error('Erro na query de dados:', err);
        return;
      }
      console.log('--- Últimos 5 Registros (Raw JSON) ---');
      console.log(JSON.stringify(rows, null, 2));
    });
  });
}
