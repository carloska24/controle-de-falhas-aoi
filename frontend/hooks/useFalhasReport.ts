'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAutenticado } from '@/lib/api';
import { parseFalhasSnapshot, parseReportOptions, type FalhasSnapshot } from '@/lib/falhasReport';

export function useFalhasReport(query: string, enabled: boolean) {
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ key: string; status: 'loading' | 'ready' | 'error'; data?: FalhasSnapshot; options?: FalhasSnapshot['options']; error?: string }>({ key: '', status: 'loading' });
  const refresh = useCallback(async () => {
    if (!enabled) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const current = ++generation.current;
    const timer = setTimeout(() => controller.abort(), 20000);
    setState(previous => ({ key: query, status: 'loading', data: previous.data, options: previous.options }));
    try {
      const result = await fetchAutenticado('/api/relatorio-falhas/snapshot?' + query, { signal: controller.signal });
      const data = parseFalhasSnapshot(result);
      if (current === generation.current && !controller.signal.aborted) setState({ key: query, status: 'ready', data, options: data.options });
    } catch (error) {
      const options = parseReportOptions((error as Error & { details?: { options?: unknown } }).details?.options);
      if (current === generation.current) setState(previous => ({ key: query, status: 'error', data: previous.data, options: options || previous.options, error: controller.signal.aborted
        ? 'O relatório não foi confirmado no prazo esperado. Tente atualizar novamente.' : (error as Error).message }));
    } finally { clearTimeout(timer); }
  }, [query, enabled]);
  useEffect(() => {
    void refresh();
    return () => { generation.current++; pending.current?.abort(); };
  }, [refresh]);
  const ready = state.key === query && state.status === 'ready';
  return { snapshot: ready ? state.data : undefined, options: state.options, ready, refresh,
    loading: state.key !== query || state.status === 'loading', error: state.key === query ? state.error : undefined };
}
