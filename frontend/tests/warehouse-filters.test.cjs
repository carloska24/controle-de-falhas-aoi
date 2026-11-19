const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const context = { exports: {}, require: dependency => load(dependency.slice(2)) };
  vm.runInNewContext(ts.transpileModule(
    readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText, context);
  modules.set(name, context.exports);
  return context.exports;
}
const { filterWarehouseRequests, validWarehouseDay } = load('warehouseFilters');
const filters = { search: '', om: 'all', status: 'all', day: '' };
const row = (id, date, extra = {}) => ({
  id, om: 'OM-A', status: 'pendente', created_at: date, created_by: 'Maria', ...extra,
});
const ids = records => Array.from(records, record => record.id);

test('date filter accepts empty data and a combination that eliminates all rows', () => {
  assert.deepEqual(ids(filterWarehouseRequests([], { ...filters, day: '2026-11-19' })), []);
  const records = [row(1, '2026-11-19T12:00:00Z')];
  assert.deepEqual(ids(filterWarehouseRequests(records,
    { ...filters, search: 'SEM-RESULTADO', day: '2026-11-19' })), []);
});

test('an entire factory day includes midnight and the last millisecond in Brasília', () => {
  const records = [
    row(1, '2026-11-19T02:59:59.999Z'), row(2, '2026-11-19T03:00:00Z'),
    row(3, '2026-11-20T02:59:59.999Z'), row(4, '2026-11-20T03:00:00Z'),
    row(5, '2026-11-19T22:00:00-03:00'),
  ];
  assert.deepEqual(ids(filterWarehouseRequests(records, { ...filters, day: '2026-11-19' })), [2, 3, 5]);
});

test('missing and invalid record dates do not throw or match a date filter', () => {
  const records = [row(1, undefined), row(2, null), row(3, ''), row(4, 'data-invalida'),
    row(5, '2026-11-19T12:00:00Z')];
  assert.deepEqual(ids(filterWarehouseRequests(records, { ...filters, day: '2026-11-19' })), [5]);
  assert.deepEqual(ids(filterWarehouseRequests(records, filters)), [1, 2, 3, 4, 5]);
});

test('OM, status, requester and ID combine with the same day and clearing restores records', () => {
  const records = [row(12, '2026-11-19T12:00:00Z'),
    row(13, '2026-11-19T12:00:00Z', { status: 'entregue' }),
    row(14, '2026-11-19T12:00:00Z', { om: 'OM-B' })];
  const selected = { ...filters, om: 'OM-A', status: 'pendente', day: '2026-11-19' };
  assert.deepEqual(ids(filterWarehouseRequests(records, { ...selected, search: ' mARIA ' })), [12]);
  assert.deepEqual(ids(filterWarehouseRequests(records, { ...selected, search: '12' })), [12]);
  assert.deepEqual(ids(filterWarehouseRequests(records, { ...selected, search: 'OM-B' })), []);
  assert.deepEqual(ids(filterWarehouseRequests(records, filters)), [12, 13, 14]);
});

test('impossible or malformed filter dates are refused and leap days are valid', () => {
  for (const day of ['2026-02-30', '2026-02-29', '2026-13-01', 'invalida', '19/11/2026']) {
    assert.equal(validWarehouseDay(day), false);
    assert.deepEqual(ids(filterWarehouseRequests([row(1, '2026-11-19T12:00:00Z')], { ...filters, day })), []);
  }
  assert.equal(validWarehouseDay('2024-02-29'), true);
  assert.equal(validWarehouseDay(''), true);
});
