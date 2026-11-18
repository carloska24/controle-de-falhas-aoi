// Valores persistidos pela API e aliases encontrados no histórico.
export function repairStatus(status?: string | null) {
  const value = status?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  switch (value) {
    case 'em_analise':
    case 'analise':
    case 'em_andamento':
      return 'em_analise';
    case 'reparado':
    case 'concluido':
      return 'reparado';
    case 'cancelado':
    case 'sucata':
      return 'cancelado';
    default:
      // Mantém registros sem estado reconhecido visíveis na fila de abertos.
      return 'pendente';
  }
}

export type RepairDetailStatus = ReturnType<typeof repairStatus>;
export type RepairStatus = 'aberto' | 'reparado' | 'cancelado';

export const repairStatusLabels = {
  aberto: 'Aberto',
  pendente: 'Pendente',
  em_analise: 'Em análise',
  reparado: 'Reparado',
  cancelado: 'Cancelado',
} as const;

export function repairQueueStatus(status?: string | null): RepairStatus {
  const detail = repairStatus(status);
  return detail === 'pendente' || detail === 'em_analise' ? 'aberto' : detail;
}

export function toBackendRepairStatus(status: RepairStatus) {
  return status === 'aberto' ? 'pendente' : status;
}
