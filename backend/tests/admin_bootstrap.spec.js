const bcrypt = require('bcrypt');
const { createAdmin } = require('../prisma/seed');

const credentials = {
  ADMIN_USERNAME: 'factory-admin-test', ADMIN_NAME: 'Administrador Teste',
  ADMIN_PASSWORD: 'unique-test-password',
};
let prisma;
beforeEach(() => {
  prisma = { users: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() } };
});

test.each([
  {}, { ...credentials, ADMIN_PASSWORD: '123456' },
  { ...credentials, ADMIN_USERNAME: ' ' }, { ...credentials, ADMIN_NAME: '' },
  { ...credentials, ADMIN_PASSWORD: 'á'.repeat(37) },
])('rejects missing/unsafe credentials before touching the database: %#', async env => {
  await expect(createAdmin(prisma, env)).rejects.toThrow('Defina ADMIN_');
  expect(prisma.users.findUnique).not.toHaveBeenCalled();
  expect(prisma.users.create).not.toHaveBeenCalled();
});

test('never resets or promotes an existing account', async () => {
  prisma.users.findUnique.mockResolvedValue({ id: 1, role: 'operator' });
  await expect(createAdmin(prisma, credentials)).rejects.toThrow('Usuário já existe');
  expect(prisma.users.create).not.toHaveBeenCalled();
});

test('creates one administrator with a bcrypt hash and supplied identity', async () => {
  await createAdmin(prisma, credentials);
  expect(prisma.users.create).toHaveBeenCalledTimes(1);
  const { data } = prisma.users.create.mock.calls[0][0];
  expect(data).toMatchObject({ username: credentials.ADMIN_USERNAME, name: credentials.ADMIN_NAME, role: 'admin' });
  expect(data).not.toHaveProperty('password');
  expect(await bcrypt.compare(credentials.ADMIN_PASSWORD, data.password_hash)).toBe(true);
});
