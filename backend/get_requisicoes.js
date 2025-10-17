(async () => {
  const fetch = require('node-fetch');
  try {
    const base = 'http://127.0.0.1:3001';
    const loginResp = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'DevAdmin', password: '123456' })
    });
    const loginJson = await loginResp.json();
    if (!loginResp.ok) { console.error('LOGIN_FAILED', loginJson); process.exit(1); }
    const token = loginJson.token;
    console.log('GOT_TOKEN', token && token.substring(0,16) + '...');

    const resp = await fetch(base + '/api/requisicoes', {
      method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    });
    const json = await resp.json();
    console.log('GET /api/requisicoes status=', resp.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
})();
