export interface OMSnapshot {
  omNumber: string;
  status: 'em_andamento' | 'pausada' | 'finalizada';
  version: number;
  elapsed: number;
  qtdlote: number | null;
  startTime: number;
  endTime: number | null;
}

export function parseOMSnapshot(value: unknown, expectedOM: string): OMSnapshot {
  const data = value as OMSnapshot | null;
  if (!data || data.omNumber !== expectedOM || !['em_andamento', 'pausada', 'finalizada'].includes(data.status) ||
      !Number.isSafeInteger(data.version) || data.version < 0 || !Number.isFinite(data.elapsed) || data.elapsed < 0 ||
      !Number.isFinite(data.startTime) || (data.status === 'finalizada' && !Number.isFinite(data.endTime)) ||
      (data.qtdlote != null && (!Number.isSafeInteger(data.qtdlote) || data.qtdlote <= 0))) {
    throw new Error('O servidor retornou um estado inválido para a OM. Aguarde a sincronização.');
  }
  return { omNumber: data.omNumber, status: data.status, version: data.version, elapsed: data.elapsed,
    qtdlote: data.qtdlote ?? null, startTime: data.startTime, endTime: data.endTime ?? null };
}

interface SessionOptions {
  omNumber: string;
  read: (omNumber: string, signal: AbortSignal) => Promise<unknown>;
  getRevision: () => number;
  onSnapshot: (snapshot: OMSnapshot, statusChanged: boolean) => void;
  onConnectionLost: (error: Error) => void;
  onRecovered: () => void;
  timeoutMs?: number;
  canRead?: () => boolean;
}

export class OMSupersededError extends Error {
  constructor() { super('A seleção da OM mudou durante a consulta.'); }
}
class OMTimeoutError extends Error {
  constructor() { super('A consulta da OM excedeu o tempo de resposta.'); }
}

async function readWithDeadline<T>(read: () => Promise<T>, controller: AbortController, timeoutMs: number): Promise<T> {
  if (controller.signal.aborted) throw new OMSupersededError();
  let timedOut = false;
  let onAbort = () => {};
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => reject(timedOut ? new OMTimeoutError() : new OMSupersededError());
    controller.signal.addEventListener('abort', onAbort, { once: true });
  });
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try { return await Promise.race([read(), interrupted]); }
  finally { clearTimeout(timeout); controller.signal.removeEventListener('abort', onAbort); }
}

export function createOMRequestCoordinator(options: {
  getRevision: () => number;
  advanceRevision: () => void;
  read: (url: string, options: RequestInit) => Promise<any>;
  timeoutMs?: number;
}) {
  let pending: { token: number; mutating: boolean; controller: AbortController } | undefined;
  return {
    isPending: () => !!pending,
    cancelAll() { pending?.controller.abort(); pending = undefined; options.advanceRevision(); },
    clearSelection() {
      if (pending?.mutating) return false;
      pending?.controller.abort(); pending = undefined; options.advanceRevision();
      return true;
    },
    async request(url: string, requestOptions: RequestInit = {}) {
      const mutating = !!requestOptions.method && requestOptions.method.toUpperCase() !== 'GET';
      if (pending?.mutating || (mutating && pending)) throw new Error('Aguarde a operação atual da OM antes de continuar.');
      pending?.controller.abort();
      options.advanceRevision();
      const token = options.getRevision();
      const controller = new AbortController();
      pending = { token, mutating, controller };
      try {
        const data = await readWithDeadline(() => options.read(url, { ...requestOptions, signal: controller.signal }), controller, options.timeoutMs ?? 8000);
        if (token !== options.getRevision()) throw new OMSupersededError();
        return data;
      } catch (error) {
        if (token !== options.getRevision()) throw new OMSupersededError();
        throw error;
      } finally { if (pending?.token === token) pending = undefined; }
    },
  };
}

// Uma sessão pertence a uma única seleção. Nunca publique resposta de outra OM
// ou de uma consulta iniciada antes de um comando confirmado neste terminal.
export function createOMSyncSession(options: SessionOptions) {
  let disposed = false;
  let generation = 0;
  let failed = false;
  let lastSnapshot: OMSnapshot | undefined;
  let pending: { revision: number; controller: AbortController; promise: Promise<OMSnapshot | null> } | undefined;

  function refresh(force = false): Promise<OMSnapshot | null> {
    if (disposed || options.canRead?.() === false) return Promise.resolve(null);
    const revision = options.getRevision();
    if (!force && pending?.revision === revision) return pending.promise;
    pending?.controller.abort();
    const id = ++generation;
    const controller = new AbortController();
    const promise = (async () => {
      try {
        const raw = await readWithDeadline(() => options.read(options.omNumber, controller.signal), controller, options.timeoutMs ?? 8000);
        if (disposed || id !== generation || revision !== options.getRevision()) return null;
        const snapshot = parseOMSnapshot(raw, options.omNumber);
        if (lastSnapshot && snapshot.version < lastSnapshot.version) throw new Error('A consulta retornou um estado antigo da OM. Aguarde a atualização.');
        const changed = lastSnapshot?.status !== snapshot.status;
        lastSnapshot = snapshot;
        options.onSnapshot(snapshot, changed);
        if (failed) { failed = false; options.onRecovered(); }
        return snapshot;
      } catch (error) {
        if (!disposed && id === generation && revision === options.getRevision() && (!controller.signal.aborted || error instanceof OMTimeoutError)) {
          if (!failed) options.onConnectionLost(error instanceof Error ? error : new Error('Falha ao sincronizar a OM.'));
          failed = true;
        }
        return null;
      } finally {
        if (pending?.controller === controller) pending = undefined;
      }
    })();
    pending = { revision, controller, promise };
    return promise;
  }

  return { refresh, dispose() { disposed = true; generation++; pending?.controller.abort(); } };
}
