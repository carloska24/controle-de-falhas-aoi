const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, URLSearchParams };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/falhasReport.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { parseFalhasSnapshot, parseReportOptions, reportPage, reportQuery, serializeFalhasCSV, reportDay } = context.exports;
const row = extra => ({ id: '1', om: 'OM-A', qtdlote: 500, pn: 'PN-1', serial: 'SN-1', designador: 'R1', tipodefeito: 'Ausente', descricao: 'Resistor', operador: 'Operador', status: 'pendente', prioridade: 'media', createdat: '2026-11-18T12:00:00Z', ...extra });
const snapshot = records => ({ data: records, options: { oms: ['OM-A', 'OM-B'], defeitos: ['Ausente'], statuses: ['pendente'] }, meta: { complete: true, total: records.length, maxRecords: 10000, generatedAt: '2026-11-18T12:00:00Z', timeZone: 'America/Sao_Paulo', invalidDates: 0 } });
test('paging shows 12 of 251 while the confirmed dataset and export retain all 251', () => {
  const data = parseFalhasSnapshot(snapshot(Array.from({ length: 251 }, (_, i) => row({ id: String(i) }))));
  assert.equal(reportPage(data.data, 1).records.length, 12);
  assert.equal(reportPage(data.data, 21).records.length, 11);
  assert.equal(reportPage(data.data, 21).totalPages, 21);
  assert.equal(data.meta.total, 251);
  assert.equal(serializeFalhasCSV(data.data).split('\r\n').length, 253);
});
test('a reduced result clamps the page instead of hiding matching records', () => {
  const page = reportPage([row()], 21);
  assert.equal(page.currentPage, 1); assert.equal(page.records.length, 1);
});
test('safe options from a limit error remain usable without accepting partial report rows', () => {
  const options = { oms: ['OM-A', 'OM-B'], defeitos: ['Ausente'], statuses: ['pendente'] };
  assert.equal(parseReportOptions(options), options);
  assert.equal(parseReportOptions({ oms: ['OM-A'] }), undefined);
  assert.equal(parseReportOptions({ ...options, oms: ['OM-A', 'OM-A'] }), undefined);
  assert.equal(parseReportOptions({ ...options, oms: [42] }), undefined);
});
test('partial datasets, duplicate rows and malformed metadata are never accepted as complete', () => {
  for (const invalid of [snapshot([row(), row()]), { ...snapshot([row()]), meta: { ...snapshot([]).meta, total: 251 } }, { ...snapshot([]), meta: { ...snapshot([]).meta, complete: false } }, { ...snapshot([]), options: {} }]) {
    assert.throws(() => parseFalhasSnapshot(invalid));
  }
});
test('query encodes every server filter, with no pagination or stale custom dates', () => {
  const filters = { dateRange: 'custom', startDate: '2026-11-17', endDate: '2026-11-18', om: 'OM & A', defeito: 'Solda Fria', prioridade: 'media', status: 'pendente', operador: ' Maria % ', demo: false };
  const params = new URLSearchParams(reportQuery(filters));
  assert.equal(params.get('om'), 'OM & A'); assert.equal(params.get('operador'), 'Maria %');
  assert.equal(params.get('dataFim'), '2026-11-18'); assert.equal(params.get('defeito'), 'Solda Fria'); assert.equal(params.has('page'), false);
  assert.equal(new URLSearchParams(reportQuery({ ...filters, dateRange: '7' })).has('dataIni'), false);
});
test('CSV has eleven aligned columns including lot quantity and preserves escaped text', () => {
  const csv = serializeFalhasCSV([row({ descricao: 'Resistor, "10k"\nlinha 2' })]);
  assert.ok(csv.startsWith('\ufeff"OM","Qtd Lote","PN","Serial","Designador","Tipo Defeito","Descrição","Operador","Status","Prioridade","Data"\r\n'));
  assert.ok(csv.includes('"OM-A","500","PN-1","SN-1","R1","Ausente","Resistor, ""10k""\nlinha 2","Operador","pendente","media","2026-11-18T12:00:00Z"\r\n'));
});
test('CSV treats formula-like text as text, including leading controls and full-width symbols', () => {
  for (const pn of ['=1+1', '+cmd', '-1', '@SUM(A1)', '  =1+1', '\tdata', '\rdata', '＝1+1']) {
    assert.ok(serializeFalhasCSV([row({ pn })]).includes('"\'' + pn + '"'));
  }
});
test('CSV preserves the original invalid date for diagnosis and handles missing optional data', () => {
  assert.ok(serializeFalhasCSV([row({ createdat: '', createdatOriginal: 'sem data', qtdlote: null, pn: null })]).includes('"OM-A","","","SN-1"'));
  assert.ok(serializeFalhasCSV([row({ createdat: '', createdatOriginal: 'sem data' })]).includes('"sem data"'));
});
test('daily aggregation follows Brasilia instead of UTC and labels invalid dates explicitly', () => {
  assert.equal(reportDay('2026-11-18T02:59:59Z'), '2026-11-17');
  assert.equal(reportDay('2026-11-18T03:00:00Z'), '2026-11-18');
  assert.equal(reportDay(''), 'Data inválida');
});
