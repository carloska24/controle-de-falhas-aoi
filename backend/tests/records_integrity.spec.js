jest.mock('../src/config/prisma', () => ({
  registros: { count: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  requisicoes: { count: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  requisicao_registros: { findMany: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn(),
}));
const prisma = require('../src/config/prisma');
const registros = require('../src/controllers/registroController');
const requisicoes = require('../src/controllers/requisicaoController');
const { getPagination } = require('../src/utils/pagination');
const { registroUpdateSchema, registroStatusSchema, registroStatusBatchSchema, registrosBatchSchema, requisicoesCreateSchema } = require('../src/utils/schemas');

function response() {
  const res = { statusCode: 200, body: undefined };
  res.status = jest.fn(code => { res.statusCode = code; return res; });
  res.json = jest.fn(body => { res.body = body; return res; });
  return res;
}
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
});

test.each(['0', '-1', '201', '1.5', '1x', ['2'], 'Infinity'])('rejects invalid page limits: %p', limit => {
  expect(() => getPagination({ limit })).toThrow();
});
test.each(['0', '-1', '1x', '1.5', '9007199254740992', '2147483648'])('rejects invalid page/offset: %p', page => {
  expect(() => getPagination({ page })).toThrow();
});
test('pagination defaults remain bounded', () => {
  expect(getPagination({})).toEqual({ page: 1, limit: 50, skip: 0 });
});

test.each([
  ['records', registros.listRegistros, 'registros', 'createdat'],
  ['requests', requisicoes.listRequisicoes, 'requisicoes', 'created_at'],
])('%s list exposes all 205 rows across pages with stable ordering', async (_name, controller, model, createdField) => {
  const rows = Array.from({ length: 205 }, (_, i) => ({ id: i + 1, version: 0, [createdField]: '2026-11-17T10:00:00.000Z', items: '[]' }));
  prisma[model].count.mockResolvedValue(rows.length);
  prisma[model].findMany.mockImplementation(async ({ skip, take }) => rows.slice(skip, skip + take));
  const first = response();
  const second = response();
  await controller({ query: { page: '1', limit: '200' }, user: { role: 'admin' } }, first);
  await controller({ query: { page: '2', limit: '200' }, user: { role: 'admin' } }, second);
  expect(first.body.meta).toMatchObject({ total: 205, totalPages: 2, limit: 200 });
  expect(first.body.data).toHaveLength(200);
  expect(second.body.data).toHaveLength(5);
  expect(new Set([...first.body.data, ...second.body.data].map(row => row.id)).size).toBe(205);
  expect(prisma[model].findMany.mock.calls[0][0].orderBy).toEqual([{ [createdField]: 'desc' }, { id: 'desc' }]);
  expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
});

test('invalid pagination is a client error and never queries records', async () => {
  const res = response();
  await registros.listRegistros({ query: { limit: '201' }, user: {} }, res);
  expect(res.statusCode).toBe(400);
  expect(prisma.registros.count).not.toHaveBeenCalled();
});

test('non-admin record visibility still excludes demo OMs', async () => {
  prisma.registros.count.mockResolvedValue(0);
  prisma.registros.findMany.mockResolvedValue([]);
  await registros.listRegistros({ query: {}, user: { role: 'operator' } }, response());
  expect(prisma.registros.count).toHaveBeenCalledWith({ where: { NOT: { om: { startsWith: 'DEMO-' } } } });
});

test('general and status updates require valid version and lot/state', () => {
  expect(registroUpdateSchema.safeParse({ pn: 'PN' }).success).toBe(false);
  expect(registroUpdateSchema.safeParse({ version: 0, qtdlote: -5 }).success).toBe(false);
  expect(registroUpdateSchema.safeParse({ version: 0, qtdlote: 2147483648 }).success).toBe(false);
  expect(registroStatusSchema.safeParse({ version: 0, status: 'anything' }).success).toBe(false);
  expect(registroStatusSchema.safeParse({ version: 0, status: 'reparado' }).success).toBe(true);
  expect(registroStatusBatchSchema.safeParse({ ids: ['r1'], versions: {} }).success).toBe(false);
  expect(registroStatusBatchSchema.safeParse({ ids: ['r1', 'r1'], versions: { r1: 0 } }).success).toBe(false);
});

test('creation rejects oversized batches and duplicate material selections', () => {
  const row = { om: 'OM', qtdlote: 10, designador: 'R1', tipodefeito: 'Ausente' };
  expect(registrosBatchSchema.safeParse(Array.from({ length: 201 }, () => row)).success).toBe(false);
  expect(requisicoesCreateSchema.safeParse({ registroIds: ['r1', 'r1'] }).success).toBe(false);
});

test.each([[{ id: 'r1' }, 409], [null, 404]])('failed conditional update distinguishes conflict from deletion: %p', async (existing, code) => {
  prisma.registros.update.mockRejectedValue({ code: 'P2025' });
  prisma.registros.findUnique.mockResolvedValue(existing);
  const res = response();
  await registros.updateRegistro({ params: { id: 'r1' }, body: { version: 2, pn: 'corrected' } }, res);
  expect(res.statusCode).toBe(code);
  expect(prisma.registros.update).toHaveBeenCalledWith({ where: { id: 'r1', version: 2 }, data: { pn: 'corrected', version: { increment: 1 } } });
});

test('batch status aborts its transaction on any version conflict', async () => {
  prisma.registros.findMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
  prisma.registros.updateMany.mockResolvedValue({ count: 1 });
  const res = response();
  await registros.updateStatusBatch({ params: { status: 'reparado' }, body: { ids: ['r1', 'r2'], versions: { r1: 0, r2: 3 } } }, res);
  expect(res.statusCode).toBe(409);
  expect(prisma.registros.updateMany.mock.calls[0][0]).toEqual({ where: { OR: [{ id: 'r1', version: 0 }, { id: 'r2', version: 3 }] }, data: { status: 'reparado', version: { increment: 1 } } });
});

test('missing batch members abort before any status write', async () => {
  prisma.registros.findMany.mockResolvedValue([{ id: 'r1' }]);
  const res = response();
  await registros.updateStatusBatch({ params: { status: 'reparado' }, body: { ids: ['r1', 'missing'], versions: { r1: 0, missing: 0 } } }, res);
  expect(res.statusCode).toBe(404);
  expect(prisma.registros.updateMany).not.toHaveBeenCalled();
});

test('repeating a material request returns the existing IDs instead of requesting twice', async () => {
  const links = [];
  prisma.registros.findMany.mockResolvedValue([{ id: 'r1', om: 'OM-1', pn: 'PN-1', tipodefeito: 'Ausente' }]);
  prisma.requisicao_registros.findMany.mockImplementation(async () => [...links]);
  prisma.requisicoes.create.mockResolvedValue({ id: 7 });
  prisma.requisicao_registros.createMany.mockImplementation(async ({ data }) => { links.push(...data); return { count: data.length }; });
  const req = { body: { registroIds: ['r1'] }, user: { id: 9, email: 'operator.local' } };
  const first = response();
  const second = response();
  await requisicoes.createRequisicao(req, first);
  await requisicoes.createRequisicao(req, second);
  expect(first.statusCode).toBe(201);
  expect(second.statusCode).toBe(200);
  expect(second.body.requisicaoIds).toEqual([7]);
  expect(prisma.requisicoes.create).toHaveBeenCalledTimes(1);
  expect(prisma.requisicoes.create.mock.calls[0][0].data.created_by).toBe('operator.local');
  expect(prisma.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
});

test('serialization conflicts are retried without bypassing the record link', async () => {
  prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
  prisma.registros.findMany.mockResolvedValue([{ id: 'r1' }]);
  prisma.requisicao_registros.findMany.mockResolvedValue([{ registro_id: 'r1', requisicao_id: 5 }]);
  const res = response();
  await requisicoes.createRequisicao({ body: { registroIds: ['r1'] }, user: { id: 9, email: 'operator' } }, res);
  expect(res.statusCode).toBe(200);
  expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  expect(prisma.requisicoes.create).not.toHaveBeenCalled();
});

test('mixed/missing material selections never silently create a partial request', async () => {
  prisma.registros.findMany.mockResolvedValue([{ id: 'r1' }]);
  const res = response();
  await requisicoes.createRequisicao({ body: { registroIds: ['r1', 'missing'] }, user: {} }, res);
  expect(res.statusCode).toBe(404);
  expect(prisma.requisicoes.create).not.toHaveBeenCalled();
});

test('linked records cannot be deleted silently', async () => {
  prisma.registros.delete.mockRejectedValue({ code: 'P2003' });
  const res = response();
  await registros.deleteRegistro({ params: { id: 'r1' } }, res);
  expect(res.statusCode).toBe(409);
});
