const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/materialRequest.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { reviewMaterialRequest, togglePageSelection } = context.exports;
const record = (id, changes = {}) => ({ id, om: 'OM-TESTE', pn: 'PN-TESTE', tipodefeito: 'Ausente', ...changes });

test('mixed page explicitly separates 11 materials from one pending SMT record', () => {
  const records = Array.from({ length: 12 }, (_, i) => record(String(i), i === 1 ? { tipodefeito: 'Possível Incorreto' } : {}));
  const review = reviewMaterialRequest(records, records.map(r => r.id));
  assert.equal(review.eligible.length, 11);
  assert.equal(review.excluded.length, 1);
  assert.match(review.excluded[0].reason, /SMT/);
  assert.equal(review.groups[0].quantity, 11);
});

test('missing PN, stale IDs and other defects cannot enter the submitted materials', () => {
  const review = reviewMaterialRequest([record('1', { pn: ' ' }), record('2', { tipodefeito: 'Curto' })], ['1', '2', 'deleted']);
  assert.equal(review.eligible.length, 0);
  assert.equal(review.excluded.length, 3);
  assert.match(review.excluded[0].reason, /PN/);
  assert.match(review.excluded[2].reason, /Atualize/);
});

test('groups quantities by OM and trimmed PN, counting each selected ID once', () => {
  const review = reviewMaterialRequest([
    record('1', { pn: ' PN-A ', tipodefeito: ' Danificado ' }),
    record('2', { pn: 'PN-A', tipodefeito: 'Incorreto' }),
    record('3', { pn: 'PN-A', om: 'OM-2' }),
    record('4', { pn: 'PN-B' }),
  ], ['1', '2', '3', '4', '1']);
  assert.equal(review.eligible.length, 4);
  assert.equal(review.groups.length, 3);
  assert.equal(review.groups[0].quantity, 2);
});

test('select all uses page membership and preserves selections on other pages', () => {
  const previous = new Set(['other1', 'other2']);
  const selected = togglePageSelection(previous, ['page1', 'page2']);
  assert.equal(selected.size, 4);
  assert.ok(selected.has('page1'));
  const deselected = togglePageSelection(selected, ['page1', 'page2']);
  assert.equal(deselected.size, 2);
  assert.ok(deselected.has('other1'));
  assert.equal(previous.size, 2);
});

test('empty and partially selected pages do not discard unrelated selections', () => {
  assert.equal(reviewMaterialRequest([], []).groups.length, 0);
  assert.equal(togglePageSelection(new Set(['outside']), []).size, 1);
  const result = togglePageSelection(new Set(['outside', 'one']), ['one', 'two']);
  assert.equal(result.size, 3);
  assert.ok(result.has('outside'));
});
