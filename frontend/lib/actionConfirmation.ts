import type { Registro } from '@/types';

export interface ActionConfirmationRequest {
  title: string;
  description: string;
  confirmLabel: string;
  records?: Registro[];
  omNumber?: string;
  onConfirm: (signal: AbortSignal) => Promise<void>;
}

export interface ActionConfirmationState {
  request: ActionConfirmationRequest | null;
  busy: boolean;
  error: string;
}

// Capture a seleção que será apresentada e enviada, inclusive fora da página atual.
export function snapshotRecordSelection(records: Registro[], ids: string[]): Registro[] {
  if (!ids.length || ids.length > 200 || new Set(ids).size !== ids.length) {
    throw new Error('Selecione entre 1 e 200 registros únicos para esta ação.');
  }
  const byId = new Map(records.map(record => [record.id, record]));
  return ids.map(id => {
    const record = byId.get(id);
    if (!record) throw new Error('A seleção contém um registro indisponível. Atualize a lista antes de continuar.');
    return { ...record };
  });
}

// Nenhuma operação é enviada ao abrir/cancelar. Confirmação repetida não reenvia.
export function createActionConfirmation({ timeoutMs = 10000 } = {}) {
  let state: ActionConfirmationState = { request: null, busy: false, error: '' };
  let listener: ((state: ActionConfirmationState) => void) | undefined;
  let generation = 0;
  let pending: AbortController | undefined;
  const publish = (next: ActionConfirmationState) => { state = next; listener?.(state); };
  return {
    subscribe(onChange: (state: ActionConfirmationState) => void) {
      listener = onChange;
      listener(state);
      return () => { listener = undefined; generation++; pending?.abort(); state = { request: null, busy: false, error: '' }; };
    },
    open(request: ActionConfirmationRequest) {
      if (state.request) return false;
      publish({ request, busy: false, error: '' });
      return true;
    },
    cancel() {
      if (state.busy) return false;
      publish({ request: null, busy: false, error: '' });
      return true;
    },
    async confirm() {
      if (!state.request || state.busy || state.error) return;
      const request = state.request;
      const started = generation;
      const operation = new AbortController();
      pending = operation;
      let timer: ReturnType<typeof setTimeout> | undefined;
      publish({ request, busy: true, error: '' });
      try {
        await Promise.race([
          request.onConfirm(operation.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('O servidor não confirmou o resultado no prazo esperado. A operação pode ter sido concluída; atualize a lista antes de repetir.'));
              operation.abort();
            }, timeoutMs);
          }),
        ]);
        if (started === generation) publish({ request: null, busy: false, error: '' });
      } catch (error) {
        if (started === generation) publish({ request, busy: false,
          error: error instanceof Error ? error.message : 'Não foi possível confirmar a operação.' });
      } finally {
        clearTimeout(timer);
        if (pending === operation) pending = undefined;
      }
    },
  };
}
