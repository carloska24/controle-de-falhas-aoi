jest.mock('../src/config/prisma', () => ({ $transaction: jest.fn(), ordens_manufatura: { findUnique: jest.fn() } }));
const prisma = require('../src/config/prisma');
const { transition, serializeOM } = require('../src/services/omService');
const controller = require('../src/controllers/omController');

const actor = { id: 7, name: 'Operador Teste', email: 'operador' };
const active = { omNumber: 'OM-1', status: 'em_andamento', startTime: 1000n, endTime: null, pausedTime: 100n,
  pauseStartedAt: null, elapsedAtPause: null, qtdlote: 30, version: 0 };
let tx;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(5000);
  tx = {
    ordens_manufatura: { findUnique: jest.fn().mockResolvedValue(active), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    eventos_om: { create: jest.fn() },
  };
  prisma.$transaction.mockImplementation(callback => callback(tx));
});
afterEach(() => jest.restoreAllMocks());

test('start confirms only after persistence and audit, returning JSON-safe timestamps', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue(null);
  tx.ordens_manufatura.create.mockResolvedValue(active);
  const saved = await transition('OM-1', 'start', actor, 30);
  expect(tx.ordens_manufatura.create.mock.calls[0][0].data).toMatchObject({ omNumber: 'OM-1', qtdlote: 30 });
  expect(tx.eventos_om.create.mock.calls[0][0].data).toMatchObject({ action: 'start', actorId: 7 });
  expect(saved.startTime).toBe(1000);
  expect(() => JSON.stringify(saved)).not.toThrow();
});

test('database failure never produces a successful start', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue(null);
  tx.ordens_manufatura.create.mockRejectedValue(new Error('database outage'));
  await expect(transition('OM-1', 'start', actor)).rejects.toThrow('database outage');
  expect(tx.eventos_om.create).not.toHaveBeenCalled();
});

test('audit failure fails the same transaction instead of confirming unaudited work', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue(null);
  tx.ordens_manufatura.create.mockResolvedValue(active);
  tx.eventos_om.create.mockRejectedValue(new Error('audit failed'));
  await expect(transition('OM-1', 'start', actor)).rejects.toThrow('audit failed');
});

test('finalized OM cannot be restarted or overwritten', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue({ ...active, status: 'finalizada' });
  await expect(transition('OM-1', 'start', actor)).rejects.toMatchObject({ status: 409 });
  expect(tx.ordens_manufatura.create).not.toHaveBeenCalled();
});

test.each(['pause', 'resume', 'finish'])('missing OM in %s returns 404', async action => {
  tx.ordens_manufatura.findUnique.mockResolvedValue(null);
  await expect(transition('OM-1', action, actor)).rejects.toMatchObject({ status: 404 });
});

test('pause calculates elapsed and checks persisted version', async () => {
  await transition('OM-1', 'pause', actor);
  expect(tx.ordens_manufatura.updateMany).toHaveBeenCalledWith({
    where: { omNumber: 'OM-1', version: 0, status: 'em_andamento' },
    data: { status: 'pausada', pauseStartedAt: 5000n, elapsedAtPause: 3900n, version: { increment: 1 } },
  });
});

test('resume counts only the actual paused interval', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue({ ...active, status: 'pausada', pauseStartedAt: 4000n });
  await transition('OM-1', 'resume', actor);
  expect(tx.ordens_manufatura.updateMany.mock.calls[0][0].data).toMatchObject({ pausedTime: 1100n, pauseStartedAt: null });
});

test('finish while paused excludes the final pause from production time', async () => {
  tx.ordens_manufatura.findUnique.mockResolvedValue({ ...active, status: 'pausada', pauseStartedAt: 4000n });
  await transition('OM-1', 'finish', actor);
  expect(tx.ordens_manufatura.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'finalizada', endTime: 5000n, pausedTime: 1100n });
});

test('concurrent update reports conflict without recording a successful transition', async () => {
  tx.ordens_manufatura.updateMany.mockResolvedValue({ count: 0 });
  await expect(transition('OM-1', 'pause', actor)).rejects.toMatchObject({ status: 409 });
  expect(tx.eventos_om.create).not.toHaveBeenCalled();
});

test('reads use current database state, with no process cache', async () => {
  prisma.ordens_manufatura.findUnique.mockResolvedValueOnce(active).mockResolvedValueOnce({ ...active, status: 'finalizada', endTime: 4500n });
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await controller.getOM({ params: { omNumber: 'OM-1' } }, res);
  await controller.getOM({ params: { omNumber: 'OM-1' } }, res);
  expect(res.json.mock.calls[1][0]).toMatchObject({ status: 'finalizada', elapsed: 3400 });
});

test('paused elapsed stays frozen and finished elapsed ignores current clock', () => {
  expect(serializeOM({ ...active, status: 'pausada', pauseStartedAt: 3000n }, 99000).elapsed).toBe(1900);
  expect(serializeOM({ ...active, status: 'finalizada', endTime: 4000n }, 99000).elapsed).toBe(2900);
});
