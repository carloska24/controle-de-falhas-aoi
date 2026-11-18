jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(), $queryRaw: jest.fn(), registros: { create: jest.fn() },
}));
const prisma = require('../src/config/prisma');
const { createRegistrosBatch } = require('../src/controllers/registroController');
const { registrosBatchSchema } = require('../src/utils/schemas');
const row = (extra = {}) => ({ om: 'OM-1', omVersion: 0, qtdlote: 10, designador: 'R1', tipodefeito: 'Ausente', pn: 'PN-1', ...extra });
const order = (extra = {}) => ({ omNumber: 'OM-1', status: 'em_andamento', version: 0, ...extra });
function response() {
  const res = { statusCode: 200 };
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  return res;
}
async function create(rows = [row()], role = 'operator') {
  const res = response();
  await createRegistrosBatch({ body: rows, user: { id: 7, name: 'Operador de teste', role } }, res);
  return res;
}
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  prisma.$queryRaw.mockResolvedValue([order()]);
  prisma.registros.create.mockResolvedValue({ id: 'created' });
});

test('new writes require the confirmed OM version; malformed versions are rejected', () => {
  expect(registrosBatchSchema.safeParse([row()]).success).toBe(true);
  for (const omVersion of [undefined, null, -1, 0.5, '0']) expect(registrosBatchSchema.safeParse([row({ omVersion })]).success).toBe(false);
});
test('an active OM with the exact version is locked before records are created', async () => {
  const res = await create();
  expect(res.statusCode).toBe(201);
  expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.registros.create.mock.invocationCallOrder[0]);
  expect(prisma.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: 'ReadCommitted' });
  expect(prisma.registros.create.mock.calls[0][0].data).toMatchObject({ om: 'OM-1', operador: 'Operador de teste', status: 'pendente' });
  expect(prisma.registros.create.mock.calls[0][0].data).not.toHaveProperty('omVersion');
});
test.each(['pausada', 'finalizada'])('an OM that is %s rejects the entire write', async status => {
  prisma.$queryRaw.mockResolvedValue([order({ status })]);
  const res = await create();
  expect(res.statusCode).toBe(409); expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('a missing OM is not implicitly started by a record insertion', async () => {
  prisma.$queryRaw.mockResolvedValue([]);
  expect((await create()).statusCode).toBe(404); expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('a stale version is refused even after the OM was paused and resumed', async () => {
  prisma.$queryRaw.mockResolvedValue([order({ version: 2 })]);
  const res = await create();
  expect(res.statusCode).toBe(409); expect(res.body.error).toMatch(/mudou|versão|atualiz/i);
  expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('a later invalid OM in the batch does not leave the first OM partially written', async () => {
  prisma.$queryRaw.mockResolvedValue([order(), order({ omNumber: 'OM-2', status: 'finalizada' })]);
  expect((await create([row(), row({ om: 'OM-2' })])).statusCode).toBe(409);
  expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('conflicting versions for the same OM do not write any records', async () => {
  expect((await create([row(), row({ omVersion: 1 })])).statusCode).toBe(409);
  expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('locks use a stable OM order and bound parameters, including hostile identifier text', async () => {
  const hostile = "Z'); DROP TABLE registros; --";
  prisma.$queryRaw.mockResolvedValue([order({ omNumber: 'A' }), order({ omNumber: hostile })]);
  expect((await create([row({ om: hostile }), row({ om: 'A' })])).statusCode).toBe(201);
  const sql = prisma.$queryRaw.mock.calls[0][0];
  expect(sql.values).toEqual(['A', hostile]);
  expect(sql.strings.join('')).toMatch(/ORDER BY[\s\S]+FOR UPDATE/);
  expect(sql.strings.join('')).not.toContain(hostile);
});
test('administrator requests obey the same closed-OM restriction', async () => {
  prisma.$queryRaw.mockResolvedValue([order({ status: 'finalizada' })]);
  expect((await create([row()], 'admin')).statusCode).toBe(409);
  expect(prisma.registros.create).not.toHaveBeenCalled();
});
test('duplicate record IDs produce a conflict rather than a database internals response', async () => {
  prisma.registros.create.mockRejectedValue({ code: 'P2002', message: 'private database details' });
  const res = await create();
  expect(res.statusCode).toBe(409); expect(res.body.error).not.toContain('private');
});
test('unexpected failures do not expose SQL or connection details', async () => {
  prisma.registros.create.mockRejectedValue(new Error('private SQL and connection details'));
  const res = await create();
  expect(res.statusCode).toBe(500); expect(res.body.error).not.toContain('private');
});
