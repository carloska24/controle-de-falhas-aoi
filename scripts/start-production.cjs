'use strict';

// Windows launcher: existing database + existing Next build, with no schema/seed changes.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createHash } = require('node:crypto');
const execute = promisify(execFile);
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const runtimeDir = path.join(root, '.tools', 'production');
const statePath = path.join(runtimeDir, 'servers.json');
const lockPath = path.join(runtimeDir, 'starting.lock');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const launched = [];
let state = {};

function requireFile(file, message) {
  if (!fs.existsSync(file)) throw new Error(message);
}

function alive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function persistState() {
  const temporary = statePath + '.' + process.pid + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2));
  fs.renameSync(temporary, statePath);
}

async function ownsProcess(saved, entry) {
  if (!saved || !alive(saved.pid) || saved.entry !== entry || saved.mode !== 'production') return false;
  // Check the actual process as well: a stale PID must never identify another app as ours.
  const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `(Get-CimInstance Win32_Process -Filter 'ProcessId=${saved.pid}').CommandLine`], { windowsHide: true });
  return stdout.toLowerCase().includes(entry.toLowerCase());
}

async function isPortOpen(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(1000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

async function healthy(url, expectedJson) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: 'manual' });
    if (response.status !== 200) return false;
    return expectedJson ? expectedJson(await response.json()) : true;
  } catch { return false; }
}

async function waitHealthy(url, expectedJson, child) {
  const deadline = Date.now() + 45000;
  do {
    if (child && (child.exitCode !== null || child.startError)) break;
    if (await healthy(url, expectedJson)) return;
    await pause(500);
  } while (Date.now() < deadline);
  throw new Error(`O servico nao ficou pronto: ${url}. Consulte os logs em .tools\\production.`);
}

async function startServer(name, entry, args, cwd, env, port, url, expectedJson, configuration) {
  const saved = state[name];
  if (await ownsProcess(saved, entry)) {
    if (saved.configuration !== configuration) {
      throw new Error(`${name}: a configuracao ou build mudou. Encerre o processo ${saved.pid} antes de iniciar a nova versao.`);
    }
    await waitHealthy(url, expectedJson);
    console.log(`[OK] ${name} ja estava em producao (PID ${saved.pid}).`);
    return;
  }
  if (await isPortOpen(port)) {
    throw new Error(`Porta ${port} ocupada por um servidor iniciado fora deste atalho. Encerre essa instancia antes de usar o inicializador de producao.`);
  }
  const out = fs.openSync(path.join(runtimeDir, `${name}.out.log`), 'a');
  const err = fs.openSync(path.join(runtimeDir, `${name}.err.log`), 'a');
  let child;
  try {
    child = spawn(process.execPath, args, { cwd, env, detached: true, windowsHide: true, stdio: ['ignore', out, err] });
    child.on('error', error => { child.startError = error; });
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
  launched.push({ name, child });
  await waitHealthy(url, expectedJson, child);
  state[name] = { pid: child.pid, entry, mode: 'production', configuration, port, startedAt: new Date().toISOString() };
  persistState();
  child.unref();
  console.log(`[OK] ${name} iniciado em producao (PID ${child.pid}).`);
}

async function ensureDatabase(env) {
  const { Client } = require(path.join(backend, 'node_modules', 'pg'));
  async function connected() {
    const client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 2000,
      query_timeout: 2000, application_name: 'aoi-production-launcher' });
    try { await client.connect(); await client.query('SELECT 1'); return true; }
    catch { return false; }
    finally { await client.end().catch(() => {}); }
  }
  if (await connected()) { console.log('[OK] PostgreSQL acessivel.'); return; }
  const database = new URL(env.DATABASE_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname)) {
    throw new Error('PostgreSQL remoto indisponivel. Confira a conexao e DATABASE_URL em backend\\.env.');
  }
  const binaryDir = env.AOI_POSTGRES_BIN || path.join(root, '.tools', 'pgsql17', 'pgsql', 'bin');
  const dataDir = env.AOI_POSTGRES_DATA || path.join(root, '.tools', 'pgdata');
  const pgCtl = path.join(binaryDir, 'pg_ctl.exe');
  requireFile(pgCtl, 'PostgreSQL indisponivel. Configure AOI_POSTGRES_BIN no backend\\.env com a pasta bin da instalacao local.');
  requireFile(path.join(dataDir, 'PG_VERSION'), 'Diretorio de dados PostgreSQL nao encontrado. Configure AOI_POSTGRES_DATA no backend\\.env. O inicializador nao cria nem substitui bancos.');
  const port = Number(database.port || 5432);
  if (await isPortOpen(port)) throw new Error('PostgreSQL responde na porta, mas a conexao falhou. Confira DATABASE_URL e as credenciais; nenhuma instancia adicional foi iniciada.');
  console.log('[...] Iniciando o PostgreSQL local existente...');
  const host = database.hostname === '[::1]' ? '::1' : '127.0.0.1';
  try {
    await execute(pgCtl, ['-D', dataDir, '-l', path.join(runtimeDir, 'postgresql.log'),
      '-o', `-h ${host} -p ${port}`, '-w', '-t', '45', 'start'], { windowsHide: true, timeout: 50000 });
  } catch {
    throw new Error('Nao foi possivel iniciar o PostgreSQL. Consulte .tools\\production\\postgresql.log.');
  }
  if (!await connected()) throw new Error('PostgreSQL iniciou, mas a conexao ao banco configurado falhou. Confira DATABASE_URL e as credenciais.');
  console.log('[OK] PostgreSQL iniciado e conexao conferida.');
}

