// Somente testes: cria seu próprio cluster, nunca usa o DATABASE_URL do ambiente.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomBytes } = require('node:crypto');
const run = promisify(execFile);

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
}

async function startIsolatedPostgres() {
  if (!process.env.AOI_POSTGRES_BIN) throw new Error('Defina AOI_POSTGRES_BIN com a pasta bin do PostgreSQL para executar o teste nativo.');
  const bin = path.resolve(process.env.AOI_POSTGRES_BIN);
  const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  await Promise.all(['initdb', 'pg_ctl'].map(name => fs.access(executable(name))));
  const tempParent = await fs.realpath(os.tmpdir());
  const folder = await fs.mkdtemp(path.join(tempParent, 'aoi-pg-isolated-'));
  const dataDir = path.join(folder, 'data');
  const passwordFile = path.join(folder, 'password');
  const password = randomBytes(24).toString('hex');
  let initialized = false;
  let closed = false;
  async function close() {
    if (closed) return;
    if (initialized) {
      try { await run(executable('pg_ctl'), ['-D', dataDir, '-m', 'fast', '-w', '-t', '30', 'stop'], { windowsHide: true, timeout: 40000 }); }
      catch (error) { throw new Error('Não foi possível parar o PostgreSQL de testes; arquivos preservados em ' + folder, { cause: error }); }
    }
    const resolved = await fs.realpath(folder);
    if (path.dirname(resolved) !== tempParent || !path.basename(resolved).startsWith('aoi-pg-isolated-')) throw new Error('Pasta de testes fora do destino esperado; limpeza cancelada.');
    await fs.rm(resolved, { recursive: true, force: true });
    closed = true;
  }
  try {
    await fs.writeFile(passwordFile, password, { mode: 0o600 });
    const port = await availablePort();
    await run(executable('initdb'), ['-D', dataDir, '-U', 'aoi_test', '-A', 'scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C'], { windowsHide: true, timeout: 60000 });
    await run(executable('pg_ctl'), ['-D', dataDir, '-l', path.join(folder, 'server.log'), '-o', `-h 127.0.0.1 -p ${port} -c max_connections=20 -c shared_buffers=32MB`, '-w', '-t', '30', 'start'], { windowsHide: true, timeout: 40000 });
    initialized = true;
    const url = new URL(`postgresql://127.0.0.1:${port}/postgres`);
    url.username = 'aoi_test'; url.password = password;
    url.searchParams.set('application_name', 'aoi-native-app');
    return { connectionString: url.toString(), close };
  } catch (error) {
    // O pg_ctl pode expirar depois de iniciar o servidor; tente pará-lo antes de limpar.
    try { await fs.access(path.join(dataDir, 'postmaster.pid')); initialized = true; } catch {}
    await close();
    throw error;
  }
}

module.exports = { startIsolatedPostgres };
