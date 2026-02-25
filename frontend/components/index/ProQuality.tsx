'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Registro, OM } from '@/types/index';

interface ProQualityProps {
  registros: Registro[];
  selectedIds: string[];
  activeOM?: string | null;
  activeOMQtdLote?: number | null;
  omState?: {
    isRunning: boolean;
    isPaused: boolean;
    omNumber: string | null;
  };
  finishedOMs?: OM[];
}

// Função para determinar status da qualidade baseado no aproveitamento
function getQualityStatus(yieldPercent: number): {
  status: 'excelente' | 'bom' | 'medio' | 'ruim' | 'reprovado';
  label: string;
  textColor: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  metalColor: string;
  metalGradient: string;
} {
  if (yieldPercent > 90) {
    return {
      status: 'excelente',
      label: 'Excelente',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-400',
      bgGradient: 'from-slate-600/30 to-slate-800/30',
      glowColor: 'emerald',
      metalColor: '#E5E7EB', // Platina
      metalGradient: 'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 50%, #E5E7EB 100%)',
    };
  } else if (yieldPercent >= 80) {
    return {
      status: 'bom',
      label: 'Bom',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-400',
      bgGradient: 'from-yellow-600/30 to-amber-700/30',
      glowColor: 'yellow',
      metalColor: '#FCD34D', // Ouro
      metalGradient: 'linear-gradient(135deg, #FCD34D 0%, #D97706 50%, #FCD34D 100%)',
    };
  } else if (yieldPercent >= 70) {
    return {
      status: 'medio',
      label: 'Médio',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-400',
      bgGradient: 'from-slate-500/30 to-gray-600/30',
      glowColor: 'blue',
      metalColor: '#9CA3AF', // Prata
      metalGradient: 'linear-gradient(135deg, #F3F4F6 0%, #6B7280 50%, #F3F4F6 100%)',
    };
  } else if (yieldPercent >= 50) {
    return {
      status: 'ruim',
      label: 'Ruim',
      textColor: 'text-orange-300',
      borderColor: 'border-orange-400',
      bgGradient: 'from-orange-600/30 to-red-700/30',
      glowColor: 'orange',
      metalColor: '#D97706', // Bronze
      metalGradient: 'linear-gradient(135deg, #F97316 0%, #92400E 50%, #F97316 100%)',
    };
  } else {
    return {
      status: 'reprovado',
      label: 'Reprovado',
      textColor: 'text-red-400',
      borderColor: 'border-red-500',
      bgGradient: 'from-red-700/30 to-rose-900/30',
      glowColor: 'red',
      metalColor: '#7F1D1D', // Ferro/Preto
      metalGradient: 'linear-gradient(135deg, #991B1B 0%, #450A0A 50%, #991B1B 100%)',
    };
  }
}

