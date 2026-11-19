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
        INSERT INTO oms_finalizadas ("omNumber", "startTime", "endTime", "pausedTime", qtdlote) VALUES ('LEGACY-F', 1000, 5000, 100, 30);
        INSERT INTO registros (id, om, designador, tipodefeito, pn, createdat, status) VALUES ('LEGACY-RECORD', 'LEGACY-UNLINKED', 'R0', 'Ausente', 'PN-OLD', '2020-01-01T00:00:00Z', 'pendente');`);
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
    assert.equal(await prisma.ordens_manufatura.count({ where: { rastreamentoInspecao: false } }), 3);
    assert.equal(await prisma.placas_inspecionadas.count(), 0);
    assert.equal((await prisma.ordens_manufatura.findUnique({ where: { omNumber: 'LEGACY-P' } })).elapsedAtPause, 2900n);
    assert.equal((await prisma.registros.findUnique({ where: { id: 'LEGACY-RECORD' } })).om, 'LEGACY-UNLINKED');
    console.log('PASS: baseline e migrações preservam OMs e registros legados');

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

    const record = extra => ({ id: 'REJECTED', om: 'OM-RECORDS', omVersion: 0, qtdlote: 300, serial: 'SERIAL-01', designador: 'R1', tipodefeito: 'Ausente', ...extra });
    await api('POST', '/api/registros/batch', [record({ om: 'OM-INTEGRATION', omVersion: 3 })], 409);
    await api('POST', '/api/registros/batch', [record({ om: 'MISSING-OM' })], 404);
    await api('POST', '/api/registros/batch', [record({ omVersion: undefined })], 400);
    await api('POST', '/api/om/start', { omNumber: 'OM-RECORDS', qtdLote: 300 });
    await api('PUT', '/api/om/pause', { omNumber: 'OM-RECORDS' });
    await api('POST', '/api/registros/batch', [record()], 409);
    await api('PUT', '/api/om/resume', { omNumber: 'OM-RECORDS' });
    await api('POST', '/api/registros/batch', [record()], 409);
    await api('POST', '/api/registros/batch', [record({ omVersion: 2 }), record({ id: 'REJECTED-2', om: 'LEGACY-P' })], 409);
    assert.equal(await prisma.registros.count(), 1);
    console.log('PASS: criação exige OM ativa e versão atual; lote misto recusado sem escrita');

    const rows = Array.from({ length: 251 }, (_, i) => ({ id: `INTEGRATION-${String(i).padStart(4, '0')}`,
      om: 'OM-RECORDS', omVersion: 2, qtdlote: 300, serial: `S-${i}`, designador: `R${i}`, tipodefeito: 'Ausente', pn: 'PN-TEST' }));
    await api('POST', '/api/registros/batch', rows.slice(0, 200), 201);
    await api('POST', '/api/registros/batch', rows.slice(200), 201);
    const first = (await api('GET', '/api/registros?om=OM-RECORDS&limit=200&page=1')).data;
    const second = (await api('GET', '/api/registros?om=OM-RECORDS&limit=200&page=2')).data;
    assert.equal(first.meta.total, 251);
    assert.equal(first.data.length, 200);
    assert.equal(second.data.length, 51);
    assert.equal(new Set([...first.data, ...second.data].map(r => r.id)).size, 251);
    await api('GET', '/api/registros?limit=201', undefined, 400);
    await api('POST', '/api/registros/batch', [record({ id: 'ROLLBACK-FIRST', omVersion: 2 }), record({ id: rows[0].id, omVersion: 2 })], 409);
    assert.equal(await prisma.registros.findUnique({ where: { id: 'ROLLBACK-FIRST' } }), null);
    assert.equal(await prisma.placas_inspecionadas.count({ where: { omNumber: 'OM-RECORDS' } }), 251);
    await api('PUT', '/api/registros/LEGACY-RECORD', { version: 0, obs: 'Histórico preservado' });
    assert.equal((await prisma.registros.findUnique({ where: { id: 'LEGACY-RECORD' } })).om, 'LEGACY-UNLINKED');
    console.log('PASS: 251 registros completos, rollback SQL e histórico legado preservado');

    const report = (await api('GET', '/api/relatorio-falhas/snapshot?om=OM-RECORDS')).data;
    assert.equal(report.meta.complete, true); assert.equal(report.meta.total, 251);
    assert.equal(report.data.length, 251); assert.ok(report.options.oms.includes('LEGACY-UNLINKED'));
    await api('GET', '/api/relatorio-falhas/snapshot?periodo=custom&dataIni=2026-02-30', undefined, 400);
    await api('GET', '/api/relatorio-falhas/snapshot?periodo=custom&dataIni=2026-11-19&dataFim=2026-11-18', undefined, 400);
    const reportDates = ['2026-11-18T02:59:59.999Z', '2026-11-18T03:00:00Z', '2026-11-19T02:59:59.999Z',
      '2026-11-18T23:59:59.999-03:00', '2026-11-19T03:00:00Z', '2026-02-30T12:00:00Z', '2026-11-18T12:00:00'];
    await prisma.registros.createMany({ data: [...reportDates.map((createdat, i) => ({ id: 'REPORT-' + i,
      om: 'REPORT-BOUNDARY', qtdlote: 50, designador: 'R' + i, tipodefeito: 'Ausente', prioridade: 'Média',
      operador: 'Ana %', status: 'pendente', createdat })), { id: 'REPORT-DEMO', om: 'DEMO-REPORT-BOUNDARY', createdat: reportDates[1] }] });
    const dayQuery = '/api/relatorio-falhas/snapshot?periodo=custom&dataIni=2026-11-18&dataFim=2026-11-18';
    const filteredReport = (await api('GET', dayQuery + '&om=REPORT-BOUNDARY&defeito=Ausente&prioridade=media&operador=Ana%20%25&status=pendente')).data;
    assert.equal(filteredReport.meta.total, 4);
    assert.deepEqual(filteredReport.data.map(row => row.id).sort(), ['REPORT-1', 'REPORT-2', 'REPORT-3', 'REPORT-6']);
    assert.equal(filteredReport.data.find(row => row.id === 'REPORT-6').createdat, '2026-11-18T15:00:00.000Z');
    assert.ok(!filteredReport.options.oms.some(om => om.startsWith('DEMO-')));
    const unboundedReport = (await api('GET', '/api/relatorio-falhas/snapshot?om=REPORT-BOUNDARY')).data;
    assert.equal(unboundedReport.meta.total, 7); assert.equal(unboundedReport.meta.invalidDates, 1);
    assert.equal(unboundedReport.data.find(row => row.id === 'REPORT-5').createdat, '');
    assert.equal((await api('GET', dayQuery + '&om=DEMO-REPORT-BOUNDARY')).data.meta.total, 0);
    assert.equal((await api('GET', dayQuery + '&om=DEMO-REPORT-BOUNDARY&demo=true')).data.meta.total, 1);
    assert.equal((await api('GET', '/api/relatorio-falhas/snapshot?om=REPORT-BOUNDARY&operador=INEXISTENTE')).data.meta.total, 0);
    await prisma.registros.deleteMany({ where: { id: { startsWith: 'REPORT-' } } });
    console.log('PASS: relatório completo de 251, filtros combinados, limites de dia em Brasília, datas inválidas e isolamento DEMO');

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
    await api('DELETE', `/api/registros/${rows[0].id}`, { version: 1 }, 409);
    assert.equal((await api('GET', '/api/requisicoes?limit=200')).data.meta.total, 1);
    console.log('PASS: solicitações simultâneas sem duplicação e autoria correta');

    // Reproduz a seleção da primeira página: onze itens elegíveis e um aguardando SMT.
    await api('POST', '/api/om/start', { omNumber: 'OM-REQUEST-PAGE', qtdLote: 50 });
    const requestPageRows = Array.from({ length: 12 }, (_, i) => ({
      id: `REQUEST-PAGE-${String(i).padStart(2, '0')}`, om: 'OM-REQUEST-PAGE', omVersion: 0, qtdlote: 50,
      serial: `REQUEST-${i}`, designador: `R${i}`, pn: 'PN-REQUEST-PAGE', tipodefeito: i === 11 ? 'Possível Incorreto' : 'Ausente',
    }));
    await api('POST', '/api/registros/batch', requestPageRows, 201);
    const requestPage = (await api('GET', '/api/registros?om=OM-REQUEST-PAGE&limit=12&page=1')).data;
    assert.equal(requestPage.data.length, 12);
    const mixedRequest = (await api('POST', '/api/requisicoes', {
      registroIds: requestPage.data.map(record => record.id),
    }, 400)).data;
    assert.deepEqual(mixedRequest.details.invalidRecords, [{
      id: requestPageRows[11].id, reason: 'Defeito Possível Incorreto aguarda conferência SMT.',
    }]);
    assert.equal(await prisma.requisicoes.count(), 1);
    assert.equal(await prisma.requisicao_registros.count(), 2);
    const eligibleRequestBody = { registroIds: requestPage.data.filter(record => record.tipodefeito === 'Ausente').map(record => record.id) };
    const eligibleRequest = (await api('POST', '/api/requisicoes', eligibleRequestBody, 201)).data;
    assert.deepEqual(eligibleRequest.summary, { selectedRecords: 11, createdRecords: 11, existingRecords: 0, createdRequests: 1 });
    const pageRequest = await prisma.requisicoes.findUnique({ where: { id: eligibleRequest.requisicaoIds[0] } });
    assert.deepEqual(JSON.parse(pageRequest.items), [{
      pn: 'PN-REQUEST-PAGE', descricao: null, quantidade_requisitada: 11, quantidade_entregue: 0,
    }]);
    const eligibleRetry = (await api('POST', '/api/requisicoes', eligibleRequestBody)).data;
    assert.deepEqual(eligibleRetry.summary, { selectedRecords: 11, createdRecords: 0, existingRecords: 11, createdRequests: 0 });
    assert.deepEqual(eligibleRetry.requisicaoIds, eligibleRequest.requisicaoIds);
    assert.match(eligibleRetry.message, /Nenhuma requisição nova/);
    assert.equal(await prisma.requisicoes.count(), 2);
    assert.equal(await prisma.requisicao_registros.count(), 13);
    const unchangedPageRequest = await prisma.requisicoes.findUnique({ where: { id: pageRequest.id } });
    assert.equal(JSON.parse(unchangedPageRequest.items)[0].quantidade_requisitada, 11);
    console.log('PASS: seleção mista de página rejeitada; onze elegíveis criam pedido exato e retry não duplica');

    const deletionRows = ['DELETE-A', 'DELETE-B', 'DELETE-C'].map(id => record({ id, omVersion: 2 }));
    await api('POST', '/api/registros/batch', deletionRows, 201);
    await api('DELETE', '/api/registros', { ids: ['DELETE-A'] }, 400);
    await api('DELETE', '/api/registros/DELETE-A', undefined, 400);
    await api('PUT', '/api/registros/DELETE-B', { version: 0, serial: 'CORRIGIDO-EM-OUTRO-TERMINAL' });
    await api('DELETE', '/api/registros', { ids: ['DELETE-A', 'DELETE-B'], versions: { 'DELETE-A': 0, 'DELETE-B': 0 } }, 409);
    assert.ok(await prisma.registros.findUnique({ where: { id: 'DELETE-A' } }));
    await api('DELETE', '/api/registros', { ids: ['DELETE-A', 'MISSING-RECORD'], versions: { 'DELETE-A': 0, 'MISSING-RECORD': 0 } }, 409);
    assert.ok(await prisma.registros.findUnique({ where: { id: 'DELETE-A' } }));
    await api('DELETE', '/api/registros', { ids: ['DELETE-A', rows[0].id], versions: { 'DELETE-A': 0, [rows[0].id]: 1 } }, 409);
    assert.ok(await prisma.registros.findUnique({ where: { id: 'DELETE-A' } }));
    await api('DELETE', '/api/registros/DELETE-B', { version: 0 }, 409);
    await api('DELETE', '/api/registros/DELETE-B', { version: 1 }, 204);
    await api('DELETE', '/api/registros', { ids: ['DELETE-A', 'DELETE-C'], versions: { 'DELETE-A': 0, 'DELETE-C': 0 } }, 204);
    await api('DELETE', '/api/registros', { ids: ['DELETE-A'], versions: { 'DELETE-A': 0 } }, 409);
    assert.equal(await prisma.registros.count({ where: { id: { in: deletionRows.map(row => row.id) } } }), 0);
    console.log('PASS: exclusão exige versões revisadas, reverte lote alterado/ausente/vinculado e só confirma contagem integral');

    const inspectionOM = 'OM-INSPECAO';
    const inspectionPath = `/api/om/${inspectionOM}/inspecoes`;
    const summaryPath = `/api/om/inspecoes/resumo?om=${inspectionOM}`;
    const pass = { serial: '000a', omVersion: 0 };
    await api('POST', '/api/om/start', { omNumber: inspectionOM, qtdLote: 500 });
    await api('POST', inspectionPath, { ...pass, serial: ' ' }, 400);
    assert.deepEqual((await api('POST', inspectionPath, { ...pass, serial: ' 000a ' }, 201)).data,
      { jaRegistrada: false, temFalha: false });
    assert.deepEqual((await api('POST', inspectionPath, pass)).data, { jaRegistrada: true, temFalha: false });
    assert.equal(await prisma.registros.count({ where: { om: inspectionOM } }), 0);
    await api('POST', inspectionPath, { ...pass, serial: '000b' }, 201);
    const inspectionRecord = record({ id: 'AOI-F1', om: inspectionOM, serial: '000b' });
    await api('POST', '/api/registros/batch', [{ ...inspectionRecord, serial: null }], 400);
    await api('POST', '/api/registros/batch', [
      inspectionRecord, { ...inspectionRecord, id: 'AOI-F2', designador: 'R2' },
    ], 201);
    assert.deepEqual((await api('POST', inspectionPath, { ...pass, serial: '000b' })).data,
      { jaRegistrada: true, temFalha: true });
    await api('POST', '/api/registros/batch', [
      { ...inspectionRecord, id: 'AOI-ROLLBACK', serial: '000a' }, inspectionRecord,
    ], 409);
    assert.deepEqual((await api('POST', inspectionPath, pass)).data, { jaRegistrada: true, temFalha: false });
    assert.deepEqual((await api('GET', summaryPath)).data, { inspectedBoards: 0, approvedBoards: 0 });
    await api('PUT', '/api/om/pause', { omNumber: inspectionOM });
    await api('POST', inspectionPath, { ...pass, omVersion: 1 }, 409);
    await api('PUT', '/api/om/resume', { omNumber: inspectionOM });
    await api('POST', inspectionPath, pass, 409);
    await api('PUT', '/api/om/finalizar', { omNumber: inspectionOM });
    await api('POST', inspectionPath, { ...pass, omVersion: 3 }, 409);
    assert.deepEqual((await api('GET', summaryPath)).data, { inspectedBoards: 2, approvedBoards: 1 });
    assert.deepEqual((await api('GET', summaryPath + '&fim=2020-01-01T00:00:00Z')).data,
      { inspectedBoards: 0, approvedBoards: 0 });
    await api('POST', '/api/om/LEGACY-A/inspecoes', pass, 201);
    await api('PUT', '/api/om/finalizar', { omNumber: 'LEGACY-A' });
    assert.deepEqual((await api('GET', '/api/om/inspecoes/resumo?om=LEGACY-A')).data,
      { inspectedBoards: 0, approvedBoards: 0 });
    console.log('PASS: placa sem falha é independente, OM e serial deduplicam, falhas são atômicas e resumo exclui cobertura histórica');

    const deliveryRequest = await prisma.requisicoes.create({ data: {
      om: 'TEST-DELIVERY', created_by: 'Integração',
      items: JSON.stringify([
        { pn: 'PN-A', quantidade_requisitada: 1, quantidade_entregue: 0, designador: 'R1' },
        { pn: 'PN-A', quantidade_requisitada: 9, quantidade_entregue: 0, designador: 'R2' },
      ]),
    } });
    const deliveryPath = '/api/requisicoes/' + deliveryRequest.id;
    const delivered = (version, quantity, motivo) => ({ version, motivo,
      items: [{ pn: 'PN-A', quantidade_entregue: quantity }] });
    await api('PUT', deliveryPath + '/status', { version: 0, status: 'entregue' }, 409);
    await api('PUT', deliveryPath + '/itens', delivered(0, 11), 400);
    await api('PUT', deliveryPath + '/itens', delivered(0, 3));
    await api('PUT', deliveryPath + '/itens', delivered(0, 10), 409);
    await api('PUT', deliveryPath + '/itens', delivered(1, 0), 400);
    await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_delivery_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      RAISE EXCEPTION 'simulated delivery audit failure'; END $$;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_delivery_event BEFORE INSERT ON eventos_entrega FOR EACH ROW EXECUTE FUNCTION fail_delivery_event()');
    await api('PUT', deliveryPath + '/itens', delivered(1, 10), 503);
    assert.equal((await prisma.requisicoes.findUnique({ where: { id: deliveryRequest.id } })).version, 1);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: deliveryRequest.id } }), 1);
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_delivery_event ON eventos_entrega');
    await prisma.$executeRawUnsafe('DROP FUNCTION fail_delivery_event()');
    await api('PUT', deliveryPath + '/itens', delivered(1, 10));
    await api('PUT', deliveryPath + '/itens', delivered(2, 0, 'Correção após conferência física'));
    const history = (await api('GET', deliveryPath + '/entregas')).data.data;
    assert.equal(history.length, 3);
    assert.equal(history[0].motivo, 'Correção após conferência física');
    assert.equal(history[0].antes.items[1].quantidade_entregue, 9);
    assert.equal(history[0].depois.items[1].quantidade_entregue, 0);
    await api('DELETE', deliveryPath, undefined, 400);
    const persisted = await prisma.requisicoes.findUnique({ where: { id: deliveryRequest.id } });
    assert.equal(persisted.status, 'pendente');
    assert.equal(persisted.version, 3);
    assert.deepEqual(JSON.parse(persisted.items).map(item => item.quantidade_requisitada), [1, 9]);
    const races = await Promise.all([1, 2].map(quantity => fetch(base + deliveryPath + '/itens', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(delivered(3, quantity)),
    })));
    assert.deepEqual(races.map(response => response.status).sort(), [200, 409]);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: deliveryRequest.id } }), 4);
    console.log('PASS: entregas parciais, conclusão, correção auditada, rollback e conflito entre terminais');

    await prisma.requisicao_registros.create({ data: { registro_id: rows[20].id, requisicao_id: deliveryRequest.id } });
    const deleteBody = { version: 4, motivo: 'Remoção administrativa de uma requisição de teste' };
    await api('DELETE', deliveryPath, { ...deleteBody, version: 3 }, 409);
    await api('DELETE', deliveryPath, { version: 4 }, 400);
    await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_request_archive() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated archive failure'; END $$;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_request_archive BEFORE INSERT ON exclusoes_requisicoes FOR EACH ROW EXECUTE FUNCTION fail_request_archive()');
    await api('DELETE', deliveryPath, deleteBody, 503);
    assert.equal((await prisma.requisicoes.findUnique({ where: { id: deliveryRequest.id } })).version, 4);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: deliveryRequest.id } }), 4);
    assert.ok(await prisma.requisicao_registros.findUnique({ where: { registro_id: rows[20].id } }));
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_request_archive ON exclusoes_requisicoes');
    await prisma.$executeRawUnsafe('DROP FUNCTION fail_request_archive()');
    await api('DELETE', deliveryPath, deleteBody, 204);
    assert.equal(await prisma.requisicoes.findUnique({ where: { id: deliveryRequest.id } }), null);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: deliveryRequest.id } }), 0);
    assert.equal(await prisma.requisicao_registros.findUnique({ where: { registro_id: rows[20].id } }), null);
    assert.ok(await prisma.registros.findUnique({ where: { id: rows[20].id } }));
    const archived = await prisma.exclusoes_requisicoes.findFirst({ where: { requisicaoId: deliveryRequest.id } });
    assert.equal(archived.motivo, deleteBody.motivo);
    assert.equal(archived.snapshot.entregas.length, 4);
    assert.equal(archived.snapshot.vinculos[0].registro_id, rows[20].id);
    await api('DELETE', deliveryPath, deleteBody, 404);
    assert.equal(await prisma.exclusoes_requisicoes.count({ where: { requisicaoId: deliveryRequest.id } }), 1);
    console.log('PASS: exclusão administrativa arquiva histórico, exige versão/motivo e reverte tudo quando arquivo falha');

    await api('POST', '/api/auth/logout');
    await api('GET', '/api/auth/me', undefined, 401);
    assert.equal(await prisma.registros.count(), 266);
    console.log('PASS: logout revoga cookie reapresentado sem excluir registros');

    // In production logout preserves all data; the opted-in local test environment
    // atomically removes the shared DEMO namespace, including material history.
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_ROUTES_ENABLED = 'true';
    cookie = (await api('POST', '/api/auth/login', credentials)).response.headers.get('set-cookie').split(';')[0];
    const demo = (await api('POST', '/api/debug/populate', { count: 4, clear: false })).data;
    const demoRows = (await api('GET', '/api/registros?om=' + demo.om)).data.data;
    assert.equal(demoRows.length, 4);
    const demoIds = demoRows.filter(row => ['Ausente', 'Danificado', 'Incorreto'].includes(row.tipodefeito)).map(row => row.id);
    const archiveRequestId = (await api('POST', '/api/requisicoes', { registroIds: demoIds }, 201)).data.requisicaoIds[0];
    await api('DELETE', '/api/requisicoes/' + archiveRequestId, { version: 0, motivo: 'Arquivo DEMO para validar limpeza no logout' }, 204);
    const liveRequestId = (await api('POST', '/api/requisicoes', { registroIds: demoIds }, 201)).data.requisicaoIds[0];
    const demoRequest = await prisma.requisicoes.findUnique({ where: { id: liveRequestId } });
    await api('PUT', `/api/requisicoes/${liveRequestId}/itens`, { version: 0, items: JSON.parse(demoRequest.items).map(item => ({
      pn: item.pn, quantidade_entregue: item.quantidade_requisitada,
    })) });
    await prisma.oms_ativas.create({ data: { omNumber: 'DEMO-LEGACY-A', startTime: 1n } });
    await prisma.oms_pausadas.create({ data: { omNumber: 'DEMO-LEGACY-P', startTime: 1n, pauseStartedAt: 2n } });
    await prisma.oms_finalizadas.create({ data: { omNumber: 'DEMO-LEGACY-F', startTime: 1n, endTime: 2n } });
    const adminBeforeCleanup = await prisma.users.findUnique({ where: { username: credentials.username } });
    await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_demo_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD."omNumber" LIKE 'DEMO-%' THEN RAISE EXCEPTION 'simulated cleanup failure'; END IF; RETURN OLD; END $$;`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_demo_cleanup BEFORE DELETE ON ordens_manufatura FOR EACH ROW EXECUTE FUNCTION fail_demo_cleanup()');
    await api('POST', '/api/auth/logout', undefined, 503);
    await api('GET', '/api/auth/me');
    assert.equal((await prisma.users.findUnique({ where: { id: adminBeforeCleanup.id } })).session_version, adminBeforeCleanup.session_version);
    assert.equal(await prisma.registros.count({ where: { om: demo.om } }), 4);
    assert.equal(await prisma.placas_inspecionadas.count({ where: { omNumber: demo.om } }), 4);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: liveRequestId } }), 1);
    assert.equal(await prisma.exclusoes_requisicoes.count({ where: { requisicaoId: archiveRequestId } }), 1);
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_demo_cleanup ON ordens_manufatura');
    await prisma.$executeRawUnsafe('DROP FUNCTION fail_demo_cleanup()');
    const oldCookie = cookie;
    await api('POST', '/api/auth/logout');
    await api('GET', '/api/auth/me', undefined, 401);
    assert.equal(await prisma.registros.count({ where: { om: { startsWith: 'DEMO-' } } }), 0);
    assert.equal(await prisma.requisicoes.count({ where: { om: { startsWith: 'DEMO-' } } }), 0);
    assert.equal(await prisma.eventos_entrega.count({ where: { requisicaoId: liveRequestId } }), 0);
    assert.equal(await prisma.exclusoes_requisicoes.count({ where: { requisicaoId: archiveRequestId } }), 0);
    for (const model of ['ordens_manufatura','placas_inspecionadas','eventos_om','oms_ativas','oms_pausadas','oms_finalizadas']) {
      assert.equal(await prisma[model].count({ where: { omNumber: { startsWith: 'DEMO-' } } }), 0);
    }
    assert.equal(await prisma.registros.count(), 266);
    assert.ok(await prisma.exclusoes_requisicoes.findUnique({ where: { id: archived.id } }));
    assert.equal(await prisma.users.count(), 1);
    cookie = (await api('POST', '/api/auth/login', credentials)).response.headers.get('set-cookie').split(';')[0];
    const nextDemo = (await api('POST', '/api/debug/populate', { count: 1, clear: false })).data;
    const replayed = await fetch(base + '/api/auth/logout', {method:'POST',headers:{Cookie:oldCookie}});
    assert.equal(replayed.status, 200);
    assert.equal(await prisma.registros.count({ where: { om: nextDemo.om } }), 1);
    await api('POST', '/api/auth/logout');
    assert.equal(await prisma.registros.count(), 266);
    console.log('PASS: saída do administrador limpa DEMOs por completo, preserva dados reais e reverte limpeza/sessão em falha; cookie antigo não limpa novos testes');
    console.log('INTEGRATION_ISOLATED_OK');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (prisma) await prisma.$disconnect();
    await db.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
