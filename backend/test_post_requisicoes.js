(async () => {
  const fetch = require('node-fetch');
  try {
    const base = 'http://127.0.0.1:3001';
    // Login as DevAdmin (created by seed)
    const loginResp = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'DevAdmin', password: '123456' })
    });
    const loginJson = await loginResp.json();
    if (!loginResp.ok) { console.error('LOGIN_FAILED', loginJson); process.exit(1); }
    // Captura cookie do header 'set-cookie' e reutiliza como header 'Cookie' nas requisições subsequentes
    const setCookie = loginResp.headers.get('set-cookie');
    if (!setCookie) { console.error('NO_SET_COOKIE_IN_LOGIN'); process.exit(1); }
    console.log('GOT_SET_COOKIE', setCookie.split(';')[0]);

    // POST to requisicoes with the registro id
    const registroIds = ['mgv85wmmc3r2hzd6b2w'];
    const resp = await fetch(base + '/api/requisicoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': setCookie.split(';')[0] }, body: JSON.stringify({ registroIds })
    });
    const json = await resp.json();
    console.log('POST_RESP_STATUS', resp.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
})();
