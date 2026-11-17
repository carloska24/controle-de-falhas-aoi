const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => ({
  users: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  registros: { count: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  requisicoes: { deleteMany: jest.fn() },
  oms_pausadas: { deleteMany: jest.fn() },
  oms_finalizadas: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { app } = require('../server');
const users = new Map();

beforeEach(async () => {
  jest.clearAllMocks();
  users.clear();
  users.set(1, {
    id: 1, name: 'Operador Teste', username: 'test-operator', role: 'operator',
    password_hash: await bcrypt.hash('test-password-only', 4), session_version: 0,
  });
  users.set(2, { id: 2, name: 'Admin Teste', username: 'test-admin', role: 'admin', session_version: 0 });
  prisma.users.findUnique.mockImplementation(async ({ where }) =>
    where.id ? users.get(where.id) || null : [...users.values()].find(u => u.username === where.username) || null
  );
  prisma.users.updateMany.mockImplementation(async ({ where }) => {
    const user = users.get(where.id);
    if (!user || user.session_version !== where.session_version) return { count: 0 };
    user.session_version++;
    return { count: 1 };
  });
  prisma.users.update.mockImplementation(async ({ where, data }) => {
    const user = users.get(where.id);
    const nextVersion = user.session_version + data.session_version.increment;
    Object.assign(user, data, { session_version: nextVersion });
    return user;
  });
  prisma.registros.count.mockResolvedValue(0);
  prisma.registros.findMany.mockResolvedValue([]);
  prisma.$transaction.mockImplementation(callback => typeof callback === 'function' ? callback(prisma) : Promise.all(callback));
});

afterEach(() => {
  process.env.NODE_ENV = 'test';
  process.env.DEBUG_ROUTES_ENABLED = 'false';
  process.env.COOKIE_SECURE = 'false';
  process.env.COOKIE_SAMESITE = 'Lax';
  delete process.env.COOKIE_DOMAIN;
});

describe('Auth cookie flow', () => {
  test('login sets HttpOnly cookie and /api/auth/me returns user; logout clears session', async () => {
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'test-operator', password: 'test-password-only' })
      .expect(200);

    expect(loginRes.headers['set-cookie'].join(';')).toMatch(/aoi_token=.*HttpOnly/);
    expect(loginRes.body.user).not.toHaveProperty('password_hash');
    const meRes = await agent.get('/api/auth/me').expect(200);
    expect(meRes.body.user).toMatchObject({ email: 'test-operator', role: 'operator' });
    await agent.get('/api/registros').expect(200);
    await agent.get('/api/users').expect(403);
    const originalCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', originalCookie).expect(401);
    expect(prisma.registros.deleteMany).not.toHaveBeenCalled();
    expect(prisma.requisicoes.deleteMany).not.toHaveBeenCalled();

    expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { username: 'test-operator' } });
  });

  test('rejects wrong passwords without issuing a cookie', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: 'test-operator', password: 'incorrect' }).expect(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('protects routes against missing and invalid sessions', async () => {
    await request(app).get('/health').expect(200);
    await request(app).get('/api/registros').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', 'aoi_token=invalid').expect(401);
  });

  test('validation logs never include the login request body or password', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await request(app).post('/api/auth/login')
        .send({ username: '', password: 'private-value-must-not-be-logged' }).expect(400);
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private-value-must-not-be-logged');
    } finally {
      errorLog.mockRestore();
    }
  });
});

