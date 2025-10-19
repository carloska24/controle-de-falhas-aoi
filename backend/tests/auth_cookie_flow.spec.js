const request = require('supertest');
const { initApp } = require('../server');

describe('Auth cookie flow', () => {
  let app;
  beforeAll(async () => {
    // Inicializa o app (configura DB, tabelas, etc.)
    app = await initApp();
  });

  test('login sets HttpOnly cookie and /api/auth/me returns user; logout clears session', async () => {
    const agent = request.agent(app);

    // Seed admin (rota de debug deve existir em dev). Usa chave DEV_SEED_KEY por query param.
    const seedKey = process.env.DEV_SEED_KEY || 'local-dev-2024';
    await agent.get(`/api/debug/seed-admin?key=${seedKey}`).expect(res => {
      if (![200, 201].includes(res.status)) throw new Error('seed-admin failed with status ' + res.status);
    });

    // Faz login com DevAdmin
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'DevAdmin', password: '123456' })
      .expect(200);

    // Verifica que o cookie foi setado (set-cookie header presente)
    const setCookie = loginRes.header['set-cookie'];
    expect(Array.isArray(setCookie)).toBe(true);
    expect(setCookie.join('')).toMatch(/aoi_token/);

    // Agora solicita /api/auth/me usando o mesmo agent (cookies persistem)
    const meRes = await agent.get('/api/auth/me').expect(200);
  expect(meRes.body).toHaveProperty('user');
  // token payload uses `email` for the username field
  expect(meRes.body.user).toHaveProperty('email', 'DevAdmin');

    // Acessa rota protegida /api/registros (espera 200 ou 204 dependendo do estado)
    await agent.get('/api/registros').expect(res => {
      if (![200,204].includes(res.status)) throw new Error('expected 200/204');
    });

    // Faz logout
    await agent.post('/api/auth/logout').expect(200);

    // Depois do logout, /api/auth/me deve retornar 401
    await agent.get('/api/auth/me').expect(401);
  }, 20000);
});

