// Script para resetar a senha do admin em produção via API
// Basta rodar: node reset-admin-prod.js

const https = require('https');

const data = JSON.stringify({
  username: 'DevAdmin',
  password: '123456'
});

const options = {
  hostname: 'controle-de-falhas-aoi.onrender.com',
  port: 443,
  path: '/api/debug/reset-password',
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