export default function ProQuality({ 
  registros, 
  selectedIds,
  activeOM,
  activeOMQtdLote,
  omState,
  finishedOMs = [],
}: ProQualityProps) {
  // Verificar se a OM está finalizada
  const isOMFinished = useMemo(() => {
    if (!activeOM) return false;
    
    // Verificar se está na lista de OMs finalizadas
    const isInFinishedList = finishedOMs.some(om => om.omNumber === activeOM && om.status === 'finished');
    
    // OU verificar se a OM atual não está rodando nem pausada e omState.omNumber é null (foi finalizada)
    const currentOMFinished = (omState?.omNumber === null || omState?.omNumber !== activeOM) && 
                              !omState?.isRunning && 
                              !omState?.isPaused;
    
    // OU verificar se a OM está na lista de finalizadas
    return isInFinishedList || currentOMFinished;
  }, [activeOM, finishedOMs, omState]);

  // Calcular qualidade quando OM está finalizada
  const qualityData = useMemo(() => {
    if (!isOMFinished || !activeOMQtdLote || activeOMQtdLote === 0) {
      return null;
    }

    const totalFalhas = registros.filter(r => r.om === activeOM).length;
    const yieldPercent = ((activeOMQtdLote - totalFalhas) / activeOMQtdLote) * 100;
    
    return {
      yield: yieldPercent,
      totalInspecionado: activeOMQtdLote,
      totalFalhas,
      ...getQualityStatus(yieldPercent),
    };
  }, [isOMFinished, activeOM, activeOMQtdLote, registros]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-b from-[#16243a] to-[#112137] border-2 border-purple-500/40 rounded-2xl p-6 shadow-2xl"
    >
      {/* Header - SVG no canto superior esquerdo */}
      <div className="flex items-start gap-3 mb-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          whileHover={{ 
            scale: 1.1, 
            rotate: [0, -10, 10, -10, 0],
            transition: { duration: 0.4 }
          }}
          className="flex-shrink-0"
        >
          <svg 
            id="quality-seal-icon"
            enableBackground="new 0 0 500 500" 
            height="40" 
            viewBox="0 0 500 500" 
            width="40" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            <defs>
              {/* Gradiente monocromático criativo - tons de ciano/azul - FLASHES MAIS FREQUENTES E ATRATIVOS */}
              <linearGradient id="sealGradientMono" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.6;1;0.8;1" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="stop-color" values="#06b6d4;#22d3ee;#06b6d4" dur="1.2s" repeatCount="indefinite" />
                </stop>
                <stop offset="25%" stopColor="#22d3ee" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="0.7;1;0.7;1;0.7" dur="1.2s" repeatCount="indefinite" begin="0.2s" />
                  <animate attributeName="stop-color" values="#22d3ee;#0891b2;#22d3ee" dur="1.2s" repeatCount="indefinite" begin="0.2s" />
                </stop>
                <stop offset="50%" stopColor="#0891b2" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.8;1;0.9;1" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                  <animate attributeName="stop-color" values="#0891b2;#06b6d4;#0891b2" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                </stop>
                <stop offset="75%" stopColor="#06b6d4" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="0.8;1;0.8;1;0.8" dur="1.2s" repeatCount="indefinite" begin="0.6s" />
                  <animate attributeName="stop-color" values="#06b6d4;#22d3ee;#06b6d4" dur="1.2s" repeatCount="indefinite" begin="0.6s" />
                </stop>
                <stop offset="100%" stopColor="#0891b2" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.7;1;0.9;1" dur="1.2s" repeatCount="indefinite" begin="0.8s" />
                  <animate attributeName="stop-color" values="#0891b2;#06b6d4;#0891b2" dur="1.2s" repeatCount="indefinite" begin="0.8s" />
                </stop>
                <animateTransform 
                  attributeName="gradientTransform" 
                  type="rotate" 
                  values="0 250 250;360 250 250" 
                  dur="5s" 
                  repeatCount="indefinite" 
                />
              </linearGradient>
              
              {/* Gradiente radial para o joinha (centro) */}
              <radialGradient id="thumbsGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="1;0.9;1" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="1">
                  <animate attributeName="stop-opacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" begin="0.5s" />
                </stop>
                <stop offset="100%" stopColor="#0891b2" stopOpacity="1" />
              </radialGradient>
              
              <filter id="sealGlow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Brilho pulsante - MAIS INTENSO E FREQUENTE */}
              <filter id="sealPulse">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feColorMatrix in="coloredBlur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.5 0" result="brightenedBlur"/>
                <feMerge>
                  <feMergeNode in="brightenedBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
                <animate attributeName="stdDeviation" values="3;5;3;4.5;3" dur="1.2s" repeatCount="indefinite" />
              </filter>
              
              {/* Filtro de brilho adicional para efeito flash */}
              <filter id="sealFlash">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feOffset in="blur" dx="0" dy="0" result="offsetBlur"/>
                <feSpecularLighting in="blur" surfaceScale="3" specularConstant="1.2" specularExponent="25" lightingColor="#22d3ee" result="specOut">
                  <fePointLight x="250" y="100" z="150"/>
                </feSpecularLighting>
                <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                <feMerge>
                  <feMergeNode in="specOut2"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
                <animate attributeName="stdDeviation" values="2;4;2;3;2" dur="1s" repeatCount="indefinite" />
              </filter>
            </defs>
            <g filter="url(#sealGlow)">
              <g filter="url(#sealFlash)">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="0 250 250;4 250 250;-4 250 250;0 250 250"
                  dur="3s"
                  repeatCount="indefinite"
                />
                {/* SVG completo com joinha incluído */}
                <path 
                  clipRule="evenodd" 
                  fillRule="evenodd"
                  d="m250.01 153.69c47.81 0 91.1 19.38 122.43 50.72 31.33 31.33 50.72 74.62 50.72 122.44s-19.38 91.1-50.72 122.43-74.62 50.71-122.43 50.71-91.1-19.38-122.44-50.71c-31.33-31.33-50.71-74.62-50.71-122.43s19.38-91.1 50.71-122.44c31.34-31.34 74.63-50.72 122.44-50.72zm-164.94-94.79c-.66-2.09-2.28-3.84-4.53-4.56-3.67-1.18-7.6.84-8.78 4.51l-12.57 38.96-40.44-.08c-2.33-.17-4.7.84-6.17 2.87-2.27 3.13-1.57 7.5 1.56 9.76l33.17 24-12.73 38.92.02.01c-.66 2.05-.37 4.38.99 6.26 2.27 3.11 6.62 3.8 9.73 1.53l33.09-24.14 32.66 23.82c1.79 1.52 4.3 2.1 6.69 1.32 3.67-1.19 5.68-5.14 4.48-8.8l-12.73-38.92 33.17-24-.01-.01c1.75-1.27 2.88-3.32 2.88-5.65 0-3.85-3.12-6.97-6.97-6.97l-40.95.08zm.83 48.02-7.5-23.22-7.5 23.22c-.9 2.81-3.53 4.84-6.64 4.84l-24.42-.05 19.78 14.31c2.39 1.73 3.5 4.86 2.54 7.82l-7.59 23.22 19.62-14.31c2.39-1.81 5.77-1.94 8.32-.08l19.73 14.39-7.51-22.96c-1.06-2.87-.14-6.2 2.46-8.08l19.78-14.31-24.09.05c-3.08.15-5.99-1.77-6.98-4.84zm342.37-48.02c-.66-2.09-2.28-3.84-4.53-4.56-3.67-1.18-7.6.84-8.78 4.51l-12.57 38.96-40.44-.08c-2.33-.17-4.7.84-6.17 2.87-2.27 3.13-1.57 7.5 1.56 9.76l33.17 24-12.73 38.92.02.01c-.66 2.05-.37 4.38.99 6.26 2.27 3.11 6.62 3.8 9.73 1.53l33.09-24.14 32.66 23.82c1.79 1.52 4.3 2.1 6.69 1.32 3.67-1.19 5.68-5.14 4.48-8.8l-12.73-38.92 33.17-24-.01-.01c1.75-1.27 2.88-3.32 2.88-5.65 0-3.85-3.12-6.97-6.97-6.97l-40.95.08zm.84 48.02-7.5-23.22-7.5 23.22c-.9 2.81-3.53 4.84-6.64 4.84l-24.42-.05 19.78 14.31c2.39 1.73 3.5 4.86 2.54 7.82l-7.59 23.22 19.62-14.31c2.39-1.81 5.77-1.94 8.32-.08l19.73 14.39-7.51-22.96c-1.06-2.87-.14-6.2 2.46-8.08l19.78-14.31-24.09.05c-3.09.15-6-1.77-6.98-4.84zm-172.44-102.01 12.56 38.91 40.95-.08c3.85 0 6.97 3.12 6.97 6.97 0 2.32-1.14 4.38-2.88 5.65l.01.01-33.17 24 12.73 38.92c1.19 3.67-.81 7.61-4.48 8.8-2.39.78-4.9.19-6.69-1.32l-32.66-23.82-33.09 24.14c-3.11 2.27-7.47 1.58-9.73-1.53-1.37-1.88-1.66-4.21-.99-6.26l-.02-.01 12.73-38.92-33.17-24c-3.13-2.27-3.82-6.64-1.56-9.76 1.47-2.03 3.84-3.04 6.17-2.87l40.44.08 12.58-38.96c1.18-3.67 5.11-5.69 8.78-4.51 2.24.72 3.86 2.47 4.52 4.56zm.84 48.02-7.5-23.22-7.5 23.22c-.9 2.81-3.53 4.84-6.64 4.84l-24.41-.05 19.78 14.31c2.39 1.73 3.5 4.86 2.54 7.82l-7.59 23.22 19.62-14.31c2.39-1.81 5.77-1.94 8.32-.08l19.73 14.39-7.51-22.96c-1.06-2.87-.14-6.2 2.46-8.08l19.78-14.31-24.09.05c-3.1.14-6.01-1.77-6.99-4.84zm-45.82 245.35.14 90.65h91.05c3.04 0 5.82-1.02 7.96-2.77 2.15-1.76 3.71-4.26 4.32-7.22l13.53-65.89c.4-1.94.38-3.8-.05-5.53s-1.27-3.39-2.53-4.93c-1.24-1.53-2.69-2.68-4.29-3.44-1.59-.76-3.41-1.14-5.42-1.14h-47.82c-3.87 0-7-3.13-7-7 0-1.01.21-1.96.6-2.83l1.52-4.32c7.58-21.58 11.6-33.03 1.06-42.82-1.06-.99-2.22-1.65-3.42-1.98s-2.55-.35-3.98-.04-2.65.88-3.6 1.67c-.96.8-1.74 1.88-2.29 3.22l-18.79 44.98c-3.78 9.04-12.87 9.68-20.99 9.39zm-13.8 96.69-.16-103.31c-1.37-7.36-13.77-9.06-13.77 3.91v96.49c0 11.71 10.8 13.58 13.93 2.91zm104.99 7.96c6.32 0 12.16-2.19 16.77-5.94 4.59-3.75 7.91-9.04 9.19-15.25l13.53-65.89c.82-4 .76-7.92-.16-11.66-.92-3.73-2.68-7.23-5.26-10.4-2.59-3.18-5.67-5.61-9.16-7.27s-7.32-2.51-11.38-2.51h-37.97c8.49-24.38 12.11-38.09-4.16-53.2-2.71-2.52-5.86-4.27-9.27-5.21s-7-1.04-10.6-.26c-3.61.78-6.83 2.36-9.56 4.63-2.72 2.26-4.86 5.16-6.29 8.58l-18.79 44.98c-.46 1.11-5.49.92-9.81.7-8.76-19.64-40.01-15.43-40.01 11.35v96.49c0 25.89 29.73 32.66 39.82 10.86zm-52.87-220.02c-39.74 0-75.73 16.11-101.77 42.16-26.05 26.05-42.16 62.03-42.16 101.77s16.11 75.73 42.16 101.77c26.05 26.05 62.03 42.16 101.77 42.16s75.73-16.11 101.77-42.16c26.05-26.05 42.16-62.03 42.16-101.77s-16.11-75.73-42.16-101.77c-26.04-26.05-62.03-42.16-101.77-42.16zm91.87 52.06c-23.51-23.51-55.99-38.06-91.87-38.06s-68.36 14.54-91.88 38.06c-23.51 23.51-38.06 55.99-38.06 91.87s14.54 68.36 38.06 91.88c23.51 23.51 56 38.06 91.88 38.06s68.36-14.54 91.87-38.06c23.51-23.51 38.06-56 38.06-91.88s-14.54-68.36-38.06-91.87zm20.67-20.67c-28.8-28.8-68.59-46.61-112.54-46.61s-83.74 17.81-112.54 46.61-46.61 68.59-46.61 112.54 17.81 83.74 46.61 112.54 68.59 46.61 112.54 46.61 83.74-17.81 112.54-46.61 46.61-68.59 46.61-112.54-17.81-83.74-46.61-112.54z" 
                  fill="url(#sealGradientMono)"
                  filter="url(#sealPulse)"
                />
              </g>
            </g>
          </svg>
        </motion.div>
        <h2 className="text-2xl font-bold tracking-wide text-[#b5c6e3]">
          Selo de Qualidade
        </h2>
      </div>

      {qualityData ? (
        /* ESTADO FINALIZADO - Selo de Qualidade */
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative p-8 bg-gradient-to-br ${qualityData.bgGradient} rounded-xl border-2 ${qualityData.borderColor}/40 overflow-hidden`}
          style={{ zIndex: 1 }}
        >
          {/* Efeito de brilho animado baseado no status */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-opacity-10 to-transparent animate-pulse"
            style={{
              backgroundColor: qualityData.glowColor === 'emerald' ? 'rgba(16, 185, 129, 0.1)' :
                             qualityData.glowColor === 'yellow' ? 'rgba(234, 179, 8, 0.1)' :
                             qualityData.glowColor === 'blue' ? 'rgba(59, 130, 246, 0.1)' :
                             qualityData.glowColor === 'orange' ? 'rgba(249, 115, 22, 0.1)' :
                             'rgba(239, 68, 68, 0.1)',
            }}
          ></div>
          
          {/* Camada de vidro/espelho na frente do card - efeito de quadro envidraçado */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(0.5px)',
              WebkitBackdropFilter: 'blur(0.5px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.1)',
              zIndex: 3
            }}
          />
          
          {/* Reflexo de luz no vidro (efeito de brilho) */}
          <motion.div 
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)',
              zIndex: 4
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
          
          <div className="relative flex flex-col items-center justify-center space-y-4" style={{ zIndex: 5 }}>
            {/* Container para SVG Customizado com Animação */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 15,
                delay: 0.2 
              }}
              whileHover={{ 
                scale: 1.1, 
                rotate: [0, -5, 5, -5, 0],
                transition: { duration: 0.5 }
              }}
              className="w-28 h-28 flex items-center justify-center mb-2 relative"
            >
              {/* Efeito de brilho pulsante ao redor do troféu */}
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.8, 0.3],
                  scale: [1, 1.15, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: qualityData.status === 'excelente' 
                    ? 'radial-gradient(circle, rgba(229,231,235,0.4) 0%, transparent 70%)'
                    : qualityData.status === 'bom'
                    ? 'radial-gradient(circle, rgba(252,211,77,0.4) 0%, transparent 70%)'
                    : qualityData.status === 'medio'
                    ? 'radial-gradient(circle, rgba(243,244,246,0.4) 0%, transparent 70%)'
                    : qualityData.status === 'ruim'
                    ? 'radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(127,29,29,0.4) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                  zIndex: 1
                }}
              />
              
              {/* SVG do Troféu com cores de metal */}
              <motion.div
                animate={{
                  filter: [
                    'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                    'drop-shadow(0 0 16px rgba(255,255,255,0.5))',
                    'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative"
              >
                <svg 
                  id="trophy-quality"
                  enableBackground="new 0 0 512 512" 
                  height="112" 
                  viewBox="0 0 512 512" 
                  width="112" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-2xl"
                >
                  <defs>
                    {/* Gradiente de metal para o troféu - PLATINA (Excelente) */}
                    {qualityData.status === 'excelente' && (
                      <linearGradient id={`metal-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E5E7EB" stopOpacity="1" />
                        <stop offset="30%" stopColor="#F3F4F6" stopOpacity="1" />
                        <stop offset="50%" stopColor="#9CA3AF" stopOpacity="1" />
                        <stop offset="70%" stopColor="#F3F4F6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#E5E7EB" stopOpacity="1" />
                        <animateTransform attributeName="gradientTransform" type="rotate" values="0 256 256;360 256 256" dur="4s" repeatCount="indefinite" />
                      </linearGradient>
                    )}
                    
                    {/* Gradiente de metal para o troféu - OURO (Bom) - COM EFEITO ESPELHO */}
                    {qualityData.status === 'bom' && (
                      <>
                        <linearGradient id={`metal-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FCD34D" stopOpacity="1" />
                          <stop offset="25%" stopColor="#FDE047" stopOpacity="1" />
                          <stop offset="50%" stopColor="#FBBF24" stopOpacity="1" />
                          <stop offset="75%" stopColor="#FDE047" stopOpacity="1" />
                          <stop offset="100%" stopColor="#FCD34D" stopOpacity="1" />
                          <animateTransform attributeName="gradientTransform" type="rotate" values="0 256 256;360 256 256" dur="4s" repeatCount="indefinite" />
                        </linearGradient>
                        {/* Gradiente de espelho/reflexo para efeito espelhado */}
                        <linearGradient id={`mirror-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                          <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.4" />
                          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.6" />
                          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                          <animateTransform attributeName="gradientTransform" type="translate" values="-50 0;50 0;-50 0" dur="2s" repeatCount="indefinite" />
                        </linearGradient>
                        {/* Filtro para efeito espelhado */}
                        <filter id={`mirror-filter-${qualityData.status}`}>
                          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                          <feOffset in="coloredBlur" dx="2" dy="2" result="offsetBlur"/>
                          <feSpecularLighting in="coloredBlur" surfaceScale="5" specularConstant="1.5" specularExponent="20" lightingColor="#FFFFFF" result="specOut">
                            <fePointLight x="256" y="100" z="200"/>
                          </feSpecularLighting>
                          <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                          <feMerge>
                            <feMergeNode in="specOut2"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </>
                    )}
                    
                    {/* Gradiente de metal para o troféu - PRATA (Médio) */}
                    {qualityData.status === 'medio' && (
                      <linearGradient id={`metal-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F3F4F6" stopOpacity="1" />
                        <stop offset="30%" stopColor="#E5E7EB" stopOpacity="1" />
                        <stop offset="50%" stopColor="#6B7280" stopOpacity="1" />
                        <stop offset="70%" stopColor="#E5E7EB" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F3F4F6" stopOpacity="1" />
                        <animateTransform attributeName="gradientTransform" type="rotate" values="0 256 256;360 256 256" dur="4s" repeatCount="indefinite" />
                      </linearGradient>
                    )}
                    
                    {/* Gradiente de metal para o troféu - BRONZE (Ruim) */}
                    {qualityData.status === 'ruim' && (
                      <linearGradient id={`metal-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F97316" stopOpacity="1" />
                        <stop offset="30%" stopColor="#FB923C" stopOpacity="1" />
                        <stop offset="50%" stopColor="#92400E" stopOpacity="1" />
                        <stop offset="70%" stopColor="#FB923C" stopOpacity="1" />
                        <stop offset="100%" stopColor="#F97316" stopOpacity="1" />
                        <animateTransform attributeName="gradientTransform" type="rotate" values="0 256 256;360 256 256" dur="4s" repeatCount="indefinite" />
                      </linearGradient>
                    )}
                    
                    {/* Gradiente de metal para o troféu - FERRO/PRETO (Reprovado) */}
                    {qualityData.status === 'reprovado' && (
                      <linearGradient id={`metal-gradient-${qualityData.status}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#991B1B" stopOpacity="1" />
                        <stop offset="30%" stopColor="#B91C1C" stopOpacity="1" />
                        <stop offset="50%" stopColor="#450A0A" stopOpacity="1" />
                        <stop offset="70%" stopColor="#B91C1C" stopOpacity="1" />
                        <stop offset="100%" stopColor="#991B1B" stopOpacity="1" />
                        <animateTransform attributeName="gradientTransform" type="rotate" values="0 256 256;360 256 256" dur="4s" repeatCount="indefinite" />
                      </linearGradient>
                    )}
                    
                    {/* Brilho animado */}
                    <filter id={`glow-${qualityData.status}`}>
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <g>
                    {/* Base do troféu */}
                    <g 
                      fill={`url(#metal-gradient-${qualityData.status})`} 
                      filter={qualityData.status === 'bom' ? `url(#mirror-filter-${qualityData.status})` : `url(#glow-${qualityData.status})`}
                    >
                      <path d="m478.98 381.834c.004-.007.008-.014.012-.021 21.594-38.176 33.008-81.68 33.008-125.813 0-7.223-.307-14.544-.914-21.76 0-.007-.001-.013-.001-.02-5.372-63.705-34.288-122.768-81.422-166.309-47.407-43.793-109.082-67.911-173.663-67.911s-126.256 24.118-173.663 67.912c-47.134 43.541-76.05 102.604-81.422 166.309 0 .006-.001.013-.001.019-.607 7.216-.914 14.537-.914 21.76 0 44.135 11.415 87.641 33.011 125.818.002.003.003.006.005.009.007.013.014.026.022.038.009.017.019.033.029.05.008.014.016.028.024.042 21.941 38.754 53.763 71.29 92.034 94.101 39.45 23.513 84.707 35.942 130.875 35.942s91.425-12.429 130.876-35.942c38.271-22.81 70.093-55.347 92.034-94.101.009-.015.017-.03.026-.046.009-.015.018-.031.027-.046.006-.01.012-.021.017-.031zm-412.497-156.773c14.929-92.57 94.53-161.061 189.517-161.061s174.588 68.491 189.517 161.061zm189.517-205.061c118 0 218.724 89.221 233.985 205.061h-24.239c-7.108-48.363-30.819-92.834-67.387-126.027-39.096-35.49-89.653-55.034-142.359-55.034s-103.263 19.544-142.358 55.033c-36.568 33.194-60.279 77.664-67.387 126.027h-24.24c15.261-115.839 115.985-205.06 233.985-205.06zm-235.749 225.064h471.499c.166 3.653.25 7.307.25 10.936 0 38.765-9.545 76.99-27.654 110.94l-163.14-.004c-5.522 0-10 4.478-10 10 0 5.523 4.477 10 10 10l95.134.002c-36.263 39.041-86.367 61.062-140.34 61.062s-104.077-22.021-140.34-61.062l95.134-.002c5.523 0 10-4.477 10-10s-4.477-10-10-10l-116.492.003c-.013 0-.026 0-.038 0l-46.61.001c-18.109-33.95-27.654-72.175-27.654-110.94 0-3.629.084-7.283.251-10.936zm235.749 246.936c-79.067 0-152.788-39.846-196.367-105.061l29.742-.001c18.933 24.025 43.135 43.974 70.271 57.875 30.034 15.386 62.452 23.187 96.354 23.187s66.32-7.801 96.353-23.186c27.136-13.902 51.338-33.85 70.271-57.875l29.742.001c-43.578 65.214-117.299 105.06-196.366 105.06z"/>
                      <path d="m247.87 371.38c-2.391 3.648-2.188 8.504.582 11.896 2.532 3.101 6.808 4.39 10.634 3.223 4.164-1.27 7.093-5.202 7.094-9.56.001-4.183-2.69-8.007-6.63-9.414-4.253-1.52-9.174.09-11.68 3.855z"/>
                      <path d="m200.624 340.094c1.172.446 2.374.658 3.558.658 4.029 0 7.828-2.454 9.347-6.443l2.176-5.714h16.057l2.145 5.685c1.95 5.167 7.72 7.779 12.887 5.825 5.168-1.949 7.775-7.719 5.826-12.886l-18.418-48.803c-.034-.093-.07-.185-.108-.275-1.723-4.186-5.759-6.89-10.285-6.89h-.012c-4.531.005-8.566 2.718-10.282 6.911-.03.075-.061.151-.089.227l-18.586 48.801c-1.967 5.161.623 10.939 5.784 12.904zm23.59-31.499h-.892l.448-1.177z"/>
                      <path d="m273.28 340.564c.717.123 1.111.19 6.805.19 2.7 0 6.591-.016 12.272-.047 5.523-.031 9.975-4.533 9.944-10.056-.031-5.504-4.502-9.944-9.999-9.944h-.057c-2.421.014-4.942.024-7.276.032v-39.488c0-5.523-4.478-10-10-10s-10 4.477-10 10v49.456c.001 4.871 3.51 9.033 8.311 9.857z"/>
                      <path d="m329.626 340.749c5.522 0 10-4.477 10-10v-49.498c0-5.523-4.478-10-10-10-5.523 0-10 4.477-10 10v49.498c0 5.523 4.477 10 10 10z"/>
                      <path d="m423.515 308.429-.054 22.296c-.014 5.522 4.453 10.011 9.976 10.024h.024c5.512 0 9.986-4.461 10-9.976l.054-22.329 14.069-21.612c3.013-4.629 1.703-10.823-2.925-13.837-4.629-3.015-10.823-1.702-13.837 2.925l-7.313 11.233-7.425-11.37c-3.018-4.624-9.214-5.928-13.84-2.906-4.625 3.02-5.926 9.216-2.906 13.84z"/>
                      <path d="m145.941 336.567c4.332 2.767 9.207 4.174 14.495 4.182h.037c4.519 0 8.774-.989 12.649-2.94 9.563-4.816 14.83-12.819 14.83-22.533v-34.024c0-5.523-4.477-10-10-10-5.522 0-10 4.477-10 10v34.024c0 1.093 0 2.744-3.825 4.671-1.073.54-2.268.803-3.651.803h-.013c-1.459-.002-2.652-.332-3.755-1.036-3.149-2.012-3.149-3.227-3.149-4.402v-34.059c0-5.523-4.478-10-10-10-5.523 0-10 4.477-10 10v34.059c.001 8.854 4.166 16.005 12.382 21.255z"/>
                      <path d="m365.31 291.251h3.612v39.498c0 5.523 4.478 10 10 10s10-4.477 10-10v-39.498h3.723c5.522 0 10-4.478 10-10 0-5.523-4.478-10-10-10h-27.335c-5.522 0-10 4.477-10 10 0 5.522 4.477 10 10 10z"/>
                      <path d="m87.546 340.749c6.052 0 11.748-1.556 16.709-4.288l1.159 1.159c1.953 1.952 4.512 2.929 7.071 2.929 2.56 0 5.118-.977 7.071-2.929 3.905-3.905 3.905-10.237 0-14.143l-1.276-1.276c2.562-4.84 4.013-10.354 4.013-16.202 0-19.161-15.588-34.749-34.748-34.749-19.161 0-34.749 15.588-34.749 34.749s15.589 34.75 34.75 34.75zm0-49.498c8.132 0 14.748 6.616 14.748 14.749 0 .151-.003.302-.007.452-3.894-2.662-9.25-2.266-12.708 1.19-3.564 3.564-3.875 9.148-.934 13.066-.363.027-.73.041-1.099.041-8.133 0-14.749-6.616-14.749-14.749s6.616-14.749 14.749-14.749z"/>
                    </g>
                    {/* Camada de reflexo espelhado para status 'bom' */}
                    {qualityData.status === 'bom' && (
                      <g opacity="0.6" fill={`url(#mirror-gradient-${qualityData.status})`}>
                        <path d="m478.98 381.834c.004-.007.008-.014.012-.021 21.594-38.176 33.008-81.68 33.008-125.813 0-7.223-.307-14.544-.914-21.76 0-.007-.001-.013-.001-.02-5.372-63.705-34.288-122.768-81.422-166.309-47.407-43.793-109.082-67.911-173.663-67.911s-126.256 24.118-173.663 67.912c-47.134 43.541-76.05 102.604-81.422 166.309 0 .006-.001.013-.001.019-.607 7.216-.914 14.537-.914 21.76 0 44.135 11.415 87.641 33.011 125.818.002.003.003.006.005.009.007.013.014.026.022.038.009.017.019.033.029.05.008.014.016.028.024.042 21.941 38.754 53.763 71.29 92.034 94.101 39.45 23.513 84.707 35.942 130.875 35.942s91.425-12.429 130.876-35.942c38.271-22.81 70.093-55.347 92.034-94.101.009-.015.017-.03.026-.046.009-.015.018-.031.027-.046.006-.01.012-.021.017-.031zm-412.497-156.773c14.929-92.57 94.53-161.061 189.517-161.061s174.588 68.491 189.517 161.061zm189.517-205.061c118 0 218.724 89.221 233.985 205.061h-24.239c-7.108-48.363-30.819-92.834-67.387-126.027-39.096-35.49-89.653-55.034-142.359-55.034s-103.263 19.544-142.358 55.033c-36.568 33.194-60.279 77.664-67.387 126.027h-24.24c15.261-115.839 115.985-205.06 233.985-205.06zm-235.749 225.064h471.499c.166 3.653.25 7.307.25 10.936 0 38.765-9.545 76.99-27.654 110.94l-163.14-.004c-5.522 0-10 4.478-10 10 0 5.523 4.477 10 10 10l95.134.002c-36.263 39.041-86.367 61.062-140.34 61.062s-104.077-22.021-140.34-61.062l95.134-.002c5.523 0 10-4.477 10-10s-4.477-10-10-10l-116.492.003c-.013 0-.026 0-.038 0l-46.61.001c-18.109-33.95-27.654-72.175-27.654-110.94 0-3.629.084-7.283.251-10.936zm235.749 246.936c-79.067 0-152.788-39.846-196.367-105.061l29.742-.001c18.933 24.025 43.135 43.974 70.271 57.875 30.034 15.386 62.452 23.187 96.354 23.187s66.32-7.801 96.353-23.186c27.136-13.902 51.338-33.85 70.271-57.875l29.742.001c-43.578 65.214-117.299 105.06-196.366 105.06z"/>
                      </g>
                    )}
                    
                    {/* Estrelas decorativas - animadas com SVG nativo */}
                    <g>
                      <g fill={`url(#metal-gradient-${qualityData.status})`} opacity="0.75">
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="0.9;1.1;0.9"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="0s"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;1;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="0s"
                        />
                        <path d="m297.013 118.013-20.821-5.672-11.816-18.11c-1.847-2.829-4.996-4.535-8.375-4.535s-6.528 1.706-8.375 4.535l-11.816 18.11-20.821 5.672c-3.252.886-5.839 3.351-6.882 6.556-1.042 3.205-.4 6.72 1.708 9.349l13.532 16.874-1.057 21.632c-.164 3.371 1.383 6.598 4.114 8.581 2.732 1.98 6.279 2.452 9.435 1.251l20.161-7.683 20.162 7.682c1.154.439 2.36.655 3.56.655 2.081 0 4.142-.65 5.875-1.906 2.731-1.983 4.278-5.21 4.114-8.581l-1.057-21.632 13.532-16.874c2.108-2.629 2.75-6.144 1.708-9.349s-3.629-5.67-6.881-6.555zm-26.333 23.223c-1.527 1.905-2.306 4.304-2.186 6.743l.495 10.14-9.428-3.592c-1.146-.436-2.353-.655-3.56-.655s-2.414.219-3.561.655l-9.428 3.592.495-10.14c.119-2.44-.659-4.838-2.187-6.743l-6.363-7.934 9.776-2.663c2.363-.644 4.408-2.133 5.747-4.184l5.52-8.46 5.52 8.46c1.339 2.051 3.384 3.54 5.747 4.184l9.776 2.663z"/>
                      </g>
                      
                      <g fill={`url(#metal-gradient-${qualityData.status})`} opacity="0.75">
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="0.9;1.1;0.9"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="0.5s"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;1;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="0.5s"
                        />
                        <path d="m387.521 141.765-14.497-3.948-8.229-12.611c-1.846-2.83-4.996-4.536-8.375-4.536s-6.529 1.706-8.375 4.536l-8.227 12.611-14.497 3.948c-3.252.886-5.839 3.35-6.882 6.555-1.042 3.205-.4 6.72 1.708 9.35l9.425 11.753-.736 15.067c-.164 3.372 1.383 6.599 4.114 8.581 2.732 1.982 6.278 2.453 9.435 1.252l14.036-5.348 14.037 5.348c1.154.439 2.36.655 3.56.655 2.081 0 4.143-.649 5.875-1.907 2.731-1.982 4.279-5.21 4.114-8.581l-.737-15.067 9.426-11.753c2.108-2.629 2.75-6.145 1.708-9.35-1.045-3.206-3.632-5.67-6.883-6.555zm-22.227 18.103c-1.527 1.905-2.306 4.305-2.187 6.744l.175 3.574-3.302-1.258c-2.295-.873-4.828-.873-7.121 0l-3.302 1.258.175-3.574c.119-2.439-.659-4.839-2.186-6.744l-2.256-2.813 3.452-.94c2.363-.644 4.409-2.133 5.747-4.185l1.931-2.96 1.932 2.96c1.339 2.052 3.384 3.541 5.747 4.185l3.452.94z"/>
                      </g>
                      
                      <g fill={`url(#metal-gradient-${qualityData.status})`} opacity="0.75">
                        <animateTransform
                          attributeName="transform"
                          type="scale"
                          values="0.9;1.1;0.9"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="1s"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.5;1;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                          begin="1s"
                        />
                        <path d="m186.68 141.765-14.497-3.948-8.228-12.611c-1.846-2.83-4.996-4.536-8.375-4.536s-6.529 1.706-8.375 4.536l-8.229 12.611-14.497 3.948c-3.252.886-5.839 3.35-6.882 6.555-1.042 3.205-.4 6.721 1.708 9.35l9.426 11.753-.737 15.067c-.165 3.371 1.383 6.599 4.114 8.581 1.733 1.258 3.794 1.907 5.875 1.907 1.199 0 2.405-.216 3.56-.655l14.037-5.348 14.036 5.348c3.158 1.202 6.703.731 9.435-1.252 2.731-1.982 4.278-5.209 4.114-8.581l-.736-15.067 9.425-11.753c2.108-2.63 2.75-6.145 1.708-9.35-1.043-3.206-3.63-5.67-6.882-6.555zm-22.226 18.103c-1.527 1.905-2.306 4.305-2.187 6.744l.175 3.574-3.302-1.258c-1.147-.436-2.354-.655-3.561-.655s-2.414.219-3.561.655l-3.302 1.258.175-3.574c.119-2.439-.659-4.839-2.186-6.744l-2.257-2.813 3.452-.94c2.363-.644 4.408-2.133 5.747-4.185l1.932-2.96 1.931 2.96c1.338 2.052 3.384 3.541 5.747 4.185l3.452.94z"/>
                      </g>
                    </g>
                  </g>
                </svg>
              </motion.div>
            </motion.div>

            {/* Rótulo do Status - Centralizado */}
            <div className="text-center space-y-4 mt-4">
              {/* Status Label - Fonte amigável e atraente */}
              <div 
                className="text-3xl mb-3 tracking-wide"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: qualityData.status === 'excelente' ? '#E5E7EB' :
                         qualityData.status === 'bom' ? '#FCD34D' :
                         qualityData.status === 'medio' ? '#E5E7EB' :
                         qualityData.status === 'ruim' ? '#FB923C' :
                         '#F87171',
                  textShadow: qualityData.status === 'excelente' ? '0 0 20px rgba(229,231,235,0.5)' :
                             qualityData.status === 'bom' ? '0 0 20px rgba(252,211,77,0.5)' :
                             qualityData.status === 'medio' ? '0 0 20px rgba(229,231,235,0.3)' :
                             qualityData.status === 'ruim' ? '0 0 20px rgba(251,146,60,0.5)' :
                             '0 0 20px rgba(248,113,113,0.5)',
                }}
              >
                {qualityData.label}
              </div>
              
              {/* Porcentagem exata - Fonte grande e amigável */}
              <div 
                className="text-5xl mb-4 tracking-tight tabular-nums"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  textShadow: '0 2px 10px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2)',
                }}
              >
                {qualityData.yield.toFixed(1)}%
              </div>
              
              {/* Detalhes - Centralizado com fonte amigável */}
              <div 
                className="text-sm space-y-1.5 mt-4"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 500,
                  color: '#B4C6E3',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="opacity-70">Inspecionadas:</span>
                  <span className="font-bold text-[#D1D9E8]">{qualityData.totalInspecionado}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="opacity-70">Falhas:</span>
                  <span 
                    className="font-bold"
                    style={{
                      color: qualityData.totalFalhas > 0 ? '#F87171' : '#86EFAC',
                    }}
                  >
                    {qualityData.totalFalhas}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ESTADO DE ESPERA */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative p-8 bg-gradient-to-br from-[#0f1a2b]/40 to-[#1a2535]/40 rounded-xl border border-[#314566]/50 overflow-hidden"
        >
          <div className="relative flex flex-col items-center justify-center space-y-4">
            {/* Ícone de Relógio Animado */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-16 h-16 flex items-center justify-center"
            >
              <Clock 
                className="w-12 h-12"
                style={{
                  color: '#9CA3AF',
                }}
              />
            </motion.div>

            {/* Texto de Aguardo - Centralizado com fonte amigável */}
            <div className="text-center space-y-2">
              <div 
                className="text-xl"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 700,
                  color: '#B4C6E3',
                }}
              >
                Aguardando finalização da OM...
              </div>
              <div 
                className="text-sm"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontWeight: 500,
                  color: '#7A8FA8',
                }}
              >
                O selo de qualidade será exibido assim que a OM for finalizada.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

