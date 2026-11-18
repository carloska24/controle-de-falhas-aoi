jest.mock('../src/config/prisma', () => ({ $transaction: jest.fn(), registros: { deleteMany: jest.fn(), delete: jest.fn() } }));
const prisma = require('../src/config/prisma');
const { deleteRegistrosBatch, deleteRegistro } = require('../src/controllers/registroController');
const schemas = require('../src/utils/schemas');
function response() {
  const res = { statusCode: 200 };
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  res.send = jest.fn(() => res);
  return res;
}
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
});
test('delete contracts require the version of each unique reviewed record', () => {
  const schema = schemas.registrosDeleteSchema;
  expect(schema.safeParse({ ids: ['a', 'b'], versions: { a: 0, b: 3 } }).success).toBe(true);
  for (const body of [{ ids: ['a'] }, { ids: ['a'], versions: {} }, { ids: ['a', 'a'], versions: { a: 0 } }, { ids: ['a'], versions: { a: -1 } }]) {
    expect(schema.safeParse(body).success).toBe(false);
  }
  expect(schemas.registroDeleteSchema.safeParse({}).success).toBe(false);
});
test('batch deletion only targets reviewed IDs and versions and requires the full count', async () => {
  prisma.registros.deleteMany.mockResolvedValue({ count: 2 });
  const res = response();
  await deleteRegistrosBatch({ body: { ids: ['a', 'b'], versions: { a: 0, b: 3 } } }, res);
  expect(prisma.registros.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ id: 'a', version: 0 }, { id: 'b', version: 3 }] } });
  expect(res.statusCode).toBe(204);
});
test.each([0, 1])('a batch that matches only %i of 2 records fails inside the transaction', async count => {
  prisma.registros.deleteMany.mockResolvedValue({ count });
  let rolledBack = false;
  prisma.$transaction.mockImplementation(async callback => {
    try { return await callback(prisma); } catch (error) { rolledBack = true; throw error; }
  });
  const res = response();
  await deleteRegistrosBatch({ body: { ids: ['a', 'b'], versions: { a: 0, b: 3 } } }, res);
  expect(rolledBack).toBe(true); expect(res.statusCode).toBe(409); expect(res.send).not.toHaveBeenCalled();
});
test('a single delete includes its reviewed version and reports a changed/deleted record as a conflict', async () => {
  prisma.registros.delete.mockRejectedValue({ code: 'P2025' });
  const res = response();
  await deleteRegistro({ params: { id: 'a' }, body: { version: 2 } }, res);
  expect(prisma.registros.delete).toHaveBeenCalledWith({ where: { id: 'a', version: 2 } });
  expect(res.statusCode).toBe(409);
});
test('a linked material prevents deletion without leaking private details', async () => {
  prisma.registros.deleteMany.mockRejectedValue({ code: 'P2003', message: 'private SQL' });
  const res = response();
  await deleteRegistrosBatch({ body: { ids: ['a'], versions: { a: 0 } } }, res);
  expect(res.statusCode).toBe(409); expect(res.body.error).not.toContain('private');
});
