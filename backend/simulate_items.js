const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
const id = process.argv[2] || 'mgv7rpfvbvx79dd623h';

db.get('SELECT om, pn, descricao, designador FROM registros WHERE id = ?', [id], (err, registro) => {
  if (err) { console.error('DB_ERROR', err.message); process.exit(1); }
  if (!registro) { console.error('NOT_FOUND'); process.exit(1); }
  console.log('registro raw:', registro);
  const raw = registro.designador || '';
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const items = [];
  if (parts.length > 1) {
    for (const des of parts) {
      items.push({ pn: registro.pn, descricao: registro.descricao ? `${registro.descricao} (${des})` : des, quantidade_requisitada: 1, quantidade_entregue: 0 });
    }
  } else {
    items.push({ pn: registro.pn, descricao: registro.descricao || 'Sem descrição', quantidade_requisitada: 1, quantidade_entregue: 0 });
  }
  console.log('items:', JSON.stringify(items, null, 2));
  db.close();
});
