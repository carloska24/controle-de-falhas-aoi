const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../aoi.db');

const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error(err);
  else query(db);
});

function query(database) {
  database.all(
    'SELECT id, om, createdat FROM registros ORDER BY createdat DESC LIMIT 20',
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('--- Últimos 20 Registros no Banco ---');
      console.log(JSON.stringify(rows, null, 2));
    }
  );
}
