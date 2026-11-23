import type { Registro } from '@/types';
import { parseDesignators } from '../../shared/designators';

export interface MaterialRequestResult {
  message: string;
  requisicaoIds: number[];
  summary: { selectedRecords: number; createdRecords: number; existingRecords: number; createdRequests: number };
}

export function reviewMaterialRequest(registros: Registro[], ids: Iterable<string>) {
  const byId = new Map(registros.map(registro => [registro.id, registro]));
  const eligible: Registro[] = [];
  const excluded: { id: string; registro?: Registro; reason: string }[] = [];
  const groups = new Map<string, { om: string; pn: string; quantity: number }>();
  for (const id of new Set(ids)) {
    const registro = byId.get(id);
    const defect = registro?.tipodefeito?.trim();
    const components = parseDesignators(registro?.designador);
    const reason = !registro ? 'Registro indisponível. Atualize a lista.'
      : registro.materialRequisitado ? 'Material já requisitado para este registro.'
      : ['cancelado', 'sucata'].includes(registro.status || '') ? 'Registro cancelado ou descartado não pode gerar requisição.'
      : defect === 'Possível Incorreto' ? 'Aguarda conferência SMT.'
      : !registro.pn?.trim() ? 'Informe o PN antes de requisitar.'
      : !['Ausente', 'Danificado', 'Incorreto'].includes(defect || '') ? 'Este defeito não exige requisição de material.'
      : components.error;
    if (reason || !registro) {
      excluded.push({ id, registro, reason: reason! });
      continue;
    }
    eligible.push(registro);
    const pn = registro.pn!.trim();
    const key = JSON.stringify([registro.om, pn]);
    const group = groups.get(key) || { om: registro.om, pn, quantity: 0 };
    group.quantity += components.quantity;
    groups.set(key, group);
  }
  const materials = [...groups.values()];
  const orders = [...new Set(materials.map(group => group.om))].map(om => ({
    om,
    materials: materials.filter(group => group.om === om).map(group => ({
      ...group,
      descriptions: [...new Set(eligible.filter(row => row.om === om && row.pn?.trim() === group.pn)
        .map(row => row.descricao?.trim()).filter((value): value is string => !!value))],
    })),
  }));
  return { eligible, excluded, groups: materials, orders,
    totalQuantity: materials.reduce((sum, group) => sum + group.quantity, 0),
    selectedCount: eligible.length + excluded.length,
    uniquePNs: new Set(materials.map(group => group.pn)).size };
}

export function togglePageSelection(selected: Set<string>, pageIds: string[]) {
  const next = new Set(selected);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  for (const id of pageIds) allSelected ? next.delete(id) : next.add(id);
  return next;
}
