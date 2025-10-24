const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath);
const maxKeep = parseInt(process.argv[2] || '53', 10);

console.log('Deleting requisicoes with id <', maxKeep);

db.run('DELETE FROM requisicoes WHERE id < ?', [maxKeep], function(err) {
  if (err) { console.error('DELETE_ERROR', err.message); process.exit(1); }
  console.log('Deleted rows:', this.changes);
  db.all('SELECT id, om, items, created_at FROM requisicoes ORDER BY id DESC', [], (err, rows) => {
    if (err) { console.error('SELECT_ERROR', err.message); process.exit(1); }
    console.log('Remaining requisicoes:');
    console.log(JSON.stringify(rows.map(r => ({ id: r.id, om: r.om, items: JSON.parse(r.items), created_at: r.created_at })), null, 2));
    db.close();
  });
});
