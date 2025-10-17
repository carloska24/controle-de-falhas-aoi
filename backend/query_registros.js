const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('DB_OPEN_ERROR', err.message);
    process.exit(1);
  }
});

db.all('SELECT * FROM registros ORDER BY createdat DESC', [], (err, rows) => {
  if (err) {
    console.error('DB_QUERY_ERROR', err.message);
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