async function main() {
  if (process.platform !== 'win32') throw new Error('Este inicializador foi preparado para Windows.');
  requireFile(path.join(backend, '.env'), 'Configure backend\\.env antes de iniciar.');
  requireFile(path.join(backend, 'node_modules', 'dotenv', 'package.json'), 'Dependencias do backend ausentes. Execute npm ci na pasta backend.');
  requireFile(path.join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next'), 'Dependencias do frontend ausentes. Execute npm ci na pasta frontend.');
  requireFile(path.join(frontend, '.next', 'BUILD_ID'), 'Build de producao ausente. Execute npm run build na pasta frontend.');
  const dotenv = require(path.join(backend, 'node_modules', 'dotenv'));
  const envFile = fs.readFileSync(path.join(backend, '.env'), 'utf8');
  const env = { ...process.env, ...dotenv.parse(envFile), NODE_ENV: 'production', DEBUG_ROUTES_ENABLED: 'false', DEMO_ENABLED: 'true' };
  if (!env.DATABASE_URL || !env.JWT_SECRET) throw new Error('Configure DATABASE_URL e JWT_SECRET em backend\\.env.');
  require(path.join(backend, 'src', 'config', 'cors')).getCorsOptions(env);
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 3000) throw new Error('PORT do backend deve ser uma porta valida diferente de 3000.');
  fs.mkdirSync(runtimeDir, { recursive: true });
  try {
    const lock = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    fs.closeSync(lock);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (alive(readJson(lockPath).pid)) { console.log('A inicializacao ja esta em andamento em outra janela.'); return; }
    fs.unlinkSync(lockPath);
    return main();
  }
  try {
    console.log('\nControle de Falhas AOI - Producao\n');
    state = readJson(statePath);
    await ensureDatabase(env);
    const digest = value => createHash('sha256').update(value).digest('hex');
    const backendEntry = path.join(backend, 'server.js');
    const nextEntry = path.join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next');
    await startServer('backend', backendEntry, ['-r', path.join(backend, 'node_modules', 'dotenv', 'config.js'), backendEntry],
      backend, env, port, `http://127.0.0.1:${port}/health/db`, data => data.status === 'ok' && data.db === 'reachable', digest(envFile));
    await startServer('frontend', nextEntry, [nextEntry, 'start', '-p', '3000', '-H', '0.0.0.0'],
      frontend, { ...process.env, NODE_ENV: 'production' }, 3000, 'http://127.0.0.1:3000/login', null,
      digest(fs.readFileSync(path.join(frontend, '.next', 'BUILD_ID'), 'utf8')));
    console.log('\nSistema pronto: http://localhost:3000');
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses || []) {
        if (!address.internal && address.family === 'IPv4' && address.address.startsWith('192.168.0.')) {
          const origin = `http://${address.address}:3000`;
          if ((env.CORS_ORIGIN || '').split(',').some(value => value.trim() === origin)) console.log(`Intranet configurada: ${origin}`);
        }
      }
    }
    console.log('Logs: ' + runtimeDir);
    console.log('Modo producao: DEMO somente para administradores. Fechar esta janela nao encerra os servidores.');
    if (!process.argv.includes('--no-browser')) {
      await execute('rundll32.exe', ['url.dll,FileProtocolHandler', 'http://localhost:3000'], { windowsHide: true })
        .catch(() => console.log('Abra http://localhost:3000 no navegador.'));
    }
  } catch (error) {
    // Roll back only Node processes created by this invocation; never stop an existing database.
    for (const { name, child } of launched.reverse()) {
      if (child.exitCode === null && child.pid) child.kill();
      if (state[name]?.pid === child.pid) delete state[name];
    }
    persistState();
    throw error;
  } finally {
    fs.unlinkSync(lockPath);
  }
}

main().catch(error => {
  console.error('\n[ERRO] ' + error.message);
  process.exitCode = 1;
});
