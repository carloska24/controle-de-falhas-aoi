const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/omSync.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { createOMSyncSession, parseOMSnapshot, createOMRequestCoordinator, OMSupersededError } = context.exports;
const snapshot = (status = 'em_andamento', version = 0, extra = {}) => ({ omNumber: 'OM-A', status, version, elapsed: 0, qtdlote: 10, startTime: 1000, endTime: status === 'finalizada' ? 2000 : null, ...extra });
function setup(read, extra = {}) {
  const applied = [], errors = [], recovered = [];
  let revision = 0;
  const session = createOMSyncSession({ omNumber: 'OM-A', read, getRevision: () => revision,
    onSnapshot: (value, changed) => applied.push({ value, changed }), onConnectionLost: e => errors.push(e.message), onRecovered: () => recovered.push(true), ...extra });
  return { session, applied, errors, recovered, advance: () => revision++ };
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('running, external pause, external resume and finalization replace the complete snapshot', async () => {
  const values = [snapshot(), snapshot('pausada', 1, { elapsed: 4500 }), snapshot('em_andamento', 2), snapshot('finalizada', 3)];
  const env = setup(async () => values.shift());
  for (let i = 0; i < 4; i++) await env.session.refresh();
  assert.deepEqual(env.applied.map(x => x.value.status), ['em_andamento', 'pausada', 'em_andamento', 'finalizada']);
  assert.equal(env.applied[2].value.elapsed, 0);
  assert.equal(env.applied[3].value.endTime, 2000);
  env.session.dispose();
});
test('paused OMs remain queryable and unchanged statuses do not refresh lists repeatedly', async () => {
  const env = setup(async () => snapshot('pausada', 1));
  await env.session.refresh(); await env.session.refresh();
  assert.equal(env.applied.length, 2);
  assert.equal(env.applied[0].changed, true);
  assert.equal(env.applied[1].changed, false);
  env.session.dispose();
});
test('a delayed poll cannot overwrite a local command or a new selection', async () => {
  const wait = deferred(); const env = setup(() => wait.promise);
  const pending = env.session.refresh(); env.advance(); wait.resolve(snapshot());
  assert.equal(await pending, null); assert.equal(env.applied.length, 0);
  env.session.dispose();
});
test('disposing a previous OM aborts its request and ignores its late response', async () => {
  const wait = deferred(); let signal;
  const env = setup((_om, current) => { signal = current; return wait.promise; });
  const pending = env.session.refresh(); env.session.dispose(); wait.resolve(snapshot());
  assert.equal(await pending, null); assert.equal(signal.aborted, true); assert.equal(env.errors.length, 0); assert.equal(env.applied.length, 0);
});
test('duplicate polling shares a request; a forced pre-save check replaces an older read', async () => {
  const first = deferred(); let calls = 0;
  const env = setup(() => ++calls === 1 ? first.promise : Promise.resolve(snapshot('pausada', 1)));
  const old = env.session.refresh(); assert.equal(env.session.refresh(), old);
  const latest = await env.session.refresh(true); first.resolve(snapshot()); await old;
  assert.equal(latest.status, 'pausada'); assert.equal(env.applied.length, 1); assert.equal(env.errors.length, 0);
  env.session.dispose();
});
test('outages notify once, preserve the last confirmed snapshot and recover once', async () => {
  let available = true; const env = setup(async () => { if (!available) throw Error('Offline'); return snapshot(); });
  await env.session.refresh(); available = false;
  await env.session.refresh(); await env.session.refresh();
  assert.equal(env.errors.length, 1); assert.equal(env.applied.length, 1);
  available = true; await env.session.refresh(); await env.session.refresh();
  assert.equal(env.recovered.length, 1); assert.equal(env.applied.length, 3);
  env.session.dispose();
});
test('a hung request is bounded even if the read ignores cancellation', async () => {
  let signal; const env = setup((_om, current) => { signal = current; return new Promise(() => {}); }, { timeoutMs: 5 });
  assert.equal(await env.session.refresh(), null); assert.equal(signal.aborted, true); assert.equal(env.errors.length, 1);
  env.session.dispose();
});
test('another OM, invalid state and invalid times cannot replace the selected OM', async () => {
  for (const extra of [{ omNumber: 'OM-B' }, { status: 'unknown' }, { elapsed: -1 }, { version: 0.5 }, { qtdlote: 0 }, { status: 'finalizada', endTime: null }]) {
    assert.throws(() => parseOMSnapshot(snapshot('em_andamento', 0, extra), 'OM-A'), /inválido/);
  }
});
test('an older server version is refused rather than reverting a newer state', async () => {
  const values = [snapshot('pausada', 2), snapshot('em_andamento', 1)];
  const env = setup(async () => values.shift());
  await env.session.refresh(); assert.equal(await env.session.refresh(), null);
  assert.equal(env.applied.length, 1); assert.match(env.errors[0], /antigo/);
  env.session.dispose();
});

function coordinator(read, extra = {}) {
  let revision = 0;
  return createOMRequestCoordinator({ read, getRevision: () => revision, advanceRevision: () => revision++, ...extra });
}
test('selecting A then B never publishes A when A responds last', async () => {
  const a = deferred(), b = deferred();
  const guard = coordinator(url => url === '/A' ? a.promise : b.promise);
  const first = guard.request('/A').catch(error => error);
  const second = guard.request('/B');
  b.resolve({ omNumber: 'B' });
  assert.equal((await second).omNumber, 'B');
  a.resolve({ omNumber: 'A' });
  assert.ok(await first instanceof OMSupersededError);
  assert.equal(guard.isPending(), false);
});
test('a pending command prevents context switches and repeated mutations', async () => {
  const response = deferred(); let calls = 0;
  const guard = coordinator(() => { calls++; return response.promise; });
  const command = guard.request('/pause', { method: 'PUT' });
  await assert.rejects(guard.request('/B'), /Aguarde/);
  await assert.rejects(guard.request('/pause', { method: 'PUT' }), /Aguarde/);
  assert.equal(guard.clearSelection(), false); assert.equal(calls, 1);
  response.resolve(snapshot('pausada', 1));
  assert.equal((await command).status, 'pausada'); assert.equal(guard.isPending(), false);
});
test('clearing a pending selection cancels its response without changing the new context', async () => {
  const response = deferred();
  const guard = coordinator(() => response.promise);
  const selection = guard.request('/A').catch(error => error);
  assert.equal(guard.clearSelection(), true);
  response.resolve(snapshot());
  assert.ok(await selection instanceof OMSupersededError); assert.equal(guard.isPending(), false);
});
test('unmount cancellation prevents a pending command from publishing into a later page', async () => {
  const response = deferred();
  const guard = coordinator(() => response.promise);
  const command = guard.request('/pause', { method: 'PUT' }).catch(error => error);
  guard.cancelAll(); response.resolve(snapshot('pausada', 1));
  assert.ok(await command instanceof OMSupersededError); assert.equal(guard.isPending(), false);
});
test('command timeouts release the coordinator for a subsequent retry', async () => {
  let calls = 0;
  const guard = coordinator(() => ++calls === 1 ? new Promise(() => {}) : Promise.resolve(snapshot()), { timeoutMs: 5 });
  await assert.rejects(guard.request('/A'), /tempo de resposta/);
  assert.equal(guard.isPending(), false);
  assert.equal((await guard.request('/A')).omNumber, 'OM-A');
});
test('polling waits for direct operations instead of invalidating a pending selection', async () => {
  const response = deferred(); let polls = 0;
  const guard = coordinator(() => response.promise);
  const env = setup(async () => { polls++; return snapshot(); }, { canRead: () => !guard.isPending() });
  const selection = guard.request('/A');
  assert.equal(await env.session.refresh(), null); assert.equal(polls, 0);
  response.resolve(snapshot()); await selection;
  assert.equal((await env.session.refresh()).omNumber, 'OM-A'); assert.equal(polls, 1);
  env.session.dispose();
});
