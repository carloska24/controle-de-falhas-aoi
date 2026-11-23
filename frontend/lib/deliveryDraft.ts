export type DeliveryMode = 'delivery' | 'correction';
export interface DeliveryItem {
  pn: string;
  description: string;
  designators: string[];
  requested: number;
  before: number;
}
export type DeliveryDraft = Record<string, string>;

export function groupDeliveryItems(raw: unknown): DeliveryItem[] {
  const source = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(source) || !source.length) throw new Error('Requisição sem materiais válidos para conferência.');
  const groups = new Map<string, DeliveryItem>();
  for (const row of source) {
    if (!row || typeof row.pn !== 'string' || !row.pn.trim()
      || !Number.isSafeInteger(row.quantidade_requisitada) || row.quantidade_requisitada < 0
      || !Number.isSafeInteger(row.quantidade_entregue) || row.quantidade_entregue < 0
      || row.quantidade_entregue > row.quantidade_requisitada) {
      throw new Error('A requisição contém quantidades inválidas. Solicite a revisão do cadastro.');
    }
    const item: DeliveryItem = groups.get(row.pn) || { pn: row.pn, description: typeof row.descricao === 'string' ? row.descricao : '',
      designators: [], requested: 0, before: 0 };
    item.requested += row.quantidade_requisitada;
    item.before += row.quantidade_entregue;
    if (!Number.isSafeInteger(item.requested) || !Number.isSafeInteger(item.before)) {
      throw new Error('As quantidades da requisição ultrapassam o limite permitido.');
    }
    if (typeof row.designador === 'string' && row.designador && !item.designators.includes(row.designador)) {
      item.designators.push(row.designador);
    }
    groups.set(row.pn, item);
  }
  return [...groups.values()];
}

export function initialDeliveryDraft(items: DeliveryItem[], mode: DeliveryMode): DeliveryDraft {
  return Object.fromEntries(items.map(item => [item.pn, mode === 'delivery' ? '0' : String(item.before)]));
}

export function filterDeliveryItems(items: DeliveryItem[], search: string, pendingOnly: boolean) {
  const term = search.trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => (!pendingOnly || item.before < item.requested)
    && `${item.pn} ${item.description} ${item.designators.join(' ')}`.toLocaleLowerCase('pt-BR').includes(term));
}

export function calculateDelivery(items: DeliveryItem[], draft: DeliveryDraft, mode: DeliveryMode) {
  const rows = items.map(item => {
    const input = draft[item.pn] ?? (mode === 'delivery' ? '0' : String(item.before));
    const amount = /^\d+$/.test(input) ? Number(input) : NaN;
    const limit = mode === 'delivery' ? item.requested - item.before : item.requested;
    const error = !Number.isSafeInteger(amount) || amount < 0 || amount > limit
      ? `Informe um número inteiro entre 0 e ${limit}.` : '';
    const total = error ? null : mode === 'delivery' ? item.before + amount : amount;
    return { ...item, input, error, total, delta: total === null ? 0 : total - item.before,
      remaining: total === null ? null : item.requested - total,
      changed: total === null ? true : total !== item.before };
  });
  const invalid = rows.some(row => !!row.error);
  const requested = items.reduce((sum, item) => sum + item.requested, 0);
  const before = items.reduce((sum, item) => sum + item.before, 0);
  const total = invalid ? null : rows.reduce((sum, row) => sum + row.total!, 0);
  return { rows, invalid, requested, before, total,
    remaining: total === null ? null : requested - total,
    added: rows.reduce((sum, row) => sum + Math.max(0, row.delta), 0),
    reduced: rows.reduce((sum, row) => sum + Math.max(0, -row.delta), 0),
    changedCount: rows.filter(row => row.changed).length,
    status: total === null ? null : !rows.some(row => row.total! > 0) ? 'pendente'
      : rows.every(row => row.total === row.requested) ? 'entregue' : 'parcialmente_entregue',
  };
}

export function fillVisibleDelivery(items: DeliveryItem[], draft: DeliveryDraft,
  visiblePNs: string[], mode: DeliveryMode): DeliveryDraft {
  const visible = new Set(visiblePNs);
  return { ...draft, ...Object.fromEntries(items.filter(item => visible.has(item.pn)).map(item => [item.pn,
    String(mode === 'delivery' ? item.requested - item.before : item.requested)])) };
}

export function createDeliveryReview(items: DeliveryItem[], draft: DeliveryDraft,
  mode: DeliveryMode, version: number, reason: string) {
  if (!Number.isSafeInteger(version) || version < 0) throw new Error('Atualize a lista antes de conferir esta requisição.');
  const summary = calculateDelivery(items, draft, mode);
  if (summary.invalid) throw new Error('Confira as quantidades indicadas antes de continuar.');
  if (!summary.changedCount) throw new Error('Informe uma quantidade para registrar.');
  if (reason.length > 500) throw new Error('O motivo deve ter no máximo 500 caracteres.');
  if (summary.reduced && !reason.trim()) throw new Error('Informe o motivo da correção de quantidades já entregues.');
  return { summary, mode, payload: { version, motivo: mode === 'correction' ? reason.trim() : '',
    items: summary.rows.map(row => ({ pn: row.pn, quantidade_entregue: row.total! })) } };
}
