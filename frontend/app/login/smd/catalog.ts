export const COMPONENT_SCALE = 0.85;

export const COMPONENT_CATALOG = [
  { id: 'resistor', name: 'Resistor de filme', package: '1206 · 10 kΩ', size: 36 },
  { id: 'mlcc', name: 'Capacitor cerâmico', package: 'MLCC · 0805', size: 31 },
  { id: 'tantalum', name: 'Capacitor de tântalo', package: 'Moldado · polarizado', size: 43 },
  { id: 'electrolytic', name: 'Capacitor eletrolítico', package: 'Alumínio · SMD', size: 45 },
  { id: 'diode', name: 'Diodo retificador', package: 'SMA · faixa de cátodo', size: 40 },
  { id: 'led', name: 'LED SMD', package: 'PLCC · lente e refletor', size: 35 },
  { id: 'inductor', name: 'Indutor de potência', package: 'Bobina de cobre', size: 46 },
  { id: 'soic', name: 'Circuito integrado', package: 'SOIC · 8 terminais', size: 48 },
  { id: 'qfp', name: 'Microcontrolador', package: 'LQFP · 32 terminais', size: 55 },
  { id: 'crystal', name: 'Cristal de quartzo', package: 'Encapsulamento metálico', size: 40 },
  { id: 'transistor', name: 'Transistor', package: 'SOT-23 · 3 terminais', size: 37 },
  { id: 'connector', name: 'Conector USB-C', package: 'Carcaça e contatos', size: 54 },
] as const;

export type ComponentKind = typeof COMPONENT_CATALOG[number]['id'];
