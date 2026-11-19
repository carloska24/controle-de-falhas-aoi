const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, AbortController, setTimeout, clearTimeout, Error };
vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname, '../lib/smtQueue.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { createSmtQueueLoader, filterSmtQueue } = context.exports;
const row = (id, extra = {}) => ({ id, om: '12345678', designador: 'R10', pn: 'PN-A',
  createdat: '2026-11-19T12:00:00Z', tipodefeito: 'Possível Incorreto', ...extra });
const ids = records => Array.from(records, record => record.id);
const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve=a; reject=b; }); return {promise, resolve, reject}; };
function setup(read, extra = {}) {
  const states = [];
  const loader = createSmtQueueLoader({ read, onState: state => states.push(state), ...extra });
  return {loader, states};
}

test('a confirmed empty queue and an initial connection failure are different states', async () => {
  const empty = setup(async () => []);
  await empty.loader.load();
  assert.equal(empty.loader.getState().status, 'ready');
  assert.equal(empty.loader.getState().records.length, 0);
  const failure = setup(async () => { throw Error('Falha de conexão'); });
  await failure.loader.load();
  assert.equal(failure.loader.getState().status, 'error');
  assert.equal(failure.loader.getState().records.length, 0);
  assert.match(failure.loader.getState().error, /conexão/);
  empty.loader.dispose(); failure.loader.dispose();
});

test('a search with no match does not clear the 17 pending records or their count', async () => {
  const {loader} = setup(async () => Array.from({length:17}, (_, index)=>row(String(index))));
  await loader.load();
  assert.equal(filterSmtQueue(loader.getState().records, 'SEM-RESULTADO-AUDITORIA').length, 0);
  assert.equal(loader.getState().records.length, 17);
  assert.equal(filterSmtQueue(loader.getState().records, '').length, 17);
  assert.equal(filterSmtQueue(loader.getState().records, '   ').length, 17);
  loader.dispose();
});

test('search combines OM, designator and PN case-insensitively and trims outer spaces', () => {
  const records = [row('1'), row('2', {om:'87654321',designador:'U2',pn:'PN-B'}), row('3',{pn:undefined})];
  assert.deepEqual(ids(filterSmtQueue(records, ' 87654321 ')), ['2']);
  assert.deepEqual(ids(filterSmtQueue(records, 'u2')), ['2']);
  assert.deepEqual(ids(filterSmtQueue(records, 'pn-a')), ['1']);
  assert.equal(records.length, 3);
});

test('only SMT-pending defects enter the queue and oldest records come first without changing the source', async () => {
  const records = [row('new', {createdat:'2026-11-19T15:00:00Z'}), row('not-smt',{tipodefeito:'Incorreto'}),
    row('old', {createdat:'2026-11-18T10:00:00Z'}), row('invalid',{createdat:'invalid'})];
  const {loader} = setup(async () => records);
  await loader.load();
  assert.deepEqual(ids(loader.getState().records), ['old','new','invalid']);
  assert.deepEqual(ids(records), ['new','not-smt','old','invalid']);
  loader.dispose();
});

test('an update failure preserves the previous snapshot but marks it unavailable until retry succeeds', async () => {
  let unavailable = false;
  const {loader} = setup(async () => { if(unavailable) throw Error('Offline'); return [row('1')]; });
  await loader.load(); unavailable = true;
  await loader.load();
  assert.equal(loader.getState().status, 'error');
  assert.deepEqual(ids(loader.getState().records), ['1']);
  unavailable = false; await loader.load();
  assert.equal(loader.getState().status, 'ready');
  assert.equal(loader.getState().error, '');
  loader.dispose();
});

test('a delayed response cannot replace a newer confirmed queue', async () => {
  const old = deferred(); let calls = 0;
  const {loader} = setup(() => ++calls===1 ? old.promise : Promise.resolve([row('new')]));
  const first = loader.load(); await loader.load();
  old.resolve([row('stale')]); await first;
  assert.deepEqual(ids(loader.getState().records), ['new']);
  loader.dispose();
});

test('disposal aborts and suppresses later results even when the reader ignores cancellation', async () => {
  const late = deferred(); let signal;
  const {loader,states} = setup(current => {signal=current; return late.promise;});
  const pending = loader.load(); loader.dispose();
  late.resolve([row('late')]); await pending;
  assert.equal(signal.aborted, true);
  assert.equal(states.length, 1);
});

test('a hung read reaches a persistent error and a later retry can recover', async () => {
  let first=true;
  const {loader} = setup(() => {if(first){first=false;return new Promise(()=>{});}return Promise.resolve([row('1')]);},{timeoutMs:5});
  await loader.load();
  assert.equal(loader.getState().status, 'error');
  assert.match(loader.getState().error, /tempo de resposta/);
  await loader.load(); assert.equal(loader.getState().status, 'ready');
  loader.dispose();
});

test('an uncertain mutation invalidates the queue and cancels an earlier read', async () => {
  const late = deferred(); const {loader} = setup(()=>late.promise);
  const pending=loader.load(); loader.invalidate('Resultado não confirmado. Atualize a fila.');
  late.resolve([row('stale')]); await pending;
  assert.equal(loader.getState().status,'error');
  assert.match(loader.getState().error,/Atualize/);
  loader.dispose();
});

test('a successful decision removes only its confirmed record and never mutates the supplied data', async () => {
  const records=[row('1'),row('2')]; const {loader}=setup(async()=>records);
  await loader.load();loader.removeConfirmed('1');
  assert.deepEqual(ids(loader.getState().records),['2']);
  assert.deepEqual(ids(records),['1','2']);
  loader.invalidate('Atualize');loader.removeConfirmed('2');
  assert.deepEqual(ids(loader.getState().records),['2']);
  loader.dispose();
});
