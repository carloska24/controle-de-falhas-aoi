import type { Registro } from '@/types/index';

export interface SmtQueueState {
  status: 'loading' | 'ready' | 'error';
  records: Registro[];
  error: string;
}

export function filterSmtQueue(records: Registro[], search: string): Registro[] {
  const term = search.trim().toLocaleLowerCase('pt-BR');
  return records.filter(record => [record.om, record.designador, record.pn]
    .some(value => value?.toLocaleLowerCase('pt-BR').includes(term)));
}

export function createSmtQueueLoader(options: {
  read: (signal: AbortSignal) => Promise<Registro[]>;
  onState: (state: SmtQueueState) => void;
  timeoutMs?: number;
}) {
  let state: SmtQueueState = { status: 'loading', records: [], error: '' };
  let disposed = false;
  let revision = 0;
  let pending: AbortController | undefined;
  const publish = (next: SmtQueueState) => {
    state = next;
    if (!disposed) options.onState(next);
  };

  return {
    getState: () => state,
    async load() {
      if (disposed) return;
      const current = ++revision;
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      publish({ ...state, status: 'loading', error: '' });
      let timeout: ReturnType<typeof setTimeout>;
      let onAbort: () => void;
      let timedOut = false;
      const interrupted = new Promise<never>((_, reject) => {
        onAbort = () => reject(new Error(timedOut
          ? 'A consulta excedeu o tempo de resposta. Verifique a conexão e tente novamente.'
          : 'Consulta cancelada.'));
        controller.signal.addEventListener('abort', onAbort, { once: true });
        timeout = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 15000);
      });
      try {
        const rows = await Promise.race([options.read(controller.signal), interrupted]);
        if (disposed || current !== revision) return;
        const records = rows.filter(record => record.tipodefeito === 'Possível Incorreto');
        const time = (record: Registro) => Number.isFinite(Date.parse(record.createdat)) ? Date.parse(record.createdat) : Infinity;
        records.sort((a, b) => (time(a) - time(b)) || a.id.localeCompare(b.id));
        publish({ status: 'ready', records, error: '' });
      } catch (error) {
        if (disposed || current !== revision) return;
        publish({ ...state, status: 'error', error: error instanceof Error ? error.message : 'Não foi possível consultar a fila.' });
      } finally {
        clearTimeout(timeout!);
        controller.signal.removeEventListener('abort', onAbort!);
        if (pending === controller) pending = undefined;
      }
    },
    removeConfirmed(id: string) {
      if (!disposed && state.status === 'ready') publish({ ...state, records: state.records.filter(record => record.id !== id) });
    },
    invalidate(message: string) {
      if (disposed) return;
      revision++;
      pending?.abort();
      pending = undefined;
      publish({ ...state, status: 'error', error: message });
    },
    dispose() {
      disposed = true;
      revision++;
      pending?.abort();
      pending = undefined;
    },
  };
}
