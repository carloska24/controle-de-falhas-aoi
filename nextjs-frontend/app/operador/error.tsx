'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function IndexError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro na página de registro:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-red-500/30 shadow-2xl p-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center"
          >
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Erro na Página de Registro
          </h1>
          <p className="text-slate-400 mb-6">
            {error.message || 'Ocorreu um erro ao carregar a página de registro'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button onClick={reset} variant="primary">
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
            <Link href="/login">
              <Button variant="ghost">
                <Home className="w-4 h-4" />
                Voltar para Login
              </Button>
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
                Detalhes do erro (dev)
              </summary>
              <pre className="mt-2 p-4 bg-slate-900/50 rounded-lg text-xs text-slate-300 overflow-auto max-h-60">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </motion.div>
    </div>
  );
}

