const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/prisma', () => ({
  users: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  registros: { count: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  requisicoes: { deleteMany: jest.fn() },
  oms_pausadas: { deleteMany: jest.fn() },
  oms_finalizadas: { deleteMany: jest.fn() },
  oms_ativas: { deleteMany: jest.fn() },
  ordens_manufatura: { deleteMany: jest.fn() },
  placas_inspecionadas: { deleteMany: jest.fn() },
  eventos_om: { deleteMany: jest.fn() },
  eventos_entrega: { deleteMany: jest.fn() },
  requisicao_registros: { findFirst: jest.fn(), deleteMany: jest.fn() },
  exclusoes_requisicoes: { deleteMany: jest.fn() },
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
  prisma.requisicao_registros.findFirst.mockResolvedValue(null);
  for (const model of ['registros', 'requisicoes', 'eventos_entrega', 'requisicao_registros',
    'exclusoes_requisicoes', 'placas_inspecionadas', 'eventos_om', 'oms_ativas', 'oms_pausadas', 'oms_finalizadas', 'ordens_manufatura']) {
    prisma[model].deleteMany.mockResolvedValue({ count: 0 });
  }
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

describe('Demo cleanup on logout', () => {
  const tokenFor = id => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_ROUTES_ENABLED = 'true';
  });

  test('valid admin logout cleans the reserved namespace before clearing the cookie', async () => {
    await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(2)}`).expect(200);
    for (const model of ['registros', 'requisicoes']) {
      expect(prisma[model].deleteMany).toHaveBeenCalledWith({ where: { om: { startsWith: 'DEMO-' } } });
    }
    for (const model of ['placas_inspecionadas', 'eventos_om', 'oms_ativas', 'oms_pausadas', 'oms_finalizadas', 'ordens_manufatura']) {
      expect(prisma[model].deleteMany).toHaveBeenCalledWith({ where: { omNumber: { startsWith: 'DEMO-' } } });
    }
    expect(prisma.eventos_entrega.deleteMany).toHaveBeenCalledWith({ where: { requisicao: { om: { startsWith: 'DEMO-' } } } });
    expect(prisma.exclusoes_requisicoes.deleteMany).toHaveBeenCalledWith({ where: {
      snapshot: { path: ['requisicao', 'om'], string_starts_with: 'DEMO-' },
    } });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable', timeout: 15000 });
  });

  test.each(['operator','almoxarifado','reparo','qualidade','lider_smt'])('logout of %s cannot clean shared demonstrations', async role => {
    users.get(1).role = role;
    await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(1)}`).expect(200);
    expect(prisma.registros.deleteMany).not.toHaveBeenCalled();
  });

  test.each([['production','true'], ['development','false']])('cleanup is disabled with NODE_ENV=%s and flag=%s', async (env, flag) => {
    process.env.NODE_ENV = env;
    process.env.DEBUG_ROUTES_ENABLED = flag;
    await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(2)}`).expect(200);
    expect(prisma.registros.deleteMany).not.toHaveBeenCalled();
  });

  test('a stale session or forged admin role never triggers cleanup', async () => {
    users.get(2).session_version = 1;
    await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(2)}`).expect(200);
    await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${jwt.sign({ id: 1, role: 'admin', sessionVersion: 0 }, process.env.JWT_SECRET)}`).expect(200);
    expect(prisma.registros.deleteMany).not.toHaveBeenCalled();
  });

  test('mixed demo/real material links stop cleanup before deleting any data', async () => {
    prisma.requisicao_registros.findFirst.mockResolvedValue({ registro_id: 'REAL-RECORD', requisicao_id: 1 });
    const response = await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(2)}`).expect(503);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(prisma.registros.deleteMany).not.toHaveBeenCalled();
  });

  test('cleanup failure cannot return success or clear the browser cookie', async () => {
    prisma.eventos_entrega.deleteMany.mockRejectedValue(new Error('database unavailable'));
    const response = await request(app).post('/api/auth/logout').set('Cookie', `aoi_token=${tokenFor(2)}`).expect(503);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body.error).toContain('sessão foi mantida');
    expect(prisma.ordens_manufatura.deleteMany).not.toHaveBeenCalled();
  });
});

describe('Administrator password reset', () => {
  const tokenFor = id => jwt.sign({ id, sessionVersion: 0 }, process.env.JWT_SECRET);
  const reset = (body, id = '1') => request(app).put(`/api/users/${id}/password`)
    .set('Authorization', `Bearer ${tokenFor(2)}`).send(body);

  test('password-only reset preserves account fields, replaces the hash and revokes old cookies', async () => {
    const previous = await request(app).post('/api/auth/login')
      .send({ username: 'test-operator', password: 'test-password-only' }).expect(200);
    const oldCookie = previous.headers['set-cookie'][0].split(';')[0];
    const password = '  nova-senha-á  ';
    const response = await reset({ password }).expect(200);
    expect(response.body).toEqual({ message: 'Senha redefinida. As sessões anteriores foram encerradas.' });
    expect(prisma.users.update.mock.calls[0][0].data).toEqual({
      password_hash: expect.any(String), session_version: { increment: 1 },
    });
    expect(users.get(1)).toMatchObject({ name: 'Operador Teste', username: 'test-operator', role: 'operator', session_version: 1 });
    expect(await bcrypt.compare(password, users.get(1).password_hash)).toBe(true);
    await request(app).get('/api/auth/me').set('Cookie', oldCookie).expect(401);
    await request(app).post('/api/auth/login')
      .send({ username: 'test-operator', password: 'test-password-only' }).expect(401);
    await request(app).post('/api/auth/login').send({ username: 'test-operator', password }).expect(200);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(2)}`).expect(200);
  });

  test('missing sessions and operators cannot reset passwords', async () => {
    await request(app).put('/api/users/1/password').send({ password: 'new-password' }).expect(401);
    await request(app).put('/api/users/2/password').set('Authorization', `Bearer ${tokenFor(1)}`)
      .send({ password: 'new-password' }).expect(403);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  test.each([{}, { password: '' }, { password: '12345' }, { password: '      ' },
    { password: 'á'.repeat(37) }, { password: 'a'.repeat(73) }, { password: 'valid-pass', role: 'admin' }])(
    'invalid reset body is rejected before changing the account %#', async body => {
      await reset(body).expect(400);
      expect(prisma.users.update).not.toHaveBeenCalled();
    },
  );

  test.each(['0', '-1', '1abc', '1.5', '2147483648'])('invalid target %s is rejected', async id => {
    await reset({ password: 'valid-password' }, id).expect(400);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  test('a missing user returns 404 and a failed write preserves the previous password and sessions', async () => {
    prisma.users.update.mockRejectedValueOnce({ code: 'P2025' });
    await reset({ password: 'valid-password' }, '999').expect(404);
    const previousHash = users.get(1).password_hash;
    prisma.users.update.mockRejectedValueOnce(new Error('private SQL details'));
    const response = await reset({ password: 'valid-password' }).expect(503);
    expect(response.body.error).not.toContain('private');
    expect(users.get(1)).toMatchObject({ password_hash: previousHash, session_version: 0 });
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(1)}`).expect(200);
  });

  test('resetting the current administrator revokes that session as well', async () => {
    await reset({ password: 'new-admin-password' }, '2').expect(200);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(2)}`).expect(401);
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

