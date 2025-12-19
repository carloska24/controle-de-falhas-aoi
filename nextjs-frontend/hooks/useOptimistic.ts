import { useState, useTransition, useCallback } from 'react';

/**
 * Hook para Optimistic UI Updates
 * Atualiza o estado imediatamente e depois sincroniza com o servidor
 */
export function useOptimistic<T>(
  initialValue: T,
  updateFn: (current: T, optimistic: T) => T = (_, optimistic) => optimistic
) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<T>(initialValue);
  const [optimisticState, setOptimisticState] = useState<T | null>(null);

  const setOptimistic = useCallback((newValue: T) => {
    setOptimisticState(newValue);
    setState(updateFn(state, newValue));
  }, [state, updateFn]);

  const commit = useCallback((finalValue: T) => {
    startTransition(() => {
      setState(finalValue);
      setOptimisticState(null);
    });
  }, []);

  const rollback = useCallback(() => {
    startTransition(() => {
      setOptimisticState(null);
      // Reverte para o estado anterior se necessário
    });
  }, []);

  return {
    state: optimisticState ?? state,
    originalState: state,
    isPending,
    setOptimistic,
    commit,
    rollback,
    setState,
  };
}

