const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => { if (err) { console.error('DB_OPEN_ERROR', err.message); process.exit(1); } });

const id = process.argv[2] || '50';

db.get('SELECT id, om, items, created_at FROM requisicoes WHERE id = ?', [id], (err, row) => {
  if (err) { console.error('DB_QUERY_ERROR', err.message); process.exit(1); }
  if (!row) { console.error('NOT_FOUND'); process.exit(1); }
  try {
    const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
    console.log(JSON.stringify({ id: row.id, om: row.om, items }, null, 2));
  } catch (e) { console.error('PARSE_ERROR', e.message); }
  db.close();
});
