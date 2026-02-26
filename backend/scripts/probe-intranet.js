/* eslint-disable no-console */
const baseUrl = process.env.PROBE_BASE_URL || 'http://localhost:3001';
const iterations = Number(process.env.PROBE_ITERATIONS || 30);
const intervalMs = Number(process.env.PROBE_INTERVAL_MS || 1000);
const timeoutMs = Number(process.env.PROBE_TIMEOUT_MS || 4000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function probe(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const elapsed = Date.now() - start;
    return { ok: response.ok, status: response.status, elapsed };
  } catch (error) {
    const elapsed = Date.now() - start;
    return { ok: false, status: 0, elapsed, error: error?.name || 'NetworkError' };
  } finally {
    clearTimeout(timer);
  }
}

function summarize(samples) {
  if (samples.length === 0) return null;

  const sorted = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((acc, v) => acc + v, 0) / samples.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    avg: Math.round(avg),
    p50,
    p95,
    p99,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

async function run() {
  console.log(`[PROBE] Base URL: ${baseUrl}`);
  console.log(
    `[PROBE] Iterações=${iterations} | Intervalo=${intervalMs}ms | Timeout=${timeoutMs}ms`
  );

  const healthLat = [];
  const dbLat = [];
  let healthOk = 0;
  let dbOk = 0;

  for (let i = 1; i <= iterations; i += 1) {
    const h = await probe('/health');
    const d = await probe('/health/db');

    if (h.ok) {
      healthOk += 1;
      healthLat.push(h.elapsed);
    }
    if (d.ok) {
      dbOk += 1;
      dbLat.push(d.elapsed);
    }

    const healthMsg = h.ok ? `OK ${h.elapsed}ms` : `FAIL ${h.status || h.error}`;
    const dbMsg = d.ok ? `OK ${d.elapsed}ms` : `FAIL ${d.status || d.error}`;
    console.log(`[PROBE] #${i} health=${healthMsg} | health/db=${dbMsg}`);

    if (i < iterations) await sleep(intervalMs);
  }

  const healthAvailability = Number(((healthOk / iterations) * 100).toFixed(2));
  const dbAvailability = Number(((dbOk / iterations) * 100).toFixed(2));

  const healthStats = summarize(healthLat);
  const dbStats = summarize(dbLat);

  console.log('\n[PROBE] Resultado final');
  console.log(`- /health disponibilidade: ${healthAvailability}% (${healthOk}/${iterations})`);
  console.log(`- /health/db disponibilidade: ${dbAvailability}% (${dbOk}/${iterations})`);
  if (healthStats) {
    console.log(
      `- /health latência(ms): avg=${healthStats.avg}, p50=${healthStats.p50}, p95=${healthStats.p95}, p99=${healthStats.p99}, min=${healthStats.min}, max=${healthStats.max}`
    );
  }
  if (dbStats) {
    console.log(
      `- /health/db latência(ms): avg=${dbStats.avg}, p50=${dbStats.p50}, p95=${dbStats.p95}, p99=${dbStats.p99}, min=${dbStats.min}, max=${dbStats.max}`
    );
  }

  const shouldFail = healthAvailability < 99 || dbAvailability < 99;
  if (shouldFail) {
    console.error('[PROBE] Critério mínimo não atendido: disponibilidade abaixo de 99%.');
    process.exit(1);
  }

  console.log('[PROBE] Critério mínimo atendido.');
}

run().catch(error => {
  console.error('[PROBE] Erro fatal:', error.message);
  process.exit(1);
});
