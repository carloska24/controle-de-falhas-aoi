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

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const DEFEITOS = [
  'Curto',
  'Solda Fria',
  'Excesso de Solda',
  'Insuficiência de Solda',
  'Tombstone',
  'Bilboard',
  'Solder Ball',
  'Terminal Levantado',
  'Ausente',
  'Danificado',
  'Deslocado',
  'Incorreto',
  'Invertido',
  'Polaridade Incorreta',
  'Levantado',
];

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
    const qtdlote = Math.max(50, count);
    const existingOMs = await prisma.ordens_manufatura.findMany({
      where: { omNumber: { startsWith: 'DEMO-' } }, select: { omNumber: true },
    });
    const used = new Set(existingOMs.map(row => row.omNumber));
    let om;
    for (let sequence = 1; sequence <= 999; sequence++) {
      const candidate = `DEMO-${String(sequence).padStart(3, '0')}`;
      if (used.has(candidate)) continue;
      try { om = await transition(candidate, 'start', req.user, qtdlote); break; }
      catch (error) { if (error.status !== 409) throw error; }
    }
    if (!om) throw new OMError(409, 'Os 999 números de OM de demonstração já estão em uso. Limpe os testes antigos antes de gerar novos.');
    const omNumber = om.omNumber;
    const examples = ['Ausente', 'Danificado', 'Incorreto', 'Possível Incorreto'];

    for (let i = 0; i < count; i++) {
      const componente = COMPONENTES[getRandomInt(0, COMPONENTES.length - 1)];
      const possibleDefects = getDefectsFor(componente.type);
      const defeito = examples[i] || possibleDefects[getRandomInt(0, possibleDefects.length - 1)];
      const id = `DEMO-REG-${batchId}-${i}`;

      const randPrioridade = Math.random();
      let prioridade = 'media';
      if (randPrioridade < 0.2) prioridade = 'baixa';
      else if (randPrioridade < 0.8) prioridade = 'media';
      else if (randPrioridade < 0.9) prioridade = 'alta';
      else prioridade = 'urgente';

      newRegistros.push({
        id,
        om: omNumber,
        qtdlote,
        omVersion: om.version,
        serial: `SN-DEMO-${batchId.slice(0, 8)}-${String(i + 1).padStart(4, '0')}`,
        designador: `R${getRandomInt(1, 999)}`,
        tipodefeito: defeito,
        pn: componente.pn,
        descricao: componente.desc,
        obs: 'Falha fictícia gerada para teste do fluxo operacional.',
        prioridade,
      });
    }

    // O mesmo serviço dos lançamentos do operador valida a OM, grava o usuário,
    // define data/status e registra as placas na mesma transação das falhas.
    await createRegistros(newRegistros, req.user);

    res.json({ count, om: omNumber, message: `${count} falhas DEMO pendentes criadas. Requisite os materiais elegíveis pela tabela de registros.` });
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
