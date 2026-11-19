const prisma = require('../config/prisma');
const { randomUUID } = require('node:crypto');
const { z } = require('zod');
const { createRegistros } = require('../services/registroCreationService');
const { transition, OMError } = require('../services/omService');
const { clearDemoData: cleanupDemoData } = require('../services/demoCleanupService');

const populateSchema = z.object({
  count: z.number().int().min(1).max(200).default(50),
  clear: z.boolean().default(false),
}).strict();

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const COMPONENTES = [
  { pn: 'A153254-01', desc: 'Resistor 10k 0603 1%', type: 'resistor' },
  { pn: 'A153255-02', desc: 'Capacitor 100nF 0805 50V', type: 'capacitor' },
  { pn: 'A153256-03', desc: 'Microcontrolador ATmega328P', type: 'ic' },
  { pn: 'A153257-04', desc: 'LED Vermelho 0805', type: 'led' },
  { pn: 'A153258-05', desc: 'Conector USB-C SMD', type: 'conn' },
];

function getDefectsFor(type) {
  const common = [
    'Solda Fria',
    'Ausente',
    'Danificado',
    'Deslocado',
    'Excesso de Solda',
    'Insuficiência de Solda',
  ];
  switch (type) {
    case 'resistor':
      return [...common, 'Tombstone', 'Bilboard', 'Incorreto', 'Levantado'];
    case 'capacitor':
      return [...common, 'Tombstone', 'Bilboard', 'Curto', 'Incorreto'];
    case 'ic':
      return [
        ...common,
        'Curto',
        'Solder Ball',
        'Terminal Levantado',
        'Invertido',
        'Polaridade Incorreta',
      ];
    case 'led':
      return [...common, 'Invertido', 'Polaridade Incorreta', 'Tombstone'];
    case 'conn':
      return [...common, 'Curto', 'Terminal Levantado', 'Solder Ball'];
    default:
      return common;
  }
}

async function populateDemoData(req, res) {
  const parsed = populateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Informe uma quantidade inteira de 1 a 200 e a opção de limpeza válida.' });
  const { count, clear } = parsed.data;

  try {
    if (clear) {
      await prisma.$transaction(cleanupDemoData, { isolationLevel: 'Serializable', timeout: 15000 });
    }

    const newRegistros = [];
    const batchId = randomUUID();
    const demoCreatedAt = new Map();
    const now = Date.now();
    const qtdlote = Math.max(50, count);
    const existingOMs = await prisma.ordens_manufatura.findMany({
      where: { omNumber: { startsWith: 'DEMO-' } }, select: { omNumber: true },
    });
    const used = new Set(existingOMs.map(row => row.omNumber));
    const oms = [];
    const numberOfOMs = Math.min(3, Math.max(1, Math.floor(count / 4)));
    for (let sequence = 1; sequence <= 999; sequence++) {
      const candidate = `DEMO-${String(sequence).padStart(3, '0')}`;
      if (used.has(candidate)) continue;
      try {
        oms.push(await transition(candidate, 'start', req.user, qtdlote));
        if (oms.length === numberOfOMs) break;
      }
      catch (error) { if (error.status !== 409) throw error; }
    }
    if (oms.length !== numberOfOMs) throw new OMError(409, 'Não há números de OM de demonstração suficientes. Limpe os testes antigos antes de gerar novos.');
    const seed = Number(oms[0].omNumber.slice(-3));
    const examples = ['Ausente', 'Danificado', 'Incorreto', 'Possível Incorreto'];

    for (let i = 0; i < count; i++) {
      const om = oms[Math.floor(i * oms.length / count)];
      const componente = COMPONENTES[getRandomInt(0, COMPONENTES.length - 1)];
      const possibleDefects = getDefectsFor(componente.type);
      const defeito = examples[i] || possibleDefects[getRandomInt(0, possibleDefects.length - 1)];
      const id = `DEMO-REG-${batchId}-${i}`;
      // Weighted days guarantee history across the month, rather than timestamps
      // that only differ by seconds. The next batch rotates days and clock times.
      const daysAgo = (Math.floor(i * i * 30 / (count * count)) + (seed - 1) * 7) % 30;
      const minutesAgo = (seed * 37 + i * 19) % 1440;
      demoCreatedAt.set(id, new Date(now - daysAgo * 86400000 - minutesAgo * 60000).toISOString());

      const randPrioridade = Math.random();
      let prioridade = 'media';
      if (randPrioridade < 0.2) prioridade = 'baixa';
      else if (randPrioridade < 0.8) prioridade = 'media';
      else if (randPrioridade < 0.9) prioridade = 'alta';
      else prioridade = 'urgente';

      newRegistros.push({
        id,
        om: om.omNumber,
        qtdlote,
        omVersion: om.version,
        serial: `SN-DEMO-${batchId.slice(0, 8)}-${String(i + 1).padStart(4, '0')}`,
        designador: `R${getRandomInt(1, 999)}`,
        tipodefeito: defeito,
        pn: componente.pn,
        descricao: componente.desc,
        obs: 'Falha fictícia com data histórica simulada para testar o fluxo e os relatórios.',
        prioridade,
      });
    }

    // O mesmo serviço dos lançamentos do operador valida a OM, grava o usuário,
    // Simulated dates are restricted by the service to the reserved DEMO namespace.
    await createRegistros(newRegistros, req.user, { demoCreatedAt });

    res.json({ count, om: oms[0].omNumber, oms: oms.map(om => om.omNumber),
      message: `${count} falhas DEMO criadas em ${oms.length} OM(s), com datas e horários variados nos últimos 30 dias. Requisite os materiais elegíveis pela tabela.` });
  } catch (error) {
    console.error('Erro ao gerar dados demo:', error);
    if (error instanceof OMError) return res.status(error.status).json({ error: error.message });
    res.status(error.code === 'P2003' ? 409 : 500).json({ error: error.code === 'P2003'
      ? 'Há histórico vinculado aos testes anteriores. Gere novos dados sem limpar os existentes.'
      : 'Não foi possível gerar os dados de demonstração.' });
  }
}

async function clearDemoData(_req, res) {
  try {
    await prisma.$transaction(cleanupDemoData, { isolationLevel: 'Serializable', timeout: 15000 });
    res.json({ message: 'OMs e dados DEMO removidos.' });
  } catch (error) {
    console.error('Erro ao limpar dados demo:', error);
    res.status(500).json({ error: 'Não foi possível limpar os dados demo.' });
  }
}

module.exports = { populateDemoData, clearDemoData };
