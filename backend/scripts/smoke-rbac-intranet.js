/* eslint-disable no-console */
const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const user = process.env.SMOKE_USER;
const password = process.env.SMOKE_PASSWORD;

const expectedByRole = {
  admin: {
    users: 200,
    registros: 200,
    requisicoes: 200,
    relatorioFalhas: 200,
    omsAtivas: 200,
  },
  operator: {
    users: 403,
    registros: 200,
    requisicoes: 200,
    relatorioFalhas: 403,
    omsAtivas: 200,
  },
  reparo: {
    users: 403,
    registros: 200,
    requisicoes: 403,
    relatorioFalhas: 403,
    omsAtivas: 200,
  },
  qualidade: {
    users: 403,
    registros: 200,
    requisicoes: 403,
    relatorioFalhas: 200,
    omsAtivas: 200,
  },
  almoxarifado: {
    users: 403,
    registros: 200,
    requisicoes: 200,
    relatorioFalhas: 403,
    omsAtivas: 200,
  },
  lider_smt: {
    users: 403,
    registros: 200,
    requisicoes: 403,
    relatorioFalhas: 403,
    omsAtivas: 403,
  },
};

const checks = [
  { key: 'users', method: 'GET', path: '/api/users' },
  { key: 'registros', method: 'GET', path: '/api/registros?page=1&limit=1' },
  { key: 'requisicoes', method: 'GET', path: '/api/requisicoes?page=1&limit=1' },
  { key: 'relatorioFalhas', method: 'GET', path: '/api/relatorio-falhas?page=1&limit=1' },
  { key: 'omsAtivas', method: 'GET', path: '/api/oms?status=ativa' },
];

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }
  return { response, body };
}

async function run() {
  if (!user || !password) {
    throw new Error('Defina SMOKE_USER e SMOKE_PASSWORD para executar o smoke RBAC.');
  }

  console.log(`[RBAC] Base URL: ${baseUrl}`);

  const login = await request(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password }),
  });

  if (!login.response.ok) {
    throw new Error(`[RBAC] Login falhou (${login.response.status}).`);
  }

  const cookie = login.response.headers.get('set-cookie') || '';
  if (!cookie.includes('aoi_token=')) {
    throw new Error('[RBAC] Cookie aoi_token não recebido no login.');
  }

  const me = await request(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
  if (!me.response.ok || !me.body?.user?.role) {
    throw new Error('[RBAC] Não foi possível identificar role do usuário logado.');
  }

  const role = me.body.user.role;
  const expected = expectedByRole[role];
  if (!expected) {
    throw new Error(`[RBAC] Role não mapeada no script: ${role}`);
  }

  console.log(`[RBAC] Usuário autenticado com role=${role}`);

  let failures = 0;
  for (const check of checks) {
    const result = await request(`${baseUrl}${check.path}`, {
      method: check.method,
      headers: { Cookie: cookie },
    });

    const expectedStatus = expected[check.key];
    const ok = result.response.status === expectedStatus;
    if (!ok) {
      failures += 1;
      console.error(
        `[RBAC] FALHA ${check.path} -> esperado ${expectedStatus}, obtido ${result.response.status}`
      );
    } else {
      console.log(`[RBAC] OK ${check.path} -> ${result.response.status}`);
    }
  }

  await request(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });

  if (failures > 0) {
    throw new Error(`[RBAC] ${failures} validação(ões) falharam para role=${role}.`);
  }

  console.log(`[RBAC] Sucesso: permissões válidas para role=${role}.`);
}

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
