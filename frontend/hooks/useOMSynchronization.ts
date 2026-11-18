'use client';

import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import { fetchAutenticado } from '@/lib/api';
import { createOMSyncSession, type OMSnapshot } from '@/lib/omSync';

interface Options {
  omNumber: string | null;
  enabled: boolean;
  revision: MutableRefObject<number>;
  onSnapshot: (snapshot: OMSnapshot, statusChanged: boolean) => void;
  onConnectionLost: (error: Error) => void;
  onRecovered: () => void;
  isOperationPending: () => boolean;
}

export function useOMSynchronization(options: Options) {
  const callbacks = useRef(options);
  callbacks.current = options;
  const [confirmedOM, setConfirmedOM] = useState<string | null>(null);
  const [lastConfirmedAt, setLastConfirmedAt] = useState<number | null>(null);
  const session = useRef<ReturnType<typeof createOMSyncSession> | null>(null);
  const selectedOM = useRef(options.omNumber);
  selectedOM.current = options.omNumber;

  useEffect(() => {
    setConfirmedOM(null);
    setLastConfirmedAt(null);
    if (!options.enabled || !options.omNumber) return;
    const number = options.omNumber;
    const current = createOMSyncSession({
      omNumber: number,
      getRevision: () => callbacks.current.revision.current,
      canRead: () => !callbacks.current.isOperationPending(),
      read: (om, signal) => fetchAutenticado(`/api/om/${encodeURIComponent(om)}`, { signal }),
      onSnapshot: (snapshot, changed) => {
        if (selectedOM.current !== number) return;
        callbacks.current.onSnapshot(snapshot, changed);
        setConfirmedOM(number);
        setLastConfirmedAt(Date.now());
      },
      onConnectionLost: error => {
        if (selectedOM.current !== number) return;
        setConfirmedOM(null);
        callbacks.current.onConnectionLost(error);
      },
      onRecovered: () => { if (selectedOM.current === number) callbacks.current.onRecovered(); },
    });
    session.current = current;
    void current.refresh();
    // Continua consultando OMs pausadas: outro terminal pode retomá-las.
    const timer = setInterval(() => void current.refresh(), 5000);
    const onFocus = () => void current.refresh(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      current.dispose();
      if (session.current === current) session.current = null;
    };
  }, [options.omNumber, options.enabled]);

  const refresh = useCallback(async () => {
    const current = session.current;
    if (!current) return null;
    const snapshot = await current.refresh(true);
    return snapshot?.omNumber === selectedOM.current ? snapshot : null;
  }, []);
  return { isSynchronized: !options.omNumber || confirmedOM === options.omNumber, lastConfirmedAt, refresh };
}
