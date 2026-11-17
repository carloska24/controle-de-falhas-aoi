// Cria seu próprio PostgreSQL/PGlite descartável; nunca usa DATABASE_URL do .env.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomBytes } = require('node:crypto');

async function main() {
  const { startPrismaDevServer } = require('@prisma/dev');
  const db = await startPrismaDevServer({ name: 'aoi-integration-isolated', persistenceMode: 'stateless',
    port: 55441, databasePort: 55442, shadowDatabasePort: 55443 });
  let prisma, server;
  try {
    const url = new URL(db.database.connectionString);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === '55442');
    Object.assign(process.env, { DATABASE_URL: db.database.connectionString, DATABASE_POOL_MAX: '1',
      NODE_ENV: 'production', JWT_SECRET: randomBytes(32).toString('hex'),
      CORS_ORIGIN: 'http://localhost:3000', COOKIE_SECURE: 'false', COOKIE_SAMESITE: 'Lax', COOKIE_DOMAIN: '',
      DEBUG_ROUTES_ENABLED: 'false', SILENCE_LOGS: 'true' });

    // Testa migração de um banco legado sem perder registros nem estados existentes.
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      await pool.query(readFileSync(path.join(__dirname, '../prisma/migrations/20261117000000_baseline/migration.sql'), 'utf8'));
      await pool.query(`INSERT INTO oms_ativas ("omNumber", "startTime", "pausedTime", qtdlote) VALUES ('LEGACY-A', 1000, 0, 10);
        INSERT INTO oms_pausadas ("omNumber", "startTime", "pausedTime", "pauseStartedAt", "elapsedAtPause", qtdlote) VALUES ('LEGACY-P', 1000, 100, 4000, 2900, 20);
        INSERT INTO oms_finalizadas ("omNumber", "startTime", "endTime", "pausedTime", qtdlote) VALUES ('LEGACY-F', 1000, 5000, 100, 30);`);
    } finally { await pool.end(); }
    const cli = async args => promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
      cwd: path.join(__dirname, '..'), env: process.env, timeout: 60000,
    });
    await cli(['migrate', 'resolve', '--applied', '20261117000000_baseline']);
    await cli(['migrate', 'deploy']);
    await cli(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']);
    prisma = require('../src/config/prisma');
    assert.equal(await prisma.ordens_manufatura.count(), 3);
    assert.equal(await prisma.oms_ativas.count(), 1);
    assert.equal((await prisma.ordens_manufatura.findUnique({ where: { omNumber: 'LEGACY-P' } })).elapsedAtPause, 2900n);
    console.log('PASS: baseline e migrações preservam OMs legadas');

    const credentials = { username: 'integration-admin', password: randomBytes(18).toString('hex') };
    await require('../prisma/seed').createAdmin(prisma, { ADMIN_USERNAME: credentials.username,
      ADMIN_NAME: 'Integração isolada', ADMIN_PASSWORD: credentials.password });
    const { app, initApp } = require('../server');
    await initApp();
    server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie;
    async function api(method, endpoint, body, expected = 200) {
      const response = await fetch(base + endpoint, { method, headers: {
        'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = response.status === 204 ? null : await response.json();
      assert.equal(response.status, expected, `${method} ${endpoint}: ${JSON.stringify(data)}`);
      return { response, data };
    }
    cookie = (await api('POST', '/api/auth/login', credentials)).response.headers.get('set-cookie').split(';')[0];
    await api('GET', '/health/db');
    await api('POST', '/api/om/start', { omNumber: 'OM-INTEGRATION', qtdLote: 300 });
    // Força falha na auditoria depois do update para provar rollback SQL real.
    await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_test_om_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action = 'pause' THEN RAISE EXCEPTION 'simulated audit failure'; END IF; RETURN NEW; END $$;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_test_om_event BEFORE INSERT ON eventos_om FOR EACH ROW EXECUTE FUNCTION fail_test_om_event()');
    await api('PUT', '/api/om/pause', { omNumber: 'OM-INTEGRATION' }, 503);
    const afterFailure = await prisma.ordens_manufatura.findUnique({ where: { omNumber: 'OM-INTEGRATION' } });
    assert.equal(afterFailure.status, 'em_andamento');
    assert.equal(afterFailure.version, 0);
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_test_om_event ON eventos_om');
    await prisma.$executeRawUnsafe('DROP FUNCTION fail_test_om_event()');
    await api('PUT', '/api/om/pause', { omNumber: 'OM-INTEGRATION' });
    await api('PUT', '/api/om/pause', { omNumber: 'OM-INTEGRATION' }, 409);
    await api('PUT', '/api/om/resume', { omNumber: 'OM-INTEGRATION' });
    await api('PUT', '/api/om/finalizar', { omNumber: 'OM-INTEGRATION' });
    await api('POST', '/api/om/start', { omNumber: 'OM-INTEGRATION' }, 409);
    assert.equal(await prisma.eventos_om.count({ where: { omNumber: 'OM-INTEGRATION' } }), 4);
    console.log('PASS: OM atômica, auditoria, rollback e finalização irreversível');

    const rows = Array.from({ length: 251 }, (_, i) => ({ id: `INTEGRATION-${String(i).padStart(4, '0')}`,
      om: 'OM-INTEGRATION', qtdlote: 300, designador: `R${i}`, tipodefeito: 'Ausente', pn: 'PN-TEST' }));
    await api('POST', '/api/registros/batch', rows.slice(0, 200), 201);
    await api('POST', '/api/registros/batch', rows.slice(200), 201);
    const first = (await api('GET', '/api/registros?limit=200&page=1')).data;
    const second = (await api('GET', '/api/registros?limit=200&page=2')).data;
    assert.equal(first.meta.total, 251);
    assert.equal(first.data.length, 200);
    assert.equal(second.data.length, 51);
    assert.equal(new Set([...first.data, ...second.data].map(r => r.id)).size, 251);
    await api('GET', '/api/registros?limit=201', undefined, 400);
    console.log('PASS: 251 registros completos e paginação validada');

    await api('PUT', `/api/registros/${rows[0].id}`, { obs: 'nova observação', version: 0 });
    await api('PUT', `/api/registros/${rows[0].id}`, { obs: 'versão antiga', version: 0 }, 409);
    await api('PUT', '/api/registros/status/reparado', { ids: [rows[0].id, rows[1].id],
      versions: { [rows[0].id]: 0, [rows[1].id]: 0 } }, 409);
    const unmodified = await prisma.registros.findUnique({ where: { id: rows[1].id } });
    assert.equal(unmodified.status, 'pendente');
    assert.equal(unmodified.version, 0);
    console.log('PASS: edição concorrente recusada e lote revertido integralmente');

    const requestBody = { registroIds: [rows[0].id, rows[1].id] };
    const results = await Promise.all([0, 1].map(async () => {
      const response = await fetch(base + '/api/requisicoes', { method: 'POST', headers: {
        'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(requestBody) });
      assert.ok([200, 201].includes(response.status));
      return response.json();
    }));
    assert.deepEqual(results[0].requisicaoIds, results[1].requisicaoIds);
    assert.equal(await prisma.requisicoes.count(), 1);
    assert.equal(await prisma.requisicao_registros.count(), 2);
    assert.equal((await prisma.requisicoes.findFirst()).created_by, credentials.username);
    await api('DELETE', `/api/registros/${rows[0].id}`, undefined, 409);
    assert.equal((await api('GET', '/api/requisicoes?limit=200')).data.meta.total, 1);
    console.log('PASS: solicitações simultâneas sem duplicação e autoria correta');

    await api('POST', '/api/auth/logout');
    await api('GET', '/api/auth/me', undefined, 401);
    assert.equal(await prisma.registros.count(), 251);
    console.log('PASS: logout revoga cookie reapresentado sem excluir registros');
    console.log('INTEGRATION_ISOLATED_OK');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (prisma) await prisma.$disconnect();
    await db.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
