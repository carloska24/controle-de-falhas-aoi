jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
  requisicoes: { findUnique: jest.fn(), updateMany: jest.fn(), delete: jest.fn() },
  eventos_entrega: { findMany: jest.fn(), deleteMany: jest.fn() },
  requisicao_registros: { findMany: jest.fn(), deleteMany: jest.fn() },
  exclusoes_requisicoes: { create: jest.fn() },
}));
const prisma = require('../src/config/prisma');
const { deleteRequest } = require('../src/services/requestDeletionService');
const { requisicaoDeleteSchema } = require('../src/utils/schemas');
const actor = { id: 3, name: 'Administrador', role: 'admin' };
const body = { version: 2, motivo: 'Exclusão de teste solicitada' };
beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  prisma.requisicoes.findUnique.mockResolvedValue({ id: 8, version: 2, om: 'OM-A', status: 'entregue', items: '[{"pn":"PN-A","quantidade_entregue":2}]' });
  prisma.requisicoes.updateMany.mockResolvedValue({ count: 1 });
  prisma.eventos_entrega.findMany.mockResolvedValue([{ id: 'event-1', version: 2, occurredAt: new Date('2026-11-19T12:00:00Z') }]);
  prisma.requisicao_registros.findMany.mockResolvedValue([{ registro_id: 'REG-1', requisicao_id: 8 }]);
});

test('admin archives delivered requests and their exact links/history before deleting, without deleting source failures', async () => {
  await deleteRequest(8, body, actor);
  expect(prisma.exclusoes_requisicoes.create).toHaveBeenCalledWith({ data: expect.objectContaining({
    requisicaoId: 8, actorId: 3, actorName: 'Administrador', motivo: body.motivo,
    snapshot: expect.objectContaining({ requisicao: expect.objectContaining({ version: 2 }),
      entregas: [expect.objectContaining({ id: 'event-1', occurredAt: '2026-11-19T12:00:00.000Z' })],
      vinculos: [{ registro_id: 'REG-1', requisicao_id: 8 }],
    }),
  }) });
  expect(prisma.requisicoes.updateMany).toHaveBeenCalledWith({ where: { id: 8, version: 2 }, data: { version: { increment: 1 } } });
  expect(prisma.requisicoes.delete).toHaveBeenCalledWith({ where: { id: 8 } });
  expect(prisma.exclusoes_requisicoes.create.mock.invocationCallOrder[0]).toBeLessThan(prisma.eventos_entrega.deleteMany.mock.invocationCallOrder[0]);
});

test('warehouse can delete a pending request without deliveries or delivery history', async () => {
  prisma.requisicoes.findUnique.mockResolvedValue({ id: 8, version: 2, status: 'pendente', items: '[{"quantidade_entregue":0}]' });
  prisma.eventos_entrega.findMany.mockResolvedValue([]);
  await deleteRequest(8, body, { ...actor, role: 'almoxarifado' });
  expect(prisma.requisicoes.delete).toHaveBeenCalled();
});

test.each(['operator','reparo','qualidade','lider_smt'])('role %s cannot delete requests', async role => {
  await expect(deleteRequest(8, body, { ...actor, role })).rejects.toMatchObject({ status: 403 });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});

test('warehouse cannot bypass the admin requirement even after delivery was corrected back to zero', async () => {
  prisma.requisicoes.findUnique.mockResolvedValue({ id: 8, version: 2, status: 'pendente', items: '[{"quantidade_entregue":0}]' });
  await expect(deleteRequest(8, body, { ...actor, role: 'almoxarifado' })).rejects.toMatchObject({ status: 403 });
  expect(prisma.requisicoes.updateMany).not.toHaveBeenCalled();
});

test('changed versions or lost compare-and-update abort before archiving or unlinking', async () => {
  await expect(deleteRequest(8, { ...body, version: 1 }, actor)).rejects.toMatchObject({ status: 409 });
  prisma.requisicoes.updateMany.mockResolvedValue({ count: 0 });
  await expect(deleteRequest(8, body, actor)).rejects.toMatchObject({ status: 409 });
  expect(prisma.exclusoes_requisicoes.create).not.toHaveBeenCalled();
  expect(prisma.requisicao_registros.deleteMany).not.toHaveBeenCalled();
});

test('failed archive prevents deletion of deliveries or links', async () => {
  prisma.exclusoes_requisicoes.create.mockRejectedValue(new Error('archive unavailable'));
  await expect(deleteRequest(8, body, actor)).rejects.toThrow('archive unavailable');
  expect(prisma.eventos_entrega.deleteMany).not.toHaveBeenCalled();
  expect(prisma.requisicoes.delete).not.toHaveBeenCalled();
});

test('missing targets return 404 without creating an archive', async () => {
  prisma.requisicoes.findUnique.mockResolvedValue(null);
  await expect(deleteRequest(8, body, actor)).rejects.toMatchObject({ status: 404 });
  expect(prisma.exclusoes_requisicoes.create).not.toHaveBeenCalled();
});

test.each([{}, { version: 2 }, { version: 2, motivo: '    ' }, { ...body, version: -1 }, { ...body, force: true }])('deletion requires version and reason %#', input => {
  expect(requisicaoDeleteSchema.safeParse(input).success).toBe(false);
});
