const request = require('supertest');
const { app, initApp } = require('../server');

describe('Performance - /api/requisicoes', () => {
  beforeAll(async () => {
    await initApp();
  });

  it('deve responder rápido para paginação padrão', async () => {
    const start = Date.now();
    const res = await request(app)
      .get('/api/requisicoes?page=1&limit=50')
      .set('Authorization', 'Bearer FAKE_TOKEN');
    const duration = Date.now() - start;
    expect(res.statusCode).toBe(200);
    expect(duration).toBeLessThan(1000); // 1 segundo
  });
});
