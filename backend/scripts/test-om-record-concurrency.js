// Concorrência real em cluster descartável próprio. Não lê DATABASE_URL do .env.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { startIsolatedPostgres } = require('./lib/isolatedPostgres');

async function main() {
  const db = await startIsolatedPostgres();
  let prisma, server, control;
  const pending = new Set();
  try {
    const address = new URL(db.connectionString);
    assert.equal(address.hostname, '127.0.0.1');
    Object.assign(process.env, { DATABASE_URL: db.connectionString, DATABASE_POOL_MAX: '2', NODE_ENV: 'production',
      JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'http://localhost:3000',
      COOKIE_SECURE: 'false', COOKIE_SAMESITE: 'Lax', COOKIE_DOMAIN: '', DEBUG_ROUTES_ENABLED: 'false', SILENCE_LOGS: 'true' });
    await promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'), env: process.env, timeout: 60000,
    });
    prisma = require('../src/config/prisma');
    const credentials = { username: 'native-concurrency', password: randomBytes(20).toString('hex') };
    await require('../prisma/seed').createAdmin(prisma, { ADMIN_USERNAME: credentials.username,
      ADMIN_NAME: 'Concorrência isolada', ADMIN_PASSWORD: credentials.password });
    const { app, initApp } = require('../server');
    await initApp();
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie;
    function api(method, endpoint, body, expected = 200) {
      const request = (async () => {
        const response = await fetch(base + endpoint, { method, headers: {
          'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
        }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
        const data = response.status === 204 ? null : await response.json();
        assert.equal(response.status, expected, `${method} ${endpoint}: ${JSON.stringify(data)}`);
        return { response, data };
      })();
      pending.add(request);
      request.then(() => pending.delete(request), () => pending.delete(request));
      return request;
    }
    cookie = (await api('POST', '/api/auth/login', credentials)).response.headers.get('set-cookie').split(';')[0];
    const { Pool } = require('pg');
    control = new Pool({ connectionString: db.connectionString.replace('aoi-native-app', 'aoi-test-control'), max: 1 });
    const controlClient = await control.connect();
    try {
      // Barreiras de teste fazem cada operação ganhar o lock em ordem conhecida.
      // Executadas somente neste cluster recém-criado; não alteram o schema de produção.
      await controlClient.query(`CREATE FUNCTION test_hold_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.om = 'LOCK-SAVE-FIRST' THEN PERFORM pg_advisory_xact_lock(11001); END IF; RETURN NEW; END $$;
        CREATE TRIGGER test_hold_record BEFORE INSERT ON registros FOR EACH ROW EXECUTE FUNCTION test_hold_record();
        CREATE FUNCTION test_hold_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW."omNumber" = 'LOCK-FINISH-FIRST' AND NEW.status = 'finalizada' THEN PERFORM pg_advisory_xact_lock(11002); END IF;
        IF NEW."omNumber" = 'LOCK-PAUSE-FIRST' AND NEW.status = 'pausada' THEN PERFORM pg_advisory_xact_lock(11003); END IF;
        RETURN NEW; END $$;
        CREATE TRIGGER test_hold_transition AFTER UPDATE ON ordens_manufatura FOR EACH ROW EXECUTE FUNCTION test_hold_transition();
        CREATE FUNCTION test_hold_record_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.om = 'LOCK-DELETE' THEN PERFORM pg_advisory_xact_lock(11004); END IF;
        RETURN NEW; END $$;
        CREATE TRIGGER test_hold_record_update AFTER UPDATE ON registros FOR EACH ROW EXECUTE FUNCTION test_hold_record_update();`);
      async function waitForLock(pattern) {
        const until = Date.now() + 3000;
        while (Date.now() < until) {
          const result = await controlClient.query(`SELECT count(*)::int AS count FROM pg_stat_activity
            WHERE application_name = 'aoi-native-app' AND wait_event_type = 'Lock' AND query ILIKE $1`, [pattern]);
          if (result.rows[0].count > 0) return;
          await delay(25);
        }
        throw new Error('A operação não aguardou o lock esperado: ' + pattern);
      }
      async function gated(key, work) {
        await controlClient.query('SELECT pg_advisory_lock($1)', [key]);
        let released = false;
        const release = async () => { if (!released) { await controlClient.query('SELECT pg_advisory_unlock($1)', [key]); released = true; } };
        try { await work(release); } finally { await release(); }
      }
      const record = (om, id, omVersion = 0) => ({ id, om, omVersion, qtdlote: 10, designador: 'R1', pn: 'PN-TEST', tipodefeito: 'Ausente' });

      await api('POST', '/api/om/start', { omNumber: 'LOCK-SAVE-FIRST', qtdLote: 10 });
      await gated(11001, async release => {
        const save = api('POST', '/api/registros/batch', [record('LOCK-SAVE-FIRST', 'SAVE-FIRST')], 201);
        await waitForLock('%INSERT INTO%registros%');
        const finish = api('PUT', '/api/om/finalizar', { omNumber: 'LOCK-SAVE-FIRST' });
        await waitForLock('%UPDATE%ordens_manufatura%');
        await release();
        await Promise.all([save, finish]);
      });
      assert.equal(await prisma.registros.count({ where: { om: 'LOCK-SAVE-FIRST' } }), 1);
      await api('POST', '/api/registros/batch', [record('LOCK-SAVE-FIRST', 'AFTER-FINISH', 1)], 409);
      console.log('PASS: gravação obtém lock primeiro; finalização aguarda seu commit');

      for (const [om, action, key] of [['LOCK-FINISH-FIRST', 'finalizar', 11002], ['LOCK-PAUSE-FIRST', 'pause', 11003]]) {
        await api('POST', '/api/om/start', { omNumber: om, qtdLote: 10 });
        await gated(key, async release => {
          const transition = api('PUT', '/api/om/' + action, { omNumber: om });
          await waitForLock('%UPDATE%ordens_manufatura%');
          const save = api('POST', '/api/registros/batch', [record(om, 'REJECT-' + om)], 409);
          await waitForLock('%SELECT%ordens_manufatura%FOR UPDATE%');
          await release();
          await Promise.all([transition, save]);
        });
        assert.equal(await prisma.registros.count({ where: { om } }), 0);
      }
      console.log('PASS: pausa/finalização obtêm lock primeiro; gravações concorrentes recusadas');
      await api('PUT', '/api/om/resume', { omNumber: 'LOCK-PAUSE-FIRST' });
      await api('POST', '/api/registros/batch', [record('LOCK-PAUSE-FIRST', 'STALE-VERSION')], 409);
      await api('POST', '/api/registros/batch', [record('LOCK-PAUSE-FIRST', 'CURRENT-VERSION', 2)], 201);
      console.log('PASS: pause/resume invalida versão antiga mesmo com OM ativa novamente');

      for (const omNumber of ['BATCH-A', 'BATCH-B']) await api('POST', '/api/om/start', { omNumber, qtdLote: 10 });
      await Promise.all([
        api('POST', '/api/registros/batch', [record('BATCH-A', 'A1'), record('BATCH-B', 'B1')], 201),
        api('POST', '/api/registros/batch', [record('BATCH-B', 'B2'), record('BATCH-A', 'A2')], 201),
      ]);
      await api('POST', '/api/registros/batch', [record('BATCH-A', 'ROLLBACK-FIRST'), record('BATCH-B', 'B1')], 409);
      assert.equal(await prisma.registros.findUnique({ where: { id: 'ROLLBACK-FIRST' } }), null);
      assert.equal(await prisma.registros.count({ where: { om: { in: ['BATCH-A', 'BATCH-B'] } } }), 4);
      console.log('PASS: lotes com OMs em ordem inversa concluem; falha de item reverte o lote');
      await api('POST', '/api/om/start', { omNumber: 'LOCK-DELETE', qtdLote: 10 });
      await api('POST', '/api/registros/batch', [record('LOCK-DELETE', 'DELETE-A'), record('LOCK-DELETE', 'DELETE-B')], 201);
      await gated(11004, async release => {
        const edit = api('PUT', '/api/registros/DELETE-B', { version: 0, serial: 'CORRIGIDO-EM-OUTRO-TERMINAL' });
        await waitForLock('%UPDATE%registros%');
        const deletion = api('DELETE', '/api/registros', { ids: ['DELETE-A', 'DELETE-B'], versions: { 'DELETE-A': 0, 'DELETE-B': 0 } }, 409);
        await waitForLock('%DELETE FROM%registros%');
        await release(); await Promise.all([edit, deletion]);
      });
      assert.equal(await prisma.registros.count({ where: { om: 'LOCK-DELETE' } }), 2);
      assert.equal((await prisma.registros.findUnique({ where: { id: 'DELETE-B' } })).version, 1);
      await api('DELETE', '/api/registros', { ids: ['DELETE-A', 'DELETE-B'], versions: { 'DELETE-A': 0, 'DELETE-B': 1 } }, 204);
      assert.equal(await prisma.registros.count({ where: { om: 'LOCK-DELETE' } }), 0);
      console.log('PASS: edição concorrente impede exclusão da versão não revisada e reverte o lote inteiro');
      console.log('POSTGRES_OM_RECORD_CONCURRENCY_OK');
    } finally {
      await controlClient.query('SELECT pg_advisory_unlock_all()');
      controlClient.release();
    }
  } finally {
    await Promise.allSettled([...pending]);
    if (control) await control.end();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (prisma) await prisma.$disconnect();
    await db.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
