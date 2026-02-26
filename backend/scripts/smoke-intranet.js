/* eslint-disable no-console */
const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const user = process.env.SMOKE_USER;
const password = process.env.SMOKE_PASSWORD;

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { response, data };
}

async function run() {
  if (!user || !password) {
    throw new Error('Defina SMOKE_USER e SMOKE_PASSWORD para executar o smoke test.');
  }

  console.log(`[SMOKE] Base URL: ${baseUrl}`);

  const health = await requestJson(`${baseUrl}/health`);
  if (!health.response.ok) throw new Error(`[SMOKE] /health falhou: ${health.response.status}`);
  console.log('[SMOKE] /health OK');

  const healthDb = await requestJson(`${baseUrl}/health/db`);
  if (!healthDb.response.ok) throw new Error(`[SMOKE] /health/db falhou: ${healthDb.response.status}`);
  console.log('[SMOKE] /health/db OK');

  const login = await requestJson(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password }),
  });

  if (!login.response.ok) {
    throw new Error(
      `[SMOKE] Login falhou (${login.response.status}): ${login.data?.error || 'sem detalhe'}`
    );
  }

  const setCookie = login.response.headers.get('set-cookie') || '';
  if (!setCookie.includes('aoi_token=')) {
    throw new Error('[SMOKE] Login não retornou cookie aoi_token.');
  }
  console.log('[SMOKE] Login OK com cookie aoi_token');

  const me = await requestJson(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: setCookie },
  });
  if (!me.response.ok) throw new Error(`[SMOKE] /api/auth/me falhou: ${me.response.status}`);
  console.log(`[SMOKE] /api/auth/me OK (role=${me.data?.user?.role || 'desconhecida'})`);

  const registros = await requestJson(`${baseUrl}/api/registros?page=1&limit=1`, {
    headers: { Cookie: setCookie },
  });
  if (!registros.response.ok) {
    throw new Error(`[SMOKE] /api/registros falhou: ${registros.response.status}`);
  }
  console.log('[SMOKE] /api/registros OK');

  const logout = await requestJson(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: setCookie },
  });
  if (!logout.response.ok) throw new Error(`[SMOKE] /api/auth/logout falhou: ${logout.response.status}`);
  console.log('[SMOKE] /api/auth/logout OK');

  console.log('[SMOKE] Sucesso: API intranet operacional.');
}

run().catch(error => {
  console.error('[SMOKE] Falha:', error.message);
  process.exit(1);
});
