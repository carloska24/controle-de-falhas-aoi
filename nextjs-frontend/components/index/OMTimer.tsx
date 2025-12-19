'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Square } from 'lucide-react';
import Button from '@/components/ui/Button';

interface OMTimerProps {
  elapsed: number; // em segundos
  isRunning: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  omNumber?: string;
}

export default function OMTimer({
  elapsed,
  isRunning,
  isPaused,
  onPause,
  onResume,
  onFinish,
  omNumber,
}: OMTimerProps) {
  const [displayTime, setDisplayTime] = useState('00:00:00');

  useEffect(() => {
    const formatTimer = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (isRunning && !isPaused) {
      let currentSeconds = Math.floor(elapsed);
      setDisplayTime(formatTimer(currentSeconds));
      
      const interval = setInterval(() => {
        currentSeconds += 1;
        setDisplayTime(formatTimer(currentSeconds));
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setDisplayTime(formatTimer(Math.floor(elapsed)));
    }
  }, [elapsed, isRunning, isPaused]);

  if (!isRunning && !isPaused && elapsed === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-green-500/30 rounded-2xl p-6 shadow-2xl min-w-[320px]">
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-green-400 mb-2">
              Inspeção Ativa {omNumber && `- ${omNumber}`}
            </div>
            <div className="font-mono text-3xl font-bold text-white tracking-wider bg-slate-950 rounded-lg px-4 py-3 border border-slate-700">
              {displayTime}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {isPaused ? 'Inspeção Pausada' : isRunning ? 'Inspeção em andamento' : 'Inspeção Finalizada'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                variant="primary"
                size="sm"
                onClick={onResume}
                className="flex-1"
              >
                <Play className="w-4 h-4" />
                Retomar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={onPause}
                disabled={!isRunning}
                className="flex-1"
              >
                <Pause className="w-4 h-4" />
                Pausar
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={onFinish}
              disabled={!isRunning && !isPaused}
              className="flex-1"
            >
              <Square className="w-4 h-4" />
              Finalizar
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

