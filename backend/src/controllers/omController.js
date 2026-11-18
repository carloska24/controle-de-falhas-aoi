const prisma = require('../config/prisma');
const { OMError, serializeOM, transition } = require('../services/omService');
const { getPagination } = require('../utils/pagination');
const { registrarPlacaSemFalha, resumirInspecoes } = require('../services/inspecaoService');
const { z } = require('zod');

const filtroInspecoes = z.object({
  om: z.string().trim().min(1).max(100).optional(),
  inicio: z.string().datetime().optional(),
  fim: z.string().datetime().optional(),
}).refine(({ inicio, fim }) => !inicio || !fim || new Date(inicio) < new Date(fim));

function handleError(res, error) {
  if (error instanceof OMError) return res.status(error.status).json({ error: error.message });
  if (error.status === 400) return res.status(400).json({ error: error.message });
  console.error('[OM] Operação não concluída:', error);
  return res.status(503).json({ error: 'Não foi possível consultar ou salvar a OM. Tente novamente.' });
}

function command(action) {
  return async (req, res) => {
    try {
      res.json(await transition(req.body.omNumber, action, req.user, req.body.qtdLote));
    } catch (error) { handleError(res, error); }
  };
}

async function getOM(req, res) {
  try {
    const row = await prisma.ordens_manufatura.findUnique({ where: { omNumber: req.params.omNumber } });
    if (!row) return res.status(404).json({ error: 'OM não encontrada.' });
    res.json(serializeOM(row));
  } catch (error) { handleError(res, error); }
}

async function registrarInspecao(req, res) {
  try {
    const placa = await registrarPlacaSemFalha(req.params.omNumber, req.body, req.user);
    res.status(placa.jaRegistrada ? 200 : 201).json(placa);
  } catch (error) { handleError(res, error); }
}

async function getResumoInspecoes(req, res) {
  const filtro = filtroInspecoes.safeParse(req.query);
  if (!filtro.success) return res.status(400).json({ error: 'Filtros de inspeção inválidos.' });
  const { om, inicio, fim } = filtro.data;
  try {
    res.json(await resumirInspecoes({
      omNumber: om,
      start: inicio ? new Date(inicio) : undefined,
      end: fim ? new Date(fim) : undefined,
    }));
  } catch (error) { handleError(res, error); }
}

async function getOMTime(req, res) {
  try {
    const row = await prisma.ordens_manufatura.findUnique({ where: { omNumber: req.params.omNumber } });
    if (!row || row.status !== 'finalizada') return res.status(404).json({ error: 'Tempo de OM finalizada não encontrado.' });
    const { elapsed, startTime, endTime } = serializeOM(row);
    res.json({ elapsed, startTime, endTime });
  } catch (error) { handleError(res, error); }
}

function listByStatus(status) {
  return async (_req, res) => {
    try {
      const rows = await prisma.ordens_manufatura.findMany({ where: { status }, orderBy: { omNumber: 'asc' } });
      res.json(rows.map(row => serializeOM(row)));
    } catch (error) { handleError(res, error); }
  };
}

async function getRelatorioFalhas(req, res) {
  try {
    const { om, status, dataIni, dataFim } = req.query;
    const { page, limit, skip } = getPagination(req.query);
    const where = {};
    if (req.user.role !== 'admin') where.NOT = { om: { startsWith: 'DEMO-' } };
    if (om) where.om = om;
    if (status) where.status = status;
    if (dataIni || dataFim) {
      where.createdat = {};
      if (dataIni) where.createdat.gte = dataIni;
      if (dataFim) where.createdat.lte = dataFim;
    }
    const [total, registros] = await prisma.$transaction([
      prisma.registros.count({ where }),
      prisma.registros.findMany({ where, orderBy: [{ om: 'asc' }, { createdat: 'asc' }, { id: 'asc' }], skip, take: limit }),
    ], { isolationLevel: 'RepeatableRead' });
    const porOM = new Map();
    for (const r of registros) {
      if (!porOM.has(r.om)) porOM.set(r.om, { om: r.om, qtdlote: r.qtdlote, falhas: [] });
      porOM.get(r.om).falhas.push({ ...r, tipodefeito: r.tipodefeito ?? '' });
    }
    res.json({ data: [...porOM.values()], meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) { handleError(res, error); }
}

async function getRelatorioOMs(_req, res) {
  try {
    const finalizadas = await prisma.ordens_manufatura.findMany({ where: { status: 'finalizada' }, orderBy: { endTime: 'desc' } });
    const registros = await prisma.registros.findMany({
      where: { om: { in: finalizadas.map(om => om.omNumber) } }, select: { om: true, tipodefeito: true },
    });
    const defeitos = new Map();
    for (const reg of registros) {
      if (!defeitos.has(reg.om)) defeitos.set(reg.om, []);
      if (reg.tipodefeito) defeitos.get(reg.om).push(reg.tipodefeito);
    }
    res.json(finalizadas.map(row => {
      const om = serializeOM(row);
      return { omNumber: om.omNumber, qtdlote: om.qtdlote ?? '-', tempo: (om.elapsed / 1000).toFixed(0) + 's', defeitos: defeitos.get(om.omNumber) || [] };
    }));
  } catch (error) { handleError(res, error); }
}

module.exports = {
  startOM: command('start'), pauseOM: command('pause'), resumeOM: command('resume'), finishOM: command('finish'),
  getOM, getOMTime, getResumoInspecoes, registrarInspecao, getRelatorioFalhas, getRelatorioOMs,
  listAtivas: listByStatus('em_andamento'), listPausadas: listByStatus('pausada'), listFinalizadas: listByStatus('finalizada'),
};
