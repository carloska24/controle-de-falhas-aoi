const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/materialRequest.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, require: require('node:module').createRequire(path.join(__dirname, '../lib/materialRequest.ts')) };
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

test('review distinguishes unique PNs from materials across OMs and retains descriptions', () => {
  const review = reviewMaterialRequest([
    record('1', { pn: ' PN-A ', descricao: ' Resistor ' }),
    record('2', { pn: 'PN-A', descricao: 'Resistor' }),
    record('3', { pn: 'PN-A', om: 'OM-2', descricao: 'Outra descrição' }),
    record('4', { pn: 'PN-B' }),
  ], ['1', '2', '3', '4', '1']);
  assert.equal(review.selectedCount, 4);
  assert.equal(review.uniquePNs, 2);
  assert.equal(review.orders.length, 2);
  assert.equal(review.orders[0].materials.length, 2);
  assert.equal(review.orders[0].materials[0].quantity, 2);
  assert.equal(review.orders[0].materials[0].descriptions.join(), 'Resistor');
  assert.equal(review.orders[1].materials[0].descriptions.join(), 'Outra descrição');
  assert.equal(review.orders[0].materials[1].descriptions.length, 0);
});

test('excluded records never enter the material summary and retain their reasons', () => {
  const review = reviewMaterialRequest([
    record('1', { tipodefeito: 'Curto' }), record('2', { tipodefeito: 'Solda Fria' }),
    record('3', { pn: '', tipodefeito: 'Possível Incorreto' }), record('4', { pn: '' }),
  ], ['1', '2', '3', '4', 'deleted', '1']);
  assert.equal(review.excluded.length, 5);
  assert.equal(review.excluded[2].reason, 'Aguarda conferência SMT.');
  assert.equal(review.selectedCount, 5);
  assert.equal(review.uniquePNs, 0);
  assert.equal(review.orders.length, 0);
});

test('empty and partially selected pages do not discard unrelated selections', () => {
  assert.equal(reviewMaterialRequest([], []).groups.length, 0);
  assert.equal(togglePageSelection(new Set(['outside']), []).size, 1);
  const result = togglePageSelection(new Set(['outside', 'one']), ['one', 'two']);
  assert.equal(result.size, 3);
  assert.ok(result.has('outside'));
});

test('one grouped occurrence requests one component for each distinct designator', () => {
  const review = reviewMaterialRequest([record('group', { designador: 'R1,R2,R3' })], ['group', 'group']);
  assert.equal(review.eligible.length, 1);
  assert.equal(review.totalQuantity, 3);
  assert.equal(review.groups[0].quantity, 3);
});

test('commas, spaces, semicolons and repeated case variants preserve the physical quantity', () => {
  const review = reviewMaterialRequest([
    record('a', { designador: 'r1, R1; r2 R3' }),
    record('b', { designador: 'R4', om: 'OM-2' }),
    record('c', { designador: 'C1;C2', pn: 'PN-2' }),
  ], ['a', 'b', 'c']);
  assert.equal(review.totalQuantity, 6);
  assert.equal(review.groups.map(g => g.quantity).join(), '3,1,2');
});

test('existing links, invalid ranges and cancelled material stay outside the quantity preview', () => {
  const review = reviewMaterialRequest([
    record('linked', { designador: 'R1,R2,R3', materialRequisitado: true }),
    record('invalid', { designador: 'R1-R3' }),
    record('cancelled', { designador: 'R5,R6', status: 'cancelado' }),
    record('new', { designador: 'C1,C2' }),
  ], ['linked', 'invalid', 'cancelled', 'new']);
  assert.equal(review.totalQuantity, 2);
  assert.equal(review.eligible.map(r => r.id).join(), 'new');
  assert.equal(review.excluded.length, 3);
});
