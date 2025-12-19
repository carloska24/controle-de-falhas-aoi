'use client';

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface OMTimeSummaryProps {
  startTime: number | null;
  endTime: number | null;
  elapsed: number;
  visible?: boolean;
}

export default function OMTimeSummary({
  startTime,
  endTime,
  elapsed,
  visible = false,
}: OMTimeSummaryProps) {
  if (!visible) return null;

  const formatTimestamp = (ms: number | null) => {
    if (!ms) return 'N/A';
    const date = new Date(ms);
    // Verificar se a data é válida
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimer = (ms: number) => {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-purple-500/20 rounded-xl p-5 overflow-hidden"
      style={{
        boxShadow: '0 4px 16px rgba(2, 6, 23, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400 opacity-60" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-slate-400" style={{ opacity: 0.7 }} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Resumo do Tempo
        </span>
      </div>

      {/* Grid with Início and Fim */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Início
          </span>
          <span className="text-sm text-slate-200 font-medium font-mono">
            {formatTimestamp(startTime)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fim</span>
          <span className="text-sm text-slate-200 font-medium font-mono">
            {formatTimestamp(endTime)}
          </span>
        </div>
      </div>

      {/* Time Total Card */}
      <div className="relative bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg p-4 text-center overflow-hidden">
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(28, 255, 157, 0.1), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 0.5,
          }}
        />
        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide block mb-2 relative z-10">
          Tempo Total
        </span>
        <span
          className="font-mono text-3xl font-bold text-emerald-300 block relative z-10"
          style={{
            textShadow: '0 0 12px rgba(28, 255, 157, 0.8), 0 0 20px rgba(28, 255, 157, 0.4)',
            letterSpacing: '3px',
          }}
        >
          {formatTimer(elapsed)}
        </span>
      </div>
    </motion.div>
  );
}
