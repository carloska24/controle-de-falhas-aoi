// HTTP and concurrent transactions against a disposable PostgreSQL cluster.
// Never reads the local DATABASE_URL or writes to the factory database.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomBytes } = require('node:crypto');
const { startIsolatedPostgres } = require('./lib/isolatedPostgres');

async function main() {
  const db = await startIsolatedPostgres();
  let prisma, server;
  try {
    assert.equal(new URL(db.connectionString).username, 'aoi_test');
    Object.assign(process.env, { DATABASE_URL: db.connectionString, DATABASE_POOL_MAX: '3', NODE_ENV: 'production',
      JWT_SECRET: randomBytes(32).toString('hex'), CORS_ORIGIN: 'http://localhost:3000',
      COOKIE_SECURE: 'false', COOKIE_SAMESITE: 'Lax', COOKIE_DOMAIN: '', DEBUG_ROUTES_ENABLED: 'false', SILENCE_LOGS: 'true' });
    await promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'), env: process.env, timeout: 60000,
    });
    prisma = require('../src/config/prisma');
    const credentials = { username: 'quantity-pilot', password: randomBytes(24).toString('hex') };
    await require('../prisma/seed').createAdmin(prisma, { ADMIN_USERNAME: credentials.username,
      ADMIN_NAME: 'Ensaio de quantidades', ADMIN_PASSWORD: credentials.password });
    const { app, initApp } = require('../server');
    await initApp();
    server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie;
    async function api(method, endpoint, body, expected = 200) {
      const response = await fetch(base + endpoint, { method, headers: {
        'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
      }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      assert.ok([expected].flat().includes(response.status), `${method} ${endpoint}: ${response.status} ${JSON.stringify(data)}`);
      return { response, data };
    }
    const login = await api('POST', '/api/auth/login', credentials);
    cookie = login.response.headers.get('set-cookie').split(';')[0];
    await api('POST', '/api/om/start', { omNumber: '011452', qtdLote: 10 });
    const record = (id, designador = 'R1,R2,R3') => ({ id, om: '011452', omVersion: 0,
      qtdlote: 10, serial: 'SERIAL-' + id, designador, pn: 'A10560', descricao: 'Resistor 10k',
      tipodefeito: 'Ausente', prioridade: 'media' });
    await api('POST', '/api/registros/batch', [record('group')], 201);
    assert.equal(await prisma.placas_inspecionadas.count(), 1);
    let rows = (await api('GET', '/api/registros')).data.data;
    assert.equal(rows[0].designador, 'R1, R2, R3');
    assert.equal(rows[0].materialRequisitado, false);
    const created = (await api('POST', '/api/requisicoes', { registroIds: ['group'], quantidade: 999 }, 201)).data;
    const requestId = created.requisicaoIds[0];
    const getRequest = async () => (await api('GET', '/api/requisicoes')).data.data.find(row => row.id === requestId);
    assert.equal((await getRequest()).items[0].quantidade_requisitada, 3);
    const repeated = (await api('POST', '/api/requisicoes', { registroIds: ['group'] })).data;
    assert.equal(repeated.summary.createdRecords, 0);
    assert.equal(await prisma.requisicoes.count(), 1);
    await api('PUT', '/api/registros/group', { version: 0, designador: 'R1' }, 409);
    await api('PUT', '/api/registros/group', { version: 0, pn: 'OTHER' }, 409);
    await api('PUT', '/api/registros/group', { version: 0, designador: 'R3;R2 R1', obs: 'Conferido' });
    rows = (await api('GET', '/api/registros')).data.data;
    assert.equal(rows[0].materialRequisitado, true);
    assert.equal(rows[0].version, 1);
    const partial = (await api('PUT', `/api/requisicoes/${requestId}/itens`, {
      version: 0, items: [{ pn: 'A10560', quantidade_entregue: 2 }],
    })).data;
    assert.equal(partial.status, 'parcialmente_entregue');
    const complete = (await api('PUT', `/api/requisicoes/${requestId}/itens`, {
      version: 1, items: [{ pn: 'A10560', quantidade_entregue: 3 }],
    })).data;
    assert.equal(complete.status, 'entregue');
    assert.equal(await prisma.eventos_entrega.count(), 2);
    await api('POST', '/api/registros/batch', [record('invalid', 'R1-R3')], 400);
    assert.equal(await prisma.registros.count(), 1);

    for (let i = 0; i < 5; i++) {
      const id = 'concurrent-' + i;
      await api('POST', '/api/registros/batch', [record(id)], 201);
      const [requested, edited] = await Promise.all([
        api('POST', '/api/requisicoes', { registroIds: [id] }, 201),
        api('PUT', '/api/registros/' + id, { version: 0, designador: 'R1' }, [200, 409]),
      ]);
      const request = await prisma.requisicoes.findUnique({ where: { id: requested.data.requisicaoIds[0] } });
      const current = await prisma.registros.findUnique({ where: { id } });
      const quantity = JSON.parse(request.items)[0].quantidade_requisitada;
      assert.equal(quantity, current.designador === 'R1' ? 1 : 3);
      if (edited.response.status === 409) assert.equal(quantity, 3);
    }
    console.log('MATERIAL_QUANTITY_POSTGRES_OK: 3 positions, 1 board, idempotent request, partial/full delivery and 5 concurrent edit/request pairs');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (prisma) await prisma.$disconnect();
    await db.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
