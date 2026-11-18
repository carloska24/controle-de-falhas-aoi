const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8');
  const context = { exports: {}, require: dependency => load(dependency.slice(2)) };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  modules.set(name, context.exports);
  return context.exports;
}

const { repairQueueStatus, repairStatus, toBackendRepairStatus } = load('repairStatus');
const { filterRepairReport, summarizeRepairReport, serializeRepairCSV } = load('repairReport');
const { reportPage } = load('falhasReport');
const filters = { dateRange: 'all', startDate: '', endDate: '', om: 'all', status: 'all', prioridade: 'all', operador: '' };
const row = (status, extra = {}) => ({ id: status, om: 'OM-A', status, createdat: '2026-11-18T13:00:00Z', ...extra });

test('current API and historical states reconcile with the repair queue', () => {
  for (const [status, detail, queue] of [
    ['pendente', 'pendente', 'aberto'], ['em_analise', 'em_analise', 'aberto'],
    ['Em análise', 'em_analise', 'aberto'], ['em_andamento', 'em_analise', 'aberto'],
    ['requisição_gerada', 'pendente', 'aberto'], ['aberto', 'pendente', 'aberto'],
    ['reparado', 'reparado', 'reparado'], ['concluído', 'reparado', 'reparado'],
    ['cancelado', 'cancelado', 'cancelado'], ['sucata', 'cancelado', 'cancelado'],
    [null, 'pendente', 'aberto'], ['legado sem mapeamento', 'pendente', 'aberto'],
  ]) {
    assert.equal(repairStatus(status), detail);
    assert.equal(repairQueueStatus(status), queue);
  }
  assert.equal(toBackendRepairStatus('aberto'), 'pendente');
});

test('251 open records reconcile across queue, counters, last page and complete export', () => {
  const rows = Array.from({ length: 251 }, (_, i) => row(i < 240 ? 'pendente' : 'em_analise', { id: 'R' + i, serial: 'S' + i }));
  const selected = filterRepairReport([...rows, row('reparado'), row('cancelado')], { ...filters, status: 'aberto' });
  const counts = summarizeRepairReport(selected);
  assert.equal(counts.total, 251);
  assert.equal(counts.abertos, rows.filter(r => repairQueueStatus(r.status) === 'aberto').length);
  assert.equal(counts.counts.pendente, 240);
  assert.equal(counts.counts.em_analise, 11);
  assert.equal(reportPage(selected, 21).records.length, 11);
  const csv = serializeRepairCSV(selected);
  assert.equal(csv.trimEnd().split('\r\n').length, 252);
  assert.equal(csv.match(/"Pendente"/g).length, 240);
  assert.equal(csv.match(/"Em análise"/g).length, 11);
});

test('combined filters use the same states and the entire final day in São Paulo', () => {
  const match = row('em_analise', { id: 'match', prioridade: 'Média', operador: 'Ana', createdat: '2026-11-19T02:59:59.999Z' });
  const picks = filterRepairReport([match, { ...match, id: 'next', createdat: '2026-11-19T03:00:00Z' },
    { ...match, id: 'pending', status: 'pendente' }, { ...match, id: 'other', om: 'OM-B' },
  ], { ...filters, dateRange: 'custom', startDate: '2026-11-18', endDate: '2026-11-18', om: 'OM-A', status: 'em_analise', prioridade: 'media', operador: ' ana ' });
  assert.equal(picks.length, 1);
  assert.equal(picks[0].id, 'match');
});

test('CSV keeps completion timestamps empty when unavailable and escapes text fields', () => {
  const csv = serializeRepairCSV([row('sucata', { pn: 'A,"B"', serial: '=123' })]);
  assert.ok(csv.includes('"A,""B""","\'=123"'));
  assert.ok(csv.includes('"Cancelado"'));
  assert.ok(csv.endsWith('"2026-11-18T13:00:00Z",""\r\n'));
});
