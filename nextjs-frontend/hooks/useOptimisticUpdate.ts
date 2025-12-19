'use client';

import { useState, useTransition } from 'react';

/**
 * Hook para atualizações otimistas - recurso avançado do React/Next.js
 * Atualiza a UI antes da resposta do servidor
 */
export function useOptimisticUpdate<T>(
  initialData: T[],
  updateFn: (item: T) => Promise<T>,
  deleteFn?: (id: string) => Promise<void>
) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const optimisticAdd = (newItem: T) => {
    startTransition(async () => {
      // Atualização otimista - mostra antes da resposta do servidor
      const tempId = `temp-${Date.now()}`;
      setData([...data, { ...newItem, id: tempId, _optimistic: true }]);

      try {
        const savedItem = await updateFn(newItem);
        setData((prev) =>
          prev.map((item: any) =>
            item.id === tempId ? savedItem : item
          )
        );
      } catch (err: any) {
        setError(err.message);
        setData((prev) => prev.filter((item: any) => item.id !== tempId));
      }
    });
  };

  const optimisticDelete = (id: string) => {
    if (!deleteFn) return;

    startTransition(async () => {
      // Remove imediatamente (otimista)
      const removedItem = data.find((item: any) => item.id === id);
      setData((prev) => prev.filter((item: any) => item.id !== id));

      try {
        await deleteFn(id);
      } catch (err: any) {
        setError(err.message);
        // Reverte se falhar
        if (removedItem) {
          setData((prev) => [...prev, removedItem]);
        }
      }
    });
  };

  const optimisticUpdate = (id: string, updates: Partial<T>) => {
    startTransition(async () => {
      // Atualiza imediatamente (otimista)
      const oldItem = data.find((item: any) => item.id === id);
      setData((prev) =>
        prev.map((item: any) =>
          item.id === id ? { ...item, ...updates, _optimistic: true } : item
        )
      );

      try {
        const updatedItem = await updateFn({ ...oldItem, ...updates } as T);
        setData((prev) =>
          prev.map((item: any) =>
            item.id === id ? updatedItem : item
          )
        );
      } catch (err: any) {
        setError(err.message);
        // Reverte se falhar
        if (oldItem) {
          setData((prev) =>
            prev.map((item: any) => item.id === id ? oldItem : item)
          );
        }
      }
    });
  };

  return {
    data,
    isPending,
    error,
    optimisticAdd,
    optimisticDelete,
    optimisticUpdate,
    setData,
  };
}

