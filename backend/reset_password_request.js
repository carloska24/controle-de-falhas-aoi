const http = require('http');
const data = JSON.stringify({ username: 'DevAdmin', password: '123456' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/debug/reset-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Enviando requisição para resetar senha...');
const req = http.request(options, res => {
  console.log(`StatusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => {
  console.error('Erro na requisição:', error.message);
});

req.write(data);
req.end();
