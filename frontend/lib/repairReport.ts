import type { Registro } from '@/types';
import { serializeCSV } from './csv';
import { reportDay } from './falhasReport';
import { repairQueueStatus, repairStatus, repairStatusLabels, type RepairDetailStatus } from './repairStatus';

export interface RepairReportFilters {
  dateRange: string;
  startDate: string;
  endDate: string;
  om: string;
  status: string;
  prioridade: string;
  operador: string;
}

export function filterRepairReport(records: Registro[], filters: RepairReportFilters, now = Date.now()) {
  const operator = filters.operador.trim().toLowerCase();
  const cutoff = now - Number(filters.dateRange) * 86400000;
  return records.filter(record => {
    if (filters.om !== 'all' && record.om !== filters.om) return false;
    if (filters.status === 'aberto' && repairQueueStatus(record.status) !== 'aberto') return false;
    if (filters.status !== 'all' && filters.status !== 'aberto' && repairStatus(record.status) !== filters.status) return false;
    if (filters.prioridade !== 'all' && normalizedRepairPriority(record.prioridade) !== filters.prioridade) return false;
    if (operator && !record.operador?.toLowerCase().includes(operator)) return false;
    if (filters.dateRange === 'custom' && (filters.startDate || filters.endDate)) {
      const day = reportDay(record.createdat);
      if (day === 'Data inválida' || (filters.startDate && day < filters.startDate) || (filters.endDate && day > filters.endDate)) return false;
    } else if (filters.dateRange === '7' || filters.dateRange === '30') {
      const occurred = Date.parse(record.createdat);
      if (!(occurred >= cutoff && occurred <= now)) return false;
    }
    return true;
  });
}

export function normalizedRepairPriority(priority?: string | null) {
  return priority?.trim().toLowerCase().replace('é', 'e') || '';
}

export function summarizeRepairReport(records: Registro[]) {
  const counts: Record<RepairDetailStatus, number> = { pendente: 0, em_analise: 0, reparado: 0, cancelado: 0 };
  let urgentes = 0;
  for (const record of records) {
    counts[repairStatus(record.status)]++;
    if (['urgente', 'alta'].includes(normalizedRepairPriority(record.prioridade))) urgentes++;
  }
  return { counts, total: records.length, abertos: counts.pendente + counts.em_analise, urgentes };
}

export function serializeRepairCSV(records: Registro[]): string {
  return serializeCSV(records, [
    ['OM', row => row.om], ['PN', row => row.pn], ['Serial', row => row.serial],
    ['Designador', row => row.designador], ['Tipo Defeito', row => row.tipodefeito],
    ['Status', row => repairStatusLabels[repairStatus(row.status)]],
    ['Prioridade', row => row.prioridade], ['Operador', row => row.operador],
    ['Data Criação', row => row.createdat], ['Data Atualização', row => row.updatedat],
  ]);
}
