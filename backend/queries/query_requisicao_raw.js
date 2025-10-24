const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => { if (err) { console.error('DB_OPEN_ERROR', err.message); process.exit(1); } });
const id = process.argv[2] || '54';
db.get('SELECT id, items FROM requisicoes WHERE id = ?', [id], (err, row) => {
  if (err) { console.error('DB_QUERY_ERROR', err.message); process.exit(1); }
  if (!row) { console.error('NOT_FOUND'); process.exit(1); }
  const raw = row.items;
  console.log('id=', row.id);
  console.log('type of items=', typeof raw);
  console.log('length=', raw ? raw.length : 0);
  console.log('startsWith=', raw ? raw.slice(0,200) : '');
  try { console.log('parsed=', JSON.stringify(JSON.parse(raw), null, 2)); } catch(e) { console.error('PARSE_ERROR', e.message); }
  db.close();
});
