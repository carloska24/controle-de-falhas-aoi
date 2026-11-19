jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
  requisicoes: { findUnique: jest.fn(), updateMany: jest.fn() },
  eventos_entrega: { create: jest.fn() },
}));
const prisma = require('../src/config/prisma');
const { confirmDelivery } = require('../src/services/deliveryService');
const { requisicaoItensSchema } = require('../src/utils/schemas');
const actor = { id: 7, name: 'Almoxarife' };
const item = (pn, requested, delivered, extra = {}) => ({
  pn, quantidade_requisitada: requested, quantidade_entregue: delivered, ...extra,
});
const body = (delivered, extra = {}) => ({
  version: 3, items: [{ pn: 'PN-A', quantidade_entregue: delivered }], ...extra,
});
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  prisma.requisicoes.findUnique.mockResolvedValue({
    id: 1, version: 3, om: 'OM-A', status: 'pendente',
    items: JSON.stringify([item('PN-A', 5, 0, { descricao: 'Original', designador: 'R1' })]),
  });
  prisma.requisicoes.updateMany.mockResolvedValue({ count: 1 });
});

test('partial, complete and corrected deliveries derive status and audit the exact totals', async () => {
  const saved = await confirmDelivery(1, body(2), actor);
  expect(saved).toMatchObject({ version: 4, status: 'parcialmente_entregue' });
  expect(saved.items).toEqual([item('PN-A', 5, 2, { descricao: 'Original', designador: 'R1' })]);
  expect(prisma.eventos_entrega.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    requisicaoId: 1, version: 4, actorId: 7, actorName: 'Almoxarife',
    antes: { status: 'pendente', items: [item('PN-A', 5, 0, { descricao: 'Original', designador: 'R1' })] },
    depois: { status: 'parcialmente_entregue', items: saved.items },
  }) });
  expect((await confirmDelivery(1, body(5), actor)).status).toBe('entregue');
});

test('legacy rows sharing a PN keep each requested quantity and delivery capacity', async () => {
  prisma.requisicoes.findUnique.mockResolvedValue({ id: 1, version: 3, status: 'parcialmente_entregue',
    items: JSON.stringify([item('PN-A', 1, 1), item('PN-A', 9, 2)]) });
  const saved = await confirmDelivery(1, body(8), actor);
  expect(saved.items).toEqual([item('PN-A', 1, 1), item('PN-A', 9, 7)]);
});

test.each([-1, 6, 0.5, NaN])('invalid delivered quantity %s cannot be written', async delivered => {
  await expect(confirmDelivery(1, body(delivered), actor)).rejects.toMatchObject({ status: 400 });
  expect(prisma.requisicoes.updateMany).not.toHaveBeenCalled();
});

test('missing, extra and duplicate PNs are rejected', async () => {
  for (const items of [[], [{ pn: 'PN-B', quantidade_entregue: 1 }],
    [{ pn: 'PN-A', quantidade_entregue: 1 }, { pn: 'PN-A', quantidade_entregue: 2 }]]) {
    await expect(confirmDelivery(1, { version: 3, items }, actor)).rejects.toMatchObject({ status: 400 });
  }
  expect(prisma.requisicoes.updateMany).not.toHaveBeenCalled();
});

test('reducing a confirmed delivery requires an explicit correction reason', async () => {
  prisma.requisicoes.findUnique.mockResolvedValue({ id: 1, version: 3, status: 'entregue', items: [item('PN-A', 5, 5)] });
  await expect(confirmDelivery(1, body(0), actor)).rejects.toMatchObject({ status: 400 });
  const saved = await confirmDelivery(1, body(0, { motivo: '  Correção de digitação  ' }), actor);
  expect(saved.status).toBe('pendente');
  expect(prisma.eventos_entrega.create.mock.calls[0][0].data.motivo).toBe('Correção de digitação');
});

test('stale snapshots and concurrent updates never create an audit event', async () => {
  await expect(confirmDelivery(1, body(2, { version: 2 }), actor)).rejects.toMatchObject({ status: 409 });
  expect(prisma.requisicoes.updateMany).not.toHaveBeenCalled();
  prisma.requisicoes.updateMany.mockResolvedValue({ count: 0 });
  await expect(confirmDelivery(1, body(2), actor)).rejects.toMatchObject({ status: 409 });
  expect(prisma.eventos_entrega.create).not.toHaveBeenCalled();
});

test('direct status action cannot mark an untouched request delivered or partially delivered', async () => {
  for (const status of ['entregue', 'parcialmente_entregue']) {
    await expect(confirmDelivery(1, { version: 3, status }, actor, true)).rejects.toMatchObject({ status: 409 });
  }
  expect(prisma.requisicoes.updateMany).not.toHaveBeenCalled();
});

test('the delivery contract requires a real version and integer numeric totals', () => {
  expect(requisicaoItensSchema.safeParse(body(2)).success).toBe(true);
  for (const input of [body(2, { version: undefined }), body('2'), body(2.5), body(2, { status: 'entregue' })]) {
    expect(requisicaoItensSchema.safeParse(input).success).toBe(false);
  }
});
