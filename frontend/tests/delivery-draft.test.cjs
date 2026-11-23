const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname, '../lib/deliveryDraft.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { groupDeliveryItems, initialDeliveryDraft, calculateDelivery, createDeliveryReview,
  fillVisibleDelivery, filterDeliveryItems } = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const raw = (pn, requested, delivered, extra = {}) => ({ pn, quantidade_requisitada: requested,
  quantidade_entregue: delivered, descricao: 'Componente ' + pn, ...extra });
const items = () => groupDeliveryItems([raw('PN-A', 10, 4), raw('PN-B', 6, 0), raw('PN-C', 2, 2)]);

test('a new shipment begins at zero and 4 previously delivered plus 3 now becomes 7', () => {
  const list = items();
  const draft = initialDeliveryDraft(list, 'delivery');
  assert.deepEqual(plain(draft), { 'PN-A': '0', 'PN-B': '0', 'PN-C': '0' });
  assert.equal(calculateDelivery(list, draft, 'delivery').changedCount, 0);
  draft['PN-A'] = '3'; draft['PN-B'] = '4';
  const review = createDeliveryReview(list, draft, 'delivery', 8, '');
  assert.deepEqual(plain(review.payload), { version: 8, motivo: '', items: [
    { pn: 'PN-A', quantidade_entregue: 7 }, { pn: 'PN-B', quantidade_entregue: 4 },
    { pn: 'PN-C', quantidade_entregue: 2 },
  ] });
  assert.equal(review.summary.added, 7);
  assert.equal(review.summary.before, 6);
  assert.equal(review.summary.total, 13);
  assert.equal(review.summary.remaining, 5);
  assert.equal(review.summary.changedCount, 2);
  assert.equal(review.summary.status, 'parcialmente_entregue');
  draft['PN-A'] = '6';
  assert.equal(review.payload.items[0].quantidade_entregue, 7, 'review preserves the snapshot');
});

for (const value of ['', '-1', '1.5', '1e2', '7', '9007199254740992', 'abc', ' 3 ']) {
  test(`invalid shipment ${JSON.stringify(value)} is preserved for correction and cannot confirm`, () => {
    const list = items();
    const draft = { ...initialDeliveryDraft(list, 'delivery'), 'PN-A': value };
    const summary = calculateDelivery(list, draft, 'delivery');
    assert.equal(summary.invalid, true);
    assert.equal(summary.rows[0].input, value);
    assert.equal(summary.total, null);
    assert.throws(() => createDeliveryReview(list, draft, 'delivery', 0, ''), /quantidades/);
  });
}

test('visible-only fill preserves edited hidden materials and pending rows remain visible while editing', () => {
  const list = items();
  const draft = { ...initialDeliveryDraft(list, 'delivery'), 'PN-A': '2' };
  const visible = filterDeliveryItems(list, ' pn-b ', true);
  assert.deepEqual(plain(visible.map(item => item.pn)), ['PN-B']);
  const filled = fillVisibleDelivery(list, draft, visible.map(item => item.pn), 'delivery');
  assert.deepEqual(plain(filled), { 'PN-A': '2', 'PN-B': '6', 'PN-C': '0' });
  assert.equal(filterDeliveryItems(list, '', true).length, 2, 'filter uses confirmed pending balance');
  const review = createDeliveryReview(list, filled, 'delivery', 3, '');
  assert.equal(review.summary.changedCount, 2);
  assert.equal(review.payload.items[0].quantidade_entregue, 6);
});

test('correction edits accumulated totals, requires reason for a reduction, and preserves untouched PNs', () => {
  const list = items();
  const draft = initialDeliveryDraft(list, 'correction');
  assert.equal(draft['PN-A'], '4');
  draft['PN-A'] = '2';
  assert.throws(() => createDeliveryReview(list, draft, 'correction', 1, '  '), /motivo/);
  const review = createDeliveryReview(list, draft, 'correction', 1, '  Correção física  ');
  assert.equal(review.payload.motivo, 'Correção física');
  assert.equal(review.payload.items[0].quantidade_entregue, 2);
  assert.equal(review.summary.reduced, 2);
  assert.equal(review.summary.added, 0);
  assert.throws(() => createDeliveryReview(list, draft, 'correction', 1, 'x'.repeat(501)), /500/);
});

test('completing balances derives delivered status without treating the old total as a new shipment', () => {
  const list = items();
  const draft = fillVisibleDelivery(list, initialDeliveryDraft(list, 'delivery'), list.map(item => item.pn), 'delivery');
  const review = createDeliveryReview(list, draft, 'delivery', 2, '');
  assert.equal(review.summary.added, 12);
  assert.equal(review.summary.total, 18);
  assert.equal(review.summary.remaining, 0);
  assert.equal(review.summary.status, 'entregue');
});

test('duplicate legacy PNs aggregate once and prototype-shaped PNs remain ordinary material keys', () => {
  const list = groupDeliveryItems(JSON.stringify([raw('__proto__', 1, 1, { designador: 'R1' }),
    raw('__proto__', 9, 2, { designador: 'R2' }), raw('constructor', 2, 0)]));
  assert.equal(list.length, 2);
  assert.equal(list[0].before, 3);
  assert.equal(list[0].requested, 10);
  const draft = initialDeliveryDraft(list, 'delivery');
  draft['__proto__'] = '4';
  assert.equal(createDeliveryReview(list, draft, 'delivery', 0, '').payload.items[0].quantidade_entregue, 7);
  assert.deepEqual(plain(filterDeliveryItems(list, 'r2', false).map(item => item.pn)), ['__proto__']);
});

test('malformed stored quantities and missing versions block delivery instead of inventing zero totals', () => {
  for (const data of [[], 'invalid-json', [raw('PN-A', 2, 3)], [raw('PN-A', 2, -1)],
    [raw('PN-A', '2', 0)], [raw('', 2, 0)]]) assert.throws(() => groupDeliveryItems(data));
  const list = items();
  const draft = { ...initialDeliveryDraft(list, 'delivery'), 'PN-A': '1' };
  for (const version of [undefined, -1, 1.2]) assert.throws(() => createDeliveryReview(list, draft, 'delivery', version, ''), /Atualize/);
  assert.throws(() => createDeliveryReview(list, initialDeliveryDraft(list, 'delivery'), 'delivery', 0, ''), /quantidade/);
});