describe('Session revocation', () => {
  const tokenFor = id => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);

  test('deletion invalidates an existing token immediately', async () => {
    const token = tokenFor(1);
    users.delete(1);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  test.each([
    { name: 'Operador Alterado', username: 'test-operator', role: 'operator', password: 'new-test-password' },
    { name: 'Admin Alterado', username: 'test-admin', role: 'operator' },
  ])('account edits/password/role invalidate previous tokens', async body => {
    const targetId = body.username === 'test-admin' ? 2 : 1;
    const oldToken = tokenFor(targetId);
    await request(app).put(`/api/users/${targetId}`)
      .set('Authorization', `Bearer ${tokenFor(2)}`).send(body).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`).expect(401);
    expect(prisma.users.update.mock.calls[0][0].data.session_version).toEqual({ increment: 1 });
  });

  test('current database role overrides stale JWT role claims', async () => {
    const token = jwt.sign({ id: 1, sessionVersion: 0, role: 'admin' }, process.env.JWT_SECRET);
    await request(app).get('/api/users').set('Authorization', `Bearer ${token}`).expect(403);
  });

  test('legacy tokens without session version require new login', async () => {
    const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  test('database failure cannot be mistaken for a valid session or successful logout', async () => {
    prisma.users.findUnique.mockRejectedValue(new Error('database unavailable'));
    const headers = { Authorization: `Bearer ${tokenFor(1)}` };
    await request(app).get('/api/auth/me').set(headers).expect(503);
    prisma.users.updateMany.mockRejectedValue(new Error('database unavailable'));
    await request(app).post('/api/auth/logout').set(headers).expect(503);
  });

  test.each([undefined, 'invalid', jwt.sign({ id: 1, sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: -1 })])(
    'logout remains idempotent with absent/invalid/expired token: %#', async token => {
      const req = request(app).post('/api/auth/logout');
      if (token) req.set('Authorization', `Bearer ${token}`);
      const res = await req.expect(200);
      expect(res.headers['set-cookie'][0]).toMatch(/aoi_token=;.*Expires=/);
      expect(prisma.users.updateMany).not.toHaveBeenCalled();
    }
  );

  test('cookie domain/security/sameSite match when clearing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = 'aoi.example.test';
    process.env.COOKIE_SECURE = 'true';
    process.env.COOKIE_SAMESITE = 'None';
    const res = await request(app).post('/api/auth/logout').expect(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toContain('Domain=aoi.example.test');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=None');
  });

  test('replayed old logout token does not revoke a newer session version', async () => {
    const token = tokenFor(1);
    users.get(1).session_version = 1;
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(200);
    expect(users.get(1).session_version).toBe(1);
  });
});

describe('Debug isolation', () => {
  const adminToken = jwt.sign({ id: 2, role: 'admin', sessionVersion: 0 }, process.env.JWT_SECRET);
  afterEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.DEBUG_ROUTES_ENABLED = 'false';
  });

  test('admin bootstrap HTTP endpoint no longer exists', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_ROUTES_ENABLED = 'true';
    await request(app).get('/api/debug/seed-admin?key=local-dev-2024').expect(404);
  });

  test.each(['false', 'true'])('production blocks debug even with flag %s', async flag => {
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_ROUTES_ENABLED = flag;
    await request(app).post('/api/debug/populate').set('Cookie', `aoi_token=${adminToken}`).send({}).expect(404);
    await request(app).post('/api/debug/clear').set('Cookie', `aoi_token=${adminToken}`).send({}).expect(404);
  });

  test('development requires explicit opt-in and admin authentication', async () => {
    process.env.NODE_ENV = 'development';
    await request(app).post('/api/debug/clear').expect(404);
    process.env.DEBUG_ROUTES_ENABLED = 'true';
    await request(app).post('/api/debug/clear').expect(401);
    const operatorToken = jwt.sign({ id: 1, role: 'operator', sessionVersion: 0 }, process.env.JWT_SECRET);
    await request(app).post('/api/debug/clear').set('Cookie', `aoi_token=${operatorToken}`).expect(403);
  });

  test('enabled development cleanup targets only demo records and requests', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_ROUTES_ENABLED = 'true';
    jest.clearAllMocks();
    await request(app).post('/api/debug/clear').set('Cookie', `aoi_token=${adminToken}`).expect(200);
    const filter = { where: { om: { startsWith: 'DEMO-' } } };
    expect(prisma.registros.deleteMany).toHaveBeenCalledWith(filter);
    expect(prisma.requisicoes.deleteMany).toHaveBeenCalledWith(filter);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.users.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
  });
});

