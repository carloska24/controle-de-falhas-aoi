const request = require('supertest');
const { app, initApp } = require('../server');

describe('Performance - /api/relatorio-falhas', () => {
  let token;
  beforeAll(async () => {
    await initApp();
    // Faz login e obtém token real
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'DevAdmin', password: '123456' });
    token = loginRes.body && loginRes.body.token;
    if (!token && loginRes.header['set-cookie']) {
      const cookie = loginRes.header['set-cookie'].find(c => c.includes('aoi_token'));
      if (cookie) {
        token = cookie.split('aoi_token=')[1].split(';')[0];
      }
    }
  });

  it('deve responder rápido para paginação padrão', async () => {
    const start = Date.now();
    const res = await request(app)
      .get('/api/relatorio-falhas?page=1&limit=50')
      .set('Authorization', `Bearer ${token}`);
    const duration = Date.now() - start;
    expect(res.statusCode).toBe(200);
    expect(duration).toBeLessThan(1000); // 1 segundo
  });
});
