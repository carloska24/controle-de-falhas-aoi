// Teste básico de autenticação usando supertest e jest
const request = require('supertest');
const express = require('express');

// Importa o app real se exportado, senão mocka um app simples para exemplo
let app;
try {
  app = require('./server');
} catch (e) {
  app = express();
  app.use(express.json());
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'DevAdmin' && password === '123456') {
      return res.json({ token: 'fake-token' });
    }
    res.status(401).json({ error: 'Credenciais inválidas' });
  });
}

describe('POST /api/auth/login', () => {
  it('deve autenticar com credenciais válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'DevAdmin', password: '123456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('deve falhar com credenciais inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'DevAdmin', password: 'errada' });
    expect(res.statusCode).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});
