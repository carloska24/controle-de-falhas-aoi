// Somente cluster temporário próprio; não usa o banco da aplicação nem seu .env.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { startIsolatedPostgres } = require('./lib/isolatedPostgres');

async function main() {
  const db = await startIsolatedPostgres();
  let prisma;
  try {
    process.env.DATABASE_URL = db.connectionString;
    process.env.DATABASE_POOL_MAX = '2';
    process.env.NODE_ENV = 'production';
    await promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'), env: process.env, timeout: 60000,
    });
    prisma = require('../src/config/prisma');
    const { getFalhasReport } = require('../src/services/falhasReportService');
    const actor = { role: 'admin' };
    await prisma.registros.createMany({ data: Array.from({ length: 251 }, (_, i) => ({ id: 'REPORT-' + i,
      om: 'OM-REPORT', qtdlote: 500, pn: 'PN-1', serial: 'SN-' + i, designador: 'R' + i,
      tipodefeito: i % 2 ? 'Ausente' : 'Curto', status: 'pendente', prioridade: 'Média', operador: 'Ana %',
      createdat: i === 250 ? '2026-11-18T23:59:59.999-03:00' : '2026-11-18T03:00:00Z' })) });
    const all = await getFalhasReport({}, actor);
    assert.equal(all.data.length, 251); assert.equal(all.meta.total, 251);
    const filtered = await getFalhasReport({ periodo: 'custom', dataIni: '2026-11-18', dataFim: '2026-11-18',
      defeito: 'Ausente', prioridade: 'media', operador: 'Ana %' }, actor);
    assert.equal(filtered.meta.total, 125);
    assert.deepEqual(filtered.options.defeitos, ['Ausente', 'Curto']);
    const boundary = await getFalhasReport({ periodo: 'custom', dataIni: '2026-11-19', dataFim: '2026-11-19' }, actor);
    assert.equal(boundary.meta.total, 0);
    for (const [index, createdat] of ['2026-11-18T00:30:00+00', '2026-11-18T00:30:00z', '2026-11-18T00:30:00 UTC'].entries()) {
      await prisma.registros.create({ data: { id: 'SHORT-ZONE-' + index, om: 'OM-SHORT-ZONE', createdat } });
    }
    const zone = await getFalhasReport({ om: 'OM-SHORT-ZONE', periodo: 'custom', dataIni: '2026-11-17', dataFim: '2026-11-17' }, actor);
    assert.equal(zone.meta.total, 3);
    assert.deepEqual(zone.data.map(row => row.createdat), Array(3).fill('2026-11-18T00:30:00.000Z'));
    await prisma.registros.create({ data: { id: 'INVALID-DATE', om: 'OM-INVALID', createdat: '2026-02-30T12:00:00Z' } });
    assert.equal((await getFalhasReport({ om: 'OM-INVALID' }, actor)).meta.invalidDates, 1);
    // Nenhuma consulta acima do limite pode se apresentar como relatório completo.
    await prisma.registros.createMany({ data: Array.from({ length: 10001 }, (_, i) => ({ id: 'LARGE-' + i,
      om: 'OM-LARGE', createdat: '2026-11-18T03:00:00Z' })) });
    await assert.rejects(getFalhasReport({}, actor), error => error.status === 413 && error.details.options.oms.includes('OM-REPORT'));
    assert.equal((await getFalhasReport({ om: 'OM-REPORT' }, actor)).meta.total, 251);
    console.log('POSTGRES_FALHAS_REPORT_OK: 251 registros, filtros, facetas, datas, limite e recuperação por OM');
  } finally {
    if (prisma) await prisma.$disconnect();
    await db.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
