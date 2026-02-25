'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Keyboard, Sparkles } from 'lucide-react';

interface ProTimerProps {
  omNumber: string | null;
  elapsed: number; // Em milissegundos do backend
  isRunning: boolean;
  isPaused: boolean;
  activeOM: string | null;
}

export default function ProTimer({
  omNumber,
  elapsed: backendElapsed, // Backend retorna em milissegundos
  isRunning,
  isPaused,
  activeOM,
}: ProTimerProps) {
  // Converte milissegundos do backend para segundos
  const elapsedInSeconds = Math.floor(backendElapsed / 1000);
  const [displaySeconds, setDisplaySeconds] = useState(elapsedInSeconds);
  const lastSyncRef = useRef(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza com o backend quando o elapsed muda
  useEffect(() => {
    const newSeconds = Math.floor(backendElapsed / 1000);
    setDisplaySeconds(newSeconds);
    lastSyncRef.current = Date.now();
  }, [backendElapsed, activeOM]); // Re-sincroniza quando OM muda

  // Timer local apenas quando está running
  useEffect(() => {
    if (!isRunning || !activeOM || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Inicia o intervalo de atualização a cada segundo
    intervalRef.current = setInterval(() => {
      setDisplaySeconds((prev) => {
        // Calcula o tempo baseado no último sync + tempo decorrido desde o sync
        const now = Date.now();
        const timeSinceSync = Math.floor((now - lastSyncRef.current) / 1000);
        const newSeconds = elapsedInSeconds + timeSinceSync;
        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, activeOM, elapsedInSeconds, isPaused]);

  // Quando pausa, mantém o valor do backend (já convertido)
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplaySeconds(elapsedInSeconds);
    }
  }, [isPaused, elapsedInSeconds]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(displaySeconds / 3600);
    const minutes = Math.floor((displaySeconds % 3600) / 60);
    const seconds = displaySeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [displaySeconds]);

  const status = useMemo(() => {
    // Cores exatas do index-pro.html
    if (isRunning) return { 
      text: 'EM ANDAMENTO', 
      bg: '#0e1e18',
      border: '#194b3b',
      textColor: '#1cff9d',
      shadow: '0 0 8px rgba(28,255,157,0.2)'
    };
    if (isPaused) return { 
      text: 'PAUSADA', 
      bg: '#1a1506',
      border: '#574018',
      textColor: '#ffd166',
      shadow: '0 0 8px rgba(255,209,102,0.2)'
    };
    return { 
      text: 'PRONTO', 
      bg: '#101a2b',
      border: '#2b3850',
      textColor: '#c7d2fe',
      shadow: ''
    };
  }, [isRunning, isPaused]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-[73px] z-40 bg-gradient-to-r from-[#0b1220] to-[#0f172a] border border-slate-800 rounded-2xl px-4 py-3 mb-3 flex items-center justify-between gap-4 shadow-2xl"
      style={{ boxShadow: '0 8px 24px rgba(2,6,23,.5), inset 0 1px 0 rgba(255,255,255,.05)' }}
    >
      {/* Status e OM */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={isRunning || isPaused ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-3 py-1.5 rounded-full border font-bold text-xs uppercase tracking-wide"
          style={{
            background: status.bg,
            borderColor: status.border,
            color: status.textColor,
            boxShadow: status.shadow,
            letterSpacing: '0.6px'
          }}
        >
          {status.text}
        </motion.div>
        <div className="text-sm" style={{ color: '#cdd9f0' }}>
          <span style={{ color: '#8aa0c2', fontWeight: 700 }}>OM:</span>{' '}
          <span className="font-semibold" style={{ color: '#cdd9f0' }}>{activeOM || omNumber || '—'}</span>
        </div>
      </div>

      {/* Timer - Design PRO exato do index-pro.html */}
      <div className="relative">
        {/* Container timer-enhanced exato do CSS */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
            isRunning ? 'running' : isPaused ? 'paused' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(159, 47, 255, 0.1) 0%, rgba(11, 177, 211, 0.1) 100%)',
            border: '1px solid rgba(159, 47, 255, 0.3)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          {/* Efeito shimmer quando está running - efeito refresh passando */}
          {isRunning && (
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                width: '100%',
                height: '100%'
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 0.5
              }}
            />
          )}
          {/* Ícone de ampulheta - SVG exato fornecido */}
          <div className="flex-shrink-0 relative z-10">
            <motion.svg 
              className="w-12 h-12" 
              viewBox="-56 0 496 496" 
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: isRunning 
                  ? 'drop-shadow(0 0 8px rgba(159, 47, 255, 0.6))'
                  : 'drop-shadow(0 2px 8px rgba(159, 47, 255, 0.3))'
              }}
              animate={isRunning ? {
                scale: [1, 1.05, 1],
                filter: [
                  'drop-shadow(0 0 8px rgba(159, 47, 255, 0.6))',
                  'drop-shadow(0 0 12px rgba(11, 177, 211, 0.8))',
                  'drop-shadow(0 0 8px rgba(159, 47, 255, 0.6))'
                ]
              } : {}}
              transition={{
                duration: 2,
                repeat: isRunning ? Infinity : 0,
                ease: 'easeInOut'
              }}
            >
              <defs>
                <linearGradient id="timerGradient-pro" gradientUnits="userSpaceOnUse" x1="192" x2="192" y1="496" y2="0">
                  <stop offset="0" stopColor="#9f2fff" />
                  <stop offset="1" stopColor="#0bb1d3" />
                </linearGradient>
              </defs>
              <path d="m24 432h-8c-8.824219 0-16 7.175781-16 16v32c0 8.824219 7.175781 16 16 16h352c8.824219 0 16-7.175781 16-16v-32c0-8.824219-7.175781-16-16-16h-8v-144c0-5.441406-1.886719-10.40625-4.953125-14.441406 7.816406-5.839844 12.953125-15.070313 12.953125-25.558594s-5.136719-19.71875-12.953125-25.558594c3.066406-4.035156 4.953125-9 4.953125-14.441406v-144h8c8.824219 0 16-7.175781 16-16v-32c0-8.824219-7.175781-16-16-16h-352c-8.824219 0-16 7.175781-16 16v32c0 8.824219 7.175781 16 16 16h8v144c0 5.441406 1.886719 10.40625 4.953125 14.441406-7.816406 5.839844-12.953125 15.070313-12.953125 25.558594s5.136719 19.71875 12.953125 25.558594c-3.066406 4.035156-4.953125 9-4.953125 14.441406zm344 48h-352v-32h352zm-336-232c0-8.824219 7.175781-16 16-16s16 7.175781 16 16-7.175781 16-16 16-16-7.175781-16-16zm35.046875-25.558594c3.066406-4.035156 4.953125-9 4.953125-14.441406v-144h16v62.390625c0 43.371094 23.550781 83.394531 61.472656 104.464844 6.488282 3.609375 10.527344 10.472656 10.527344 17.90625 0 6.863281-3.40625 13.230469-9.121094 17.039062-39.375 26.246094-62.878906 70.167969-62.878906 117.488281v48.710938h-16v-144c0-5.441406-1.886719-10.40625-4.953125-14.441406 7.816406-5.839844 12.953125-15.070313 12.953125-25.558594s-5.136719-19.71875-12.953125-25.558594zm284.953125 25.558594c0 8.824219-7.175781 16-16 16s-16-7.175781-16-16 7.175781-16 16-16 16 7.175781 16 16zm-35.046875 25.558594c-3.066406 4.035156-4.953125 9-4.953125 14.441406v144h-16v-48.710938c0-47.320312-23.503906-91.242187-62.878906-117.496093-5.714844-3.808594-9.121094-10.175781-9.121094-17.039063 0-7.433594 4.039062-14.296875 10.527344-17.90625 37.921875-21.054687 61.472656-61.085937 61.472656-104.457031v-62.390625h16v144c0 5.441406 1.886719 10.40625 4.953125 14.441406-7.816406 5.839844-12.953125 15.070313-12.953125 25.558594s5.136719 19.71875 12.953125 25.558594zm-36.953125-193.558594h-24v16h24v30.390625c0 37.5625-20.398438 72.234375-53.230469 90.480469-11.585937 6.425781-18.769531 18.640625-18.769531 31.890625 0 12.222656 6.070312 23.566406 16.238281 30.351562 34.921875 23.269531 55.761719 62.214844 55.761719 104.175781v16.710938h-24v16h24v16h-176v-16h136v-16h-136v-16.710938c0-41.960937 20.839844-80.90625 55.761719-104.175781 10.167969-6.785156 16.238281-18.128906 16.238281-30.351562 0-13.242188-7.183594-25.464844-18.769531-31.890625-32.832031-18.246094-53.230469-52.910156-53.230469-90.480469v-30.390625h136v-16h-136v-16h176zm64 208v144h-16v-144c0-4.40625 3.585938-8 8-8s8 3.59375 8 8zm0-80c0 4.40625-3.585938 8-8 8s-8-3.59375-8-8v-144h16zm-328-192h352l.007812 32h-352.007812zm24 192v-144h16v144c0 4.40625-3.585938 8-8 8s-8-3.59375-8-8zm16 80v144h-16v-144c0-4.40625 3.585938-8 8-8s8 3.59375 8 8zm116.777344-99.113281-7.769532 13.984375c-21.710937-12.054688-37.320312-32.871094-42.832031-57.101563l15.59375-3.546875c4.511719 19.800782 17.269531 36.808594 35.007813 46.664063zm-36.777344-60.886719h-16v-16h16zm0 0" fill="url(#timerGradient-pro)" />
            </motion.svg>
          </div>
          
          {/* Label e Tempo - Cores exatas do index-pro.html */}
          <div className="flex flex-col gap-0.5">
            <div 
              className="text-xs font-bold uppercase"
              style={{
                color: '#8aa0c2',
                letterSpacing: '0.5px',
                fontSize: '11px'
              }}
            >
              TEMPO
            </div>
            <div 
              className="font-bold font-mono"
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '1.6rem',
                color: isRunning 
                  ? '#1cff9d'  // Verde neon quando running
                  : isPaused 
                    ? '#ffd166'  // Dourado quando paused
                    : '#39FF14',  // Verde neon padrão
                textShadow: isRunning
                  ? '0 0 12px rgba(28, 255, 157, 1), 0 0 20px rgba(28, 255, 157, 0.5)'
                  : isPaused
                    ? '0 0 10px rgba(255, 209, 102, 0.8)'
                    : '0 0 10px rgba(57, 255, 20, 0.8), 0 0 15px rgba(57, 255, 20, 0.4)',
                letterSpacing: '3px',
                lineHeight: '1.2'
              }}
            >
              {formattedTime}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Atalhos - Design Melhorado */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl"
      >
        <div className="flex items-center gap-1.5 text-slate-400">
          <Keyboard className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Atalhos:</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2.5 py-1 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/50 rounded-md text-[11px] font-semibold text-slate-200 shadow-sm group-hover:border-green-500/50 transition-colors">
              Alt+S
            </kbd>
            <span className="text-[11px] text-slate-400 font-medium">Iniciar</span>
          </div>
          <span className="text-slate-600 w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2.5 py-1 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/50 rounded-md text-[11px] font-semibold text-slate-200 shadow-sm group-hover:border-amber-500/50 transition-colors">
              Espaço
            </kbd>
            <span className="text-[11px] text-slate-400 font-medium">Pausar</span>
          </div>
          <span className="text-slate-600 w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1.5 group">
            <kbd className="px-2.5 py-1 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/50 rounded-md text-[11px] font-semibold text-slate-200 shadow-sm group-hover:border-red-500/50 transition-colors">
              Ctrl+Enter
            </kbd>
            <span className="text-[11px] text-slate-400 font-medium">Finalizar</span>
          </div>
        </div>
      </motion.div>
      
      {/* Versão Mobile - Tooltip */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/40 border border-slate-700/50 cursor-help group relative"
        title="Alt+S: Iniciar | Espaço: Pausar | Ctrl+Enter: Finalizar"
      >
        <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
      </motion.div>
    </motion.div>
  );
}

