// SQLite database bootstrap for local development
// Exports a shared db connection and an async initializeDatabase() to create tables and seed minimal data.

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Use aoi.db in this backend folder
const DB_PATH = path.join(__dirname, 'aoi.db');

// Open the database connection once and reuse
const db = new sqlite3.Database(DB_PATH);

// Helper to run a statement as a Promise
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function initializeDatabase() {
  // Enforce foreign keys and a few sane defaults
  await run(db, 'PRAGMA foreign_keys = ON;');
  await run(db, 'PRAGMA journal_mode = WAL;');
  await run(db, 'PRAGMA busy_timeout = 5000;');

  // Users table
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator'
    );`
  );

  // Registros table (ids are provided by client as string uids)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS registros (
      id TEXT PRIMARY KEY,
      om TEXT NOT NULL,
      qtdlote INTEGER,
      serial TEXT,
      designador TEXT,
      tipodefeito TEXT,
      pn TEXT,
      descricao TEXT,
      obs TEXT,
      createdat TEXT NOT NULL,
      status TEXT,
      operador TEXT
    );`
  );

  // Requisicoes table (kept in SQLite as TEXT JSON string)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS requisicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      om TEXT NOT NULL,
      items TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      created_at TEXT NOT NULL,
      created_by TEXT
    );`
  );

  // Basic indices helpful for typical queries
  await run(db, `CREATE INDEX IF NOT EXISTS idx_registros_createdat ON registros (createdat DESC);`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_registros_om ON registros (om);`);
  await run(db, `CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);`);

  // Seed: if no users exist, create a default admin to allow first login locally
  const existing = await get(db, 'SELECT id FROM users LIMIT 1');
  if (!existing) {
    const name = 'Admin Principal';
    const username = 'DevAdmin';
    const password = '123456'; // local-dev only default; can be reset later
    const role = 'admin';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    await run(
      db,
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, username, password_hash, role]
    );
    // eslint-disable-next-line no-console
    console.log(`Usuário admin inicial criado: ${username} / ${password}`);
  }
}

module.exports = { db, initializeDatabase };
