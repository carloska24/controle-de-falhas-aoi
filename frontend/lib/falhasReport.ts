import type { Registro } from '@/types';

export interface ReportFilters {
  dateRange: string; startDate: string; endDate: string; om: string;
  defeito: string; prioridade: string; status: string; operador: string; demo: boolean;
}
export interface FalhasSnapshot {
  data: Registro[];
  options: { oms: string[]; defeitos: string[]; statuses: string[] };
  meta: { complete: true; total: number; maxRecords: number; generatedAt: string; timeZone: string; invalidDates: number };
}

export function reportQuery(filters: ReportFilters): string {
  const params = new URLSearchParams({ periodo: filters.dateRange, demo: String(filters.demo) });
  for (const field of ['om', 'defeito', 'prioridade', 'status'] as const) {
    if (filters[field] !== 'all') params.set(field, filters[field]);
  }
  if (filters.operador.trim()) params.set('operador', filters.operador.trim());
  if (filters.dateRange === 'custom') {
    if (filters.startDate) params.set('dataIni', filters.startDate);
    if (filters.endDate) params.set('dataFim', filters.endDate);
  }
  return params.toString();
}

export function parseReportOptions(value: unknown): FalhasSnapshot['options'] | undefined {
  const options = value as FalhasSnapshot['options'];
  return options && ['oms', 'defeitos', 'statuses'].every(key => {
    const values = options[key as keyof typeof options];
    return Array.isArray(values) && values.length <= 10000 && new Set(values).size === values.length && values.every(option => typeof option === 'string');
  }) ? options : undefined;
}

export function parseFalhasSnapshot(value: unknown): FalhasSnapshot {
  const snapshot = value as FalhasSnapshot;
  const meta = snapshot?.meta;
  if (!Array.isArray(snapshot?.data) || !meta || meta.complete !== true || meta.total !== snapshot.data.length ||
    !Number.isSafeInteger(meta.total) || meta.total < 0 || meta.maxRecords !== 10000 || meta.total > meta.maxRecords ||
    !Number.isFinite(Date.parse(meta.generatedAt)) || meta.timeZone !== 'America/Sao_Paulo' ||
    !Number.isSafeInteger(meta.invalidDates) || meta.invalidDates < 0 || meta.invalidDates > meta.total ||
    !parseReportOptions(snapshot.options)) throw new Error('O servidor não confirmou um relatório completo. Atualize antes de exportar.');
  const ids = new Set<string>();
  for (const row of snapshot.data) {
    if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) || typeof row.om !== 'string' ||
      typeof row.createdat !== 'string') throw new Error('O relatório contém registros inválidos ou repetidos. Atualize novamente.');
    ids.add(row.id);
  }
  return snapshot;
}

export function reportPage(records: Registro[], page: number, perPage = 12) {
  const totalPages = Math.max(1, Math.ceil(records.length / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  return { records: records.slice((currentPage - 1) * perPage, currentPage * perPage), currentPage, totalPages };
}

// Cabeçalhos e campos ficam juntos para não deslocar colunas na exportação.
const columns: [string, (row: Registro) => unknown][] = [
  ['OM', row => row.om], ['Qtd Lote', row => row.qtdlote], ['PN', row => row.pn],
  ['Serial', row => row.serial], ['Designador', row => row.designador], ['Tipo Defeito', row => row.tipodefeito],
  ['Descrição', row => row.descricao], ['Operador', row => row.operador], ['Status', row => row.status],
  ['Prioridade', row => row.prioridade], ['Data', row => (row as Registro & { createdatOriginal?: string }).createdatOriginal ?? row.createdat],
];

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  // Tratar texto potencialmente interpretável como fórmula, inclusive após espaços/controles.
  if (/^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(text) || /^[\t\r\n\u0000]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function serializeFalhasCSV(records: Registro[]): string {
  return '\ufeff' + [columns.map(([header]) => csvCell(header)).join(','),
    ...records.map(row => columns.map(([, accessor]) => csvCell(accessor(row))).join(','))].join('\r\n') + '\r\n';
}

export function reportDay(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Data inválida';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
