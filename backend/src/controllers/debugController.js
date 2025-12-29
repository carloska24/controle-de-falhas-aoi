const database = require('../config/database');

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
      return [...common, 'Tombstone', 'Bilboard', 'Curto', 'Incorreto']; // Caps don't usually have polarity issues unless tantalum, but let's be safe
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
  const { count = 50, clear = false } = req.body;

  try {
    if (clear) {
      await database.dbRun("DELETE FROM registros WHERE om LIKE 'DEMO-%'");
      await database.dbRun("DELETE FROM requisicoes WHERE om LIKE 'DEMO-%'");
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Gerar datas base distintas
    const timestamps = new Set();
    while (timestamps.size < count) {
      timestamps.add(getRandomDate(thirtyDaysAgo, now).toISOString());
    }
    const sortedDates = Array.from(timestamps).sort().reverse();

    const queries = [];
    const paramsList = [];
    const demoOMs = ['DEMO-OM-01', 'DEMO-OM-02', 'DEMO-OM-03'];

    for (let i = 0; i < count; i++) {
      const omNumber = demoOMs[getRandomInt(0, demoOMs.length - 1)];
      const componente = COMPONENTES[getRandomInt(0, COMPONENTES.length - 1)];
      const possibleDefects = getDefectsFor(componente.type);
      const defeito = possibleDefects[getRandomInt(0, possibleDefects.length - 1)];
      const data = sortedDates[i];
      const id = `DEMO-REG-${Date.now()}-${i}`;

      // Simular status
      const statusList = ['pendente', 'em_analise', 'reparado', 'sucata'];
      const status = statusList[getRandomInt(0, statusList.length - 1)];

      // Simular prioridade ponderada (60% media, 20% baixa, 10% alta, 10% urgente)
      const randPrioridade = Math.random();
      let prioridade = 'media';
      if (randPrioridade < 0.2) prioridade = 'baixa';
      else if (randPrioridade < 0.8) prioridade = 'media';
      else if (randPrioridade < 0.9) prioridade = 'alta';
      else prioridade = 'urgente';

      // 1. Inserir Registro (Falha)
      queries.push(
        `INSERT INTO registros (id, om, qtdlote, serial, designador, tipodefeito, pn, descricao, obs, createdat, status, operador, prioridade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      paramsList.push([
        id,
        omNumber,
        getRandomInt(50, 500),
        `SN-${getRandomInt(10000, 99999)}`,
        `R${getRandomInt(1, 999)}`,
        defeito,
        componente.pn,
        componente.desc,
        'Gerado automaticamente via Debug Mode',
        data,
        status,
        'DemoUser',
        prioridade,
      ]);

      // 2. Inserir Requisição - REMOVIDO
      // O usuário solicitou que o Demo NÃO gere requisições automaticamente.
      // As requisições devem ser criadas apenas manualmente via botão "Requisitar".
    }

    await database.dbTransaction(async run => {
      for (let i = 0; i < queries.length; i++) {
        await run(queries[i], paramsList[i]);
      }
    });

    res.json({ message: `${count} registros e requisições DEMO gerados com sucesso.` });
  } catch (error) {
    console.error('Erro ao gerar dados demo:', error);
    res.status(500).json({ error: error.message });
  }
}

async function clearDemoData(req, res) {
  try {
    await database.dbRun("DELETE FROM registros WHERE om LIKE 'DEMO-%'");
    await database.dbRun("DELETE FROM requisicoes WHERE om LIKE 'DEMO-%'");
    res.json({ message: 'Dados DEMO removidos com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { populateDemoData, clearDemoData };
