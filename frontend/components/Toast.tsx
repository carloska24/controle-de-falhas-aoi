'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`toast toast-${type} fixed bottom-4 right-4 p-3 rounded-lg shadow-lg z-50 min-w-[250px] max-w-md`}
      style={{
        backgroundColor:
          type === 'success'
            ? 'rgba(34, 197, 94, 0.15)'
            : type === 'error'
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(59, 130, 246, 0.15)',
        color:
          type === 'success'
            ? '#86efac'
            : type === 'error'
            ? '#fca5a5'
            : '#93c5fd',
        border: `1px solid ${
          type === 'success'
            ? 'rgba(34, 197, 94, 0.3)'
            : type === 'error'
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(59, 130, 246, 0.3)'
        }`,
      }}
    >
      {message}
    </motion.div>
  );
}

export function ToastContainer({ toasts }: { toasts: Array<{ id: string; message: string; type?: string; onClose: () => void }> }) {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type as any}
          onClose={toast.onClose}
        />
      ))}
    </AnimatePresence>
  );
}

