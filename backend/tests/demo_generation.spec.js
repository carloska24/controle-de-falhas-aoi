jest.mock('../src/config/prisma', () => ({
  registros: { createMany: jest.fn() },
  ordens_manufatura: { findMany: jest.fn() },
  $transaction: jest.fn(),
}));
const prisma = require('../src/config/prisma');
jest.mock('../src/services/registroCreationService', () => ({ createRegistros: jest.fn() }));
jest.mock('../src/services/omService', () => ({ transition: jest.fn(), OMError: class OMError extends Error {} }));
const { createRegistros } = require('../src/services/registroCreationService');
const { transition } = require('../src/services/omService');
const { populateDemoData } = require('../src/controllers/debugController');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const actor = { id: 7, name: 'Operador de Teste', email: 'teste.local' };
beforeEach(() => {
  jest.resetAllMocks();
  prisma.ordens_manufatura.findMany.mockResolvedValue([]);
  transition.mockImplementation(async omNumber => ({ omNumber, version: 0 }));
});

test('demo adds 15 distinct failures with pending material and SMT examples, without deleting history', async () => {
  const res = response();
  await populateDemoData({ body: { count: 15, clear: false }, user: actor }, res);
  const rows = createRegistros.mock.calls[0][0];
  expect(rows).toHaveLength(15);
  expect(new Set(rows.map(r => r.id)).size).toBe(15);
  expect(rows.every(r => r.om.startsWith('DEMO-') && r.pn && r.serial)).toBe(true);
  expect(rows.slice(0, 4).map(r => r.tipodefeito)).toEqual(['Ausente', 'Danificado', 'Incorreto', 'Possível Incorreto']);
  expect(transition).toHaveBeenCalledWith(rows[0].om, 'start', actor, 50);
  expect(createRegistros).toHaveBeenCalledWith(rows, actor);
  expect(rows.every(r => r.om === rows[0].om && r.omVersion === 0 && r.operador === undefined && r.status === undefined)).toBe(true);
  expect(new Set(rows.map(r => r.serial)).size).toBe(15);
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(rows[0].om).toMatch(/^DEMO-\d{3}$/);
  expect(res.json).toHaveBeenCalledWith({ count: 15, om: rows[0].om, message: expect.stringContaining('15 falhas DEMO pendentes criadas') });
  await populateDemoData({ body: { count: 15 }, user: actor }, response());
  const nextRows = createRegistros.mock.calls[1][0];
  expect(nextRows.every(r => !rows.some(first => first.id === r.id))).toBe(true);
});

test('short OM allocation skips used numbers and retries a concurrent collision', async () => {
  prisma.ordens_manufatura.findMany.mockResolvedValue([{omNumber:'DEMO-001'}, {omNumber:'DEMO-003'}]);
  transition.mockRejectedValueOnce(Object.assign(new Error('OM already exists'), {status:409}));
  const res = response();
  await populateDemoData({body:{count:15},user:actor},res);
  expect(transition.mock.calls.map(call=>call[0])).toEqual(['DEMO-002','DEMO-004']);
  expect(createRegistros.mock.calls[0][0].every(row=>row.om==='DEMO-004')).toBe(true);
});

test.each([0, -1, 1.5, 201, '15', null])('invalid count %p is rejected before generating or clearing data', async count => {
  const res = response();
  await populateDemoData({ body: { count, clear: true } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(prisma.registros.createMany).not.toHaveBeenCalled();
    expect(createRegistros).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('database errors do not expose internal connection or SQL details', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    createRegistros.mockRejectedValueOnce(new Error('private SQL details'));
    const res = response();
    await populateDemoData({ body: { count: 15 }, user: actor }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Não foi possível gerar os dados de demonstração.' });
  } finally { log.mockRestore(); }
});
