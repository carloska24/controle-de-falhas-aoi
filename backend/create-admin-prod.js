// Script para criar o usuário admin em produção via API
// Basta rodar: node create-admin-prod.js

const https = require('https');

const data = JSON.stringify({
  name: 'Admin Principal',
  username: 'DevAdmin',
  password: '123456',
  role: 'admin'
});

const options = {
  hostname: 'controle-de-falhas-aoi.onrender.com',
  port: 443,
  path: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      console.log('Resposta:', JSON.parse(body));
    } catch {
      console.log('Resposta:', body);
    }
  });
});

req.on('error', error => {
  console.error('Erro:', error);
});

req.write(data);
req.end();
