jest.mock('../src/config/prisma', () => ({ $transaction: jest.fn(), $queryRaw: jest.fn() }));
const prisma = require('../src/config/prisma');
const { getFalhasReport, parseReportFilters } = require('../src/services/falhasReportService');
const admin = { role: 'admin' };
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  prisma.$queryRaw.mockResolvedValue([]);
});
test.each([{ dataIni: '2026-02-30', periodo: 'custom' }, { periodo: 'custom', dataIni: '2026-11-19', dataFim: '2026-11-18' }, { periodo: '5' }, { page: '1' }, { om: ['OM'] }, { dataIni: '2026-11-18' }])('invalid filters are refused before querying: %j', async query => {
  await expect(getFalhasReport(query, admin)).rejects.toMatchObject({ status: 400 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
test('all 251 rows and global filter options share a repeatable-read snapshot', async () => {
  const rows = Array.from({ length: 251 }, (_, i) => ({ id: String(i), om: 'OM-1', occurred_ms: Date.parse('2026-11-18T12:00:00Z'), createdat: 'old' }));
  prisma.$queryRaw.mockResolvedValueOnce(rows).mockResolvedValueOnce([{ value: 'OM-1' }, { value: 'OM-2' }]).mockResolvedValueOnce([{ value: 'Ausente' }]).mockResolvedValueOnce([{ value: 'pendente' }]);
  const result = await getFalhasReport({}, admin);
  expect(result.meta).toMatchObject({ complete: true, total: 251, invalidDates: 0 });
  expect(result.data[250].createdat).toBe('2026-11-18T12:00:00.000Z');
  expect(result.options.oms).toEqual(['OM-1', 'OM-2']);
  expect(prisma.$transaction.mock.calls[0][1].isolationLevel).toBe('RepeatableRead');
});
test('server filters are bound and date boundaries use the factory timezone and next-day exclusion', async () => {
  const hostile = "OM'); DROP TABLE registros; --";
  await getFalhasReport({ periodo: 'custom', dataIni: '2026-11-18', dataFim: '2026-11-18', om: hostile, status: 'pendente', defeito: 'Ausente', prioridade: 'media', operador: '%' }, admin);
  const query = prisma.$queryRaw.mock.calls[0][0];
  expect(query.values).toEqual(expect.arrayContaining([hostile, '2026-11-18', 'pendente', 'Ausente', 'media', '%']));
  expect(query.strings.join('')).not.toContain(hostile);
  expect(query.strings.join('')).toMatch(/America\/Sao_Paulo/);
  expect(query.strings.join('')).toMatch(/::date \+ 1/);
  // Facets do not disappear when their own selected value narrows the report.
  expect(prisma.$queryRaw.mock.calls[1][0].values).not.toContain(hostile);
});
test('normal mode excludes demonstration records even for admin; explicit demo is restricted', async () => {
  await getFalhasReport({}, admin);
  expect(prisma.$queryRaw.mock.calls[0][0].strings.join('')).toContain("om NOT LIKE 'DEMO-%'");
  expect(() => parseReportFilters({ demo: 'true' }, { role: 'qualidade' })).toThrow(/não permitido/);
  expect(parseReportFilters({ demo: 'true' }, admin).demo).toBe('true');
});
test('a large result is refused rather than returned partially as complete', async () => {
  prisma.$queryRaw.mockResolvedValueOnce(Array.from({ length: 10001 }, () => ({}))).mockResolvedValueOnce([{ value: 'OM-1' }]);
  await expect(getFalhasReport({}, admin)).rejects.toMatchObject({ status: 413, details: { options: { oms: ['OM-1'] } } });
});
test('invalid dates remain in the unbounded-period report without inventing a timestamp', async () => {
  prisma.$queryRaw.mockResolvedValueOnce([{ id: 'old', om: 'OM-1', occurred_ms: null, createdat: 'data legada inválida' }]);
  const result = await getFalhasReport({}, admin);
  expect(result.meta.invalidDates).toBe(1);
  expect(result.data[0]).toMatchObject({ createdat: '', createdatOriginal: 'data legada inválida' });
});
