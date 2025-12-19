const fs = require('fs');
const path = require('path');
// As variáveis globais de acesso ao banco
let db, dbAll, dbGet, dbRun, dbTransaction;

const isProduction = process.env.NODE_ENV === 'production';

async function initializeDatabase() {
  if (isProduction && process.env.DATABASE_URL) {
    // --- AMBIENTE DE PRODUÇÃO (RENDER/POSTGRES) ---
    console.log('Ambiente de produção detectado. Conectando ao PostgreSQL com SSL.');
    const connectionString = process.env.DATABASE_URL;

    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
    });

    db = pool;
    const convertToPg = query => {
      let i = 0;
      return query.replace(/\?/g, () => `$${++i}`);
    };
    dbAll = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows);
    dbGet = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows[0]);
    dbRun = (query, params = []) =>
      pool.query(convertToPg(query), params).then(res => {
        const lastID = res.rows[0]?.id || null;
        return { changes: res.rowCount, lastID: lastID };
      });

    dbTransaction = async fn => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const run = (q, p = []) => client.query(convertToPg(q), p);
        await fn(run);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };

    // Inicializa tabelas
    await createTables();
  } else if (process.env.DATABASE_URL) {
    // --- AMBIENTE DE DEV (POSTGRES LOCAL) ---
    console.log('Ambiente de dev (PG) detectado.');
    const connectionString = process.env.DATABASE_URL;
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: connectionString,
      ssl: false,
    });

    db = pool;
    const convertToPg = query => {
      let i = 0;
      return query.replace(/\?/g, () => `$${++i}`);
    };
    dbAll = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows);
    dbGet = (query, params = []) => pool.query(convertToPg(query), params).then(res => res.rows[0]);
    dbRun = (query, params = []) =>
      pool.query(convertToPg(query), params).then(res => {
        const lastID = res.rows[0]?.id || null;
        return { changes: res.rowCount, lastID: lastID };
      });

    dbTransaction = async fn => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const run = (q, p = []) => client.query(convertToPg(q), p);
        await fn(run);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };

    await createTables();
    await seedDevAdmin();
  } else {
    // --- AMBIENTE PADRÃO (SQLITE) ---
    console.log('Ambiente de desenvolvimento (SQLite) detectado.');
    // Nota: O require('./database') original do server.js referia-se a um arquivo antigo ou local.
    // Vamos usar sqlite3 diretamente aqui.
    const sqlite3 = require('sqlite3').verbose();
    const DB_PATH = path.resolve(__dirname, '../../aoi.db');

    db = new sqlite3.Database(DB_PATH);

    // Wrapper para Promises
    const stripReturning = query => query.replace(/RETURNING\s+\w+/i, '');

    dbAll = (query, params = []) =>
      new Promise((resolve, reject) => {
        db.all(stripReturning(query), params, (err, rows) => (err ? reject(err) : resolve(rows)));
      });
    dbGet = (query, params = []) =>
      new Promise((resolve, reject) => {
        db.get(stripReturning(query), params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    dbRun = (query, params = []) =>
      new Promise(function (resolve, reject) {
        db.run(stripReturning(query), params, function (err) {
          err ? reject(err) : resolve(this);
        });
      });

    dbTransaction = async fn => {
      await dbRun('BEGIN');
      try {
        const run = (q, p = []) =>
          new Promise((resolve, reject) => {
            db.run(stripReturning(q), p, function (err) {
              err ? reject(err) : resolve(this);
            });
          });
        await fn(run);
        await dbRun('COMMIT');
      } catch (e) {
        await dbRun('ROLLBACK');
        throw e;
      }
    };

    await createTables();
    // Auto purge SQLite specific
    await autoPurgeDemo();
  }
}

async function createTables() {
  // Queries de criação de tabelas (unificadas)
  await dbRun(`CREATE TABLE IF NOT EXISTS requisicoes (
        id ${process.env.DATABASE_URL ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${
    process.env.DATABASE_URL ? '' : 'AUTOINCREMENT'
  },
        om ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} NOT NULL,
        items ${process.env.DATABASE_URL ? 'JSONB' : 'TEXT'} NOT NULL,
        status ${process.env.DATABASE_URL ? 'VARCHAR(50)' : 'TEXT'} DEFAULT 'pendente',
        created_at ${
          process.env.DATABASE_URL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'
        } DEFAULT CURRENT_TIMESTAMP,
        created_by ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'}
    )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS users (
        id ${process.env.DATABASE_URL ? 'SERIAL' : 'INTEGER'} PRIMARY KEY ${
    process.env.DATABASE_URL ? '' : 'AUTOINCREMENT'
  },
        name ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} NOT NULL,
        username ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role ${process.env.DATABASE_URL ? 'VARCHAR(50)' : 'TEXT'} NOT NULL DEFAULT 'operator'
    )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS registros (
        id VARCHAR(64) PRIMARY KEY,
        om ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} NOT NULL,
        qtdlote INTEGER,
        serial ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'},
        designador ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'},
        tipodefeito ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'},
        pn ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'},
        descricao TEXT,
        obs TEXT,
        createdat ${process.env.DATABASE_URL ? 'TIMESTAMP WITH TIME ZONE' : 'TEXT'} NOT NULL,
        status ${process.env.DATABASE_URL ? 'VARCHAR(50)' : 'TEXT'},
        operador ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'},
        prioridade ${process.env.DATABASE_URL ? 'VARCHAR(50)' : 'TEXT'}
    )`);

  // Migrações
  try {
    await dbRun(
      `ALTER TABLE registros ADD COLUMN IF NOT EXISTS prioridade ${
        process.env.DATABASE_URL ? 'VARCHAR(50)' : 'TEXT'
      }`
    );
  } catch (e) {}

  await dbRun(`CREATE TABLE IF NOT EXISTS oms_finalizadas (
        omNumber ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} PRIMARY KEY,
        startTime BIGINT,
        endTime BIGINT,
        pausedTime BIGINT,
        qtdlote INTEGER
    )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS oms_pausadas (
        omNumber ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} PRIMARY KEY,
        startTime BIGINT,
        pausedTime BIGINT,
        pauseStartedAt BIGINT,
        elapsedAtPause BIGINT,
        qtdlote INTEGER
    )`);

  // Nova tabela para OMs em andamento (ativas)
  await dbRun(`CREATE TABLE IF NOT EXISTS oms_ativas (
        omNumber ${process.env.DATABASE_URL ? 'VARCHAR(255)' : 'TEXT'} PRIMARY KEY,
        startTime BIGINT,
        pausedTime BIGINT DEFAULT 0,
        qtdlote INTEGER
    )`);

  console.log('Tabelas verificadas/criadas.');
}

async function seedDevAdmin() {
  const bcrypt = require('bcrypt');
  const userCount = await dbGet('SELECT COUNT(*) as c FROM users');
  // Ajuste para retorno do count dependendo do driver
  const count = userCount
    ? userCount.c !== undefined
      ? userCount.c
      : Object.values(userCount)[0]
    : 0;

  if (count == 0) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('123456', salt);
    await dbRun('INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)', [
      'Admin Principal',
      'DevAdmin',
      password_hash,
      'admin',
    ]);
    console.log('Seed Admin criado: DevAdmin / 123456');
  }
}

async function autoPurgeDemo() {
  const purgeDays = parseInt(process.env.DEMO_AUTO_PURGE_DAYS || '0', 10);
  if (!isNaN(purgeDays) && purgeDays > 0) {
    const cutoff = new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      await dbRun('DELETE FROM registros WHERE om LIKE "DEMO-%" AND createdat < ?', [cutoff]);
      await dbRun('DELETE FROM requisicoes WHERE om LIKE "DEMO-%" AND created_at < ?', [cutoff]);
      console.log('Auto-purge de DEMO realizado.');
    } catch (e) {
      console.warn('Falha no auto-purge', e);
    }
  }
}

module.exports = {
  initializeDatabase,
  get db() {
    return db;
  },
  get dbAll() {
    return dbAll;
  },
  get dbGet() {
    return dbGet;
  },
  get dbRun() {
    return dbRun;
  },
  get dbTransaction() {
    return dbTransaction;
  },
};
