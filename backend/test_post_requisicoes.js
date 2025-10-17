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
    const token = loginJson.token;
    console.log('GOT_TOKEN', token && token.substring(0,16) + '...');

    // POST to requisicoes with the registro id
  const registroIds = ['mgv85wmmc3r2hzd6b2w'];
    const resp = await fetch(base + '/api/requisicoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ registroIds })
    });
    const json = await resp.json();
    console.log('POST_RESP_STATUS', resp.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
})();
