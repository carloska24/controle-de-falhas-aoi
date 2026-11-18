const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, Error, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/actionConfirmation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { createActionConfirmation, snapshotRecordSelection } = context.exports;
function setup(onConfirm) {
  const flow = createActionConfirmation();
  let state;
  const detach = flow.subscribe(next => state = next);
  const request = { title: 'Excluir', description: 'Sem desfazer', confirmLabel: 'Excluir', onConfirm };
  return { flow, request, detach, get state() { return state; } };
}
test('opening and cancelling a review never sends the destructive action', async () => {
  let calls = 0; const env = setup(async () => calls++);
  env.flow.open(env.request); assert.equal(calls, 0);
  env.flow.cancel(); await env.flow.confirm();
  assert.equal(calls, 0); assert.equal(env.state.request, null);
});
test('a pending confirmation freezes the target and cannot be dismissed or submitted twice', async () => {
  let release; let calls = 0;
  const env = setup(() => { calls++; return new Promise(resolve => release = resolve); });
  env.flow.open(env.request);
  assert.equal(env.flow.open({ ...env.request, title: 'Outra seleção' }), false);
  const pending = env.flow.confirm();
  assert.equal(env.flow.cancel(), false);
  await env.flow.confirm(); assert.equal(calls, 1); assert.equal(env.state.busy, true);
  release(); await pending; assert.equal(env.state.request, null);
});
test('a rejected operation keeps the reviewed target and prevents a blind retry', async () => {
  let calls = 0; const env = setup(async () => { calls++; throw new Error('Registro vinculado a material'); });
  env.flow.open(env.request); await env.flow.confirm();
  assert.match(env.state.error, /vinculado/); assert.equal(env.state.request, env.request);
  assert.equal(env.state.busy, false); await env.flow.confirm(); assert.equal(calls, 1);
  env.flow.cancel(); assert.equal(env.state.request, null);
});
test('completion after unmount does not close a newer confirmation', async () => {
  let release; const env = setup(() => new Promise(resolve => release = resolve));
  env.flow.open(env.request); const pending = env.flow.confirm();
  env.detach(); let latest; env.flow.subscribe(next => latest = next);
  const newer = { ...env.request, title: 'Novo contexto' }; env.flow.open(newer);
  release(); await pending; assert.equal(latest.request, newer); assert.equal(latest.busy, false);
});
test('a hung action releases the dialog with an uncertain result and no automatic retry', async () => {
  const flow = createActionConfirmation({ timeoutMs: 5 });
  let state, signal, calls = 0;
  flow.subscribe(next => state = next);
  flow.open({ title: 'Excluir', onConfirm: nextSignal => { signal = nextSignal; calls++; return new Promise(() => {}); } });
  await flow.confirm();
  assert.equal(state.busy, false); assert.match(state.error, /pode ter sido concluída/);
  assert.equal(signal.aborted, true); await flow.confirm(); assert.equal(calls, 1);
  assert.equal(flow.cancel(), true);
});
test('the review includes off-page selections with full identifiers and a copied snapshot', () => {
  const records = [{ id: '1', om: 'OM-A', serial: 'SERIAL-COMPLETO-123456789', designador: 'R1' }, { id: '2', om: 'OM-B', serial: 'SN2', designador: 'R2' }];
  const selected = snapshotRecordSelection(records, ['2', '1']);
  assert.equal(selected.length, 2); assert.equal(selected[1].serial, 'SERIAL-COMPLETO-123456789');
  records[0].serial = 'alterado'; assert.equal(selected[1].serial, 'SERIAL-COMPLETO-123456789');
});
test('missing, empty, duplicate or oversized selections cannot enter a confirmation', () => {
  const records = [{ id: '1' }];
  for (const ids of [[], ['missing'], ['1', '1'], Array.from({ length: 201 }, (_, i) => String(i))]) {
    assert.throws(() => snapshotRecordSelection(records, ids));
  }
});
