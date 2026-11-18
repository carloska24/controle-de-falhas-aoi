const { Prisma } = require('@prisma/client');
const { z } = require('zod');
const prisma = require('../config/prisma');

const MAX_RECORDS = 10000;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Data inválida.');
const text = z.string().trim().min(1).max(200).optional();
const filtersSchema = z.object({ om: text, status: text, defeito: text, operador: text,
  prioridade: z.enum(['urgente', 'alta', 'media', 'baixa']).optional(),
  periodo: z.enum(['all', '7', '30', 'custom']).default('all'),
  dataIni: day.optional(), dataFim: day.optional(), demo: z.enum(['true', 'false']).default('false'),
}).strict().superRefine((value, context) => {
  if (value.periodo !== 'custom' && (value.dataIni || value.dataFim)) context.addIssue({ code: 'custom', message: 'Use período personalizado para informar datas.' });
  if (value.dataIni && value.dataFim && value.dataIni > value.dataFim) context.addIssue({ code: 'custom', message: 'A data inicial deve ser anterior ou igual à final.' });
});

function parseReportFilters(query, actor) {
  const parsed = filtersSchema.safeParse(query);
  if (!parsed.success) throw Object.assign(new Error('Filtros inválidos. Confira o período e os campos informados.'), { status: 400 });
  if (parsed.data.demo === 'true' && actor.role !== 'admin') throw Object.assign(new Error('Acesso ao modo de demonstração não permitido.'), { status: 403 });
  return parsed.data;
}

// Valida datas legadas antes do cast, inclusive no PostgreSQL 15.
// Grupos: ano, mês, dia, hora, minuto, segundo, fuso, hora e minuto do offset.
const datePattern = /^([0-9]{4})-([0-9]{2})-([0-9]{2})[T ]([0-9]{2}):([0-9]{2})(?::([0-9]{2})(?:[.][0-9]{1,9})?)?([Zz]|[+-]([0-9]{2})(?::?([0-9]{2}))?|[ ]?(?:UTC|GMT))?$/;
const occurred = Prisma.sql`CASE
  WHEN parts[1]::integer BETWEEN 1 AND 9999
    AND parts[2]::integer BETWEEN 1 AND 12
    AND parts[3]::integer BETWEEN 1 AND CASE parts[2]::integer
      WHEN 2 THEN CASE WHEN parts[1]::integer % 400 = 0 OR
        (parts[1]::integer % 4 = 0 AND parts[1]::integer % 100 <> 0) THEN 29 ELSE 28 END
      WHEN 4 THEN 30 WHEN 6 THEN 30 WHEN 9 THEN 30 WHEN 11 THEN 30 ELSE 31 END
    AND parts[4]::integer <= 23 AND parts[5]::integer <= 59 AND coalesce(parts[6]::integer, 0) <= 59
    AND coalesce(parts[8]::integer, 0) <= 15 AND coalesce(parts[9]::integer, 0) <= 59
  THEN CASE WHEN parts[7] IS NULL
    THEN btrim(createdat)::timestamp AT TIME ZONE 'America/Sao_Paulo'
    ELSE btrim(createdat)::timestamptz END
  ELSE NULL END`;

async function getFalhasReport(query, actor) {
  const filters = parseReportFilters(query, actor);
  return prisma.$transaction(async tx => {
    const visibility = filters.demo === 'true' ? Prisma.sql`TRUE` : Prisma.sql`om NOT LIKE 'DEMO-%'`;
    const period = [];
    if (filters.periodo === 'custom') {
      if (filters.dataIni) period.push(Prisma.sql`occurred >= (${filters.dataIni}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
      if (filters.dataFim) period.push(Prisma.sql`occurred < ((${filters.dataFim}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
    } else if (filters.periodo !== 'all') {
      period.push(Prisma.sql`occurred >= CURRENT_TIMESTAMP - (${Number(filters.periodo)} * INTERVAL '24 hours')`);
      period.push(Prisma.sql`occurred <= CURRENT_TIMESTAMP`);
    }
    const scope = period.length ? Prisma.join(period, ' AND ') : Prisma.sql`TRUE`;
    const conditions = [scope];
    if (filters.om) conditions.push(Prisma.sql`om = ${filters.om}`);
    if (filters.status) conditions.push(Prisma.sql`status = ${filters.status}`);
    if (filters.defeito) conditions.push(Prisma.sql`tipodefeito = ${filters.defeito}`);
    if (filters.prioridade) conditions.push(Prisma.sql`translate(lower(btrim(prioridade)), 'é', 'e') = ${filters.prioridade}`);
    if (filters.operador) conditions.push(Prisma.sql`strpos(lower(coalesce(operador, '')), lower(${filters.operador})) > 0`);
    const source = Prisma.sql`WITH source AS (
      SELECT r.*, ${occurred} AS occurred FROM registros r
      CROSS JOIN LATERAL (SELECT regexp_match(btrim(r.createdat), ${datePattern.source}) AS parts) parsed
      WHERE ${visibility}
    )`;
    const rows = await tx.$queryRaw(Prisma.sql`${source}
      SELECT id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, createdat, status, operador, prioridade,
        floor(extract(epoch FROM occurred) * 1000)::double precision AS occurred_ms
      FROM source WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY om, occurred ASC NULLS LAST, id LIMIT ${MAX_RECORDS + 1}`);
    // Facetas seguem período/visibilidade, sem se limitarem à página ou à própria opção selecionada.
    const options = {};
    for (const [key, column] of [['oms', 'om'], ['defeitos', 'tipodefeito'], ['statuses', 'status']]) {
      const field = Prisma.raw(column); // nomes fixos desta lista; nunca vêm do usuário.
      const values = await tx.$queryRaw(Prisma.sql`${source} SELECT DISTINCT ${field} AS value FROM source
        WHERE ${scope} AND ${field} IS NOT NULL AND ${field} <> '' ORDER BY ${field} LIMIT ${MAX_RECORDS + 1}`);
      if (values.length > MAX_RECORDS) throw Object.assign(new Error('Há opções demais para o relatório. Restrinja o período.'), { status: 413 });
      options[key] = values.map(row => row.value);
    }
    if (rows.length > MAX_RECORDS) throw Object.assign(new Error('O relatório ultrapassa 10.000 registros. Restrinja a OM ou o período antes de consultar e exportar.'), { status: 413, details: { options } });
    // O epoch mantém o instante do banco sem depender do fuso na conversão do driver.
    const data = rows.map(({ occurred_ms: milliseconds, ...row }) => ({ ...row,
      createdat: milliseconds === null ? '' : new Date(milliseconds).toISOString(),
      ...(milliseconds === null ? { createdatOriginal: row.createdat } : {}) }));
    return { data, options, meta: { complete: true, total: data.length, maxRecords: MAX_RECORDS,
      generatedAt: new Date().toISOString(), timeZone: 'America/Sao_Paulo',
      invalidDates: rows.filter(row => row.occurred_ms === null).length } };
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
}

module.exports = { getFalhasReport, parseReportFilters };
