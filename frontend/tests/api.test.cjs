const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loadApi(fetch, browser = false) {
  const effects = [];
  const context = {
    exports: {}, fetch, URL, URLSearchParams,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://api.test' } },
    localStorage: { clear: () => effects.push('clear-local') },
    sessionStorage: { clear: () => effects.push('clear-session') },
  };
  if (browser) {
    let href = '/operador';
    context.window = { location: {
      hostname: 'terminal.test', pathname: '/operador',
      get href() { return href; },
      set href(value) { href = value; effects.push(`navigate:${value}`); },
    } };
  }
  vm.runInNewContext(source, context);
  return { api: context.exports, effects, context };
}

const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
function page(total, number) {
  const offset = (number - 1) * 200;
  return {
    data: Array.from({ length: Math.max(0, Math.min(200, total - offset)) }, (_, i) => ({ id: offset + i })),
    meta: { total, page: number, limit: 200, totalPages: Math.ceil(total / 200) },
  };
}

test('loads every page, including items after the former 50/200 cutoff', async () => {
  const calls = [];
  const { api } = loadApi(async url => {
    calls.push(url);
    const number = Number(new URL(url).searchParams.get('page'));
    return response(page(451, number));
  });
  const rows = await api.fetchListaCompleta('/api/registros');
  assert.equal(rows.length, 451);
  assert.equal(rows[450].id, 450);
  assert.equal(new Set(rows.map(row => row.id)).size, 451);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(url => new URL(url).searchParams.get('limit') === '200'));
});

test('empty lists return an empty complete result', async () => {
  const { api } = loadApi(async () => response(page(0, 1)));
  assert.equal((await api.fetchListaCompleta('/api/requisicoes')).length, 0);
});

test('failure on a later page rejects instead of returning a partial dataset', async () => {
  let call = 0;
  const { api } = loadApi(async () => ++call === 1 ? response(page(201, 1)) : response({ error: 'Banco indisponível' }, 503));
  await assert.rejects(api.fetchListaCompleta('/api/registros'), /Banco indisponível/);
});

test('changing totals between pages rejects an inconsistent dataset', async () => {
  let call = 0;
  const { api } = loadApi(async () => response(++call === 1 ? page(201, 1) : page(202, 2)));
  await assert.rejects(api.fetchListaCompleta('/api/registros'), /dados mudaram/);
});

test('duplicate IDs across pages reject a shifted dataset', async () => {
  let call = 0;
  const { api } = loadApi(async () => {
    const data = page(201, ++call);
    if (call === 2) data.data[0].id = 0;
    return response(data);
  });
  await assert.rejects(api.fetchListaCompleta('/api/registros'), /dados mudaram/);
});

test('invalid or missing pagination metadata is never treated as a complete list', async () => {
  for (const body of [[], { data: [] }, { ...page(1, 1), meta: { ...page(1, 1).meta, limit: 50 } }]) {
    const { api } = loadApi(async () => response(body));
    await assert.rejects(api.fetchListaCompleta('/api/registros'), /paginação inválida/);
  }
});

test('short pages reject silently truncated server responses', async () => {
  const data = page(201, 1);
  data.data.pop();
  const { api } = loadApi(async () => response(data));
  await assert.rejects(api.fetchListaCompleta('/api/registros'), /dados incompletos/);
});

test('large histories stop with an explicit error and bounded requests', async () => {
  let calls = 0;
  const { api } = loadApi(async () => { calls++; return response(page(10001, 1)); });
  await assert.rejects(api.fetchListaCompleta('/api/registros'), /10.000/);
  assert.equal(calls, 1);
});

test('403 preserves the session and reports insufficient access', async () => {
  const { api, effects } = loadApi(async () => response({ error: 'Acesso negado para o seu perfil.' }, 403), true);
  await assert.rejects(api.fetchAutenticado('/api/users'), /Acesso negado/);
  assert.deepEqual(effects, []);
});

test('401 clears expired local session and redirects to login', async () => {
  const { api, effects } = loadApi(async () => response({ error: 'Não autenticado' }, 401), true);
  await assert.rejects(api.fetchAutenticado('/api/registros'), /expirado/);
  assert.deepEqual(effects, ['clear-local', 'clear-session', 'navigate:/login']);
});

test('logout only clears local state and navigates after server confirmation', async () => {
  let finish;
  const { api, effects } = loadApi(() => new Promise(resolve => { finish = resolve; }), true);
  const pending = api.encerrarSessao();
  assert.deepEqual(effects, []);
  finish(response({ message: 'Desconectado' }));
  await pending;
  assert.deepEqual(effects, ['clear-local', 'clear-session', 'navigate:/login']);
});

test('failed logout keeps the terminal visibly in its current session', async () => {
  const { api, effects } = loadApi(async () => response({ error: 'Não foi possível revogar a sessão' }, 503), true);
  await assert.rejects(api.encerrarSessao(), /revogar/);
  assert.deepEqual(effects, []);
});

test('logout uses the same API host as the lists on a remote intranet terminal', async () => {
  const calls = [];
  const { api, context } = loadApi(async (url, options) => {
    calls.push({ url, options });
    return response({ message: 'Desconectado' });
  }, true);
  delete context.process.env.NEXT_PUBLIC_API_URL;
  await api.encerrarSessao();
  assert.equal(calls[0].url, 'http://terminal.test:3001/api/auth/logout');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.credentials, 'include');
});

test('versioned commands require a version loaded from the server', () => {
  const { api } = loadApi(async () => response({}));
  assert.equal(api.getRegistroVersion({ version: 0 }), 0);
  assert.equal(api.getRegistroVersion({ version: 4 }), 4);
  for (const item of [undefined, {}, { version: -1 }, { version: 1.5 }]) {
    assert.throws(() => api.getRegistroVersion(item), /Atualize a lista/);
  }
});
