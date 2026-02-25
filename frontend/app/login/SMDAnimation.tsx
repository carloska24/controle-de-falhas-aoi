'use client';

import { useEffect, useRef } from 'react';

interface SMDComponent {
  type: string;
  classes: string; // String de classes separadas por espaço (join(' '))
  width: number;
  height: number;
  left: number;
  opacity: number;
  duration: number;
  delay: number;
  startRot: number;
  midRot?: number;
  endRot: number;
  drift?: number;
  zIndex: number;
}

export default function SMDAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    // Reduzido para deixar a página mais leve
    const numberOfComponents = vw < 480 ? 12 : vw < 1024 ? 18 : 24;

    // Tipos de componentes com distribuição
      const componentTypes = [
        'smd-resistor',
        'smd-resistor',
        'smd-resistor',
        'smd-resistor',
        'smd-resistor',
        'smd-capacitor',
        'smd-capacitor',
        'smd-capacitor',
        'smd-capacitor',
        'smd-capacitor',
        'smd-capacitor',
        'smd-diode',
        'smd-diode',
        'smd-ic', // raro
      ];

    const components: SMDComponent[] = [];

    // Gerar componentes com física realista
    for (let i = 0; i < numberOfComponents; i++) {
      const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
      const classes = ['smd-component', randomType];

      // Variações de cor realistas baseadas em componentes SMD reais
      const colorVariants: { [key: string]: string[] } = {
        'smd-resistor': ['beige', 'dark'], // Bege claro ou preto escuro
        'smd-capacitor': ['brown', 'blue', 'tan'], // Marrom, azul ou bege
        'smd-diode': ['black'], // Sempre preto
        'smd-ic': ['black', 'gray'], // Preto ou cinza
      };

      const variants = colorVariants[randomType] || ['default'];
      const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
      if (selectedVariant !== 'default') {
        classes.push(selectedVariant);
      }

      // Tamanhos realistas baseados em pacotes SMD padrão (em proporção)
      // Proporções baseadas em pacotes reais: 0402, 0603, 0805, 1206
      let sizeW: number, sizeH: number;
      if (randomType === 'smd-ic') {
        // ICs: QFP/QFN - formato quadrado
        const icSizes = [
          { w: 18, h: 18 }, // QFN pequeno (mais comum)
          { w: 22, h: 22 }, // QFP médio
          { w: 26, h: 26 }, // QFP grande
        ];
        const icSize = icSizes[Math.floor(Math.random() * icSizes.length)];
        sizeW = icSize.w;
        sizeH = icSize.h;
      } else if (randomType === 'smd-diode') {
        // Diodos: formato retangular alongado (proporção 2.5:1 típica)
        // Tamanhos: SOD-123, SOD-323, etc.
        const diodeSizes = [
          { w: 11, h: 4.4 },  // Pequeno (SOD-323)
          { w: 13, h: 5.2 },  // Médio (SOD-123)
          { w: 15, h: 6 },    // Grande
        ];
        const diodeSize = diodeSizes[Math.floor(Math.random() * diodeSizes.length)];
        sizeW = diodeSize.w;
        sizeH = diodeSize.h;
      } else if (randomType === 'smd-resistor') {
        // Resistores: formato retangular padrão (proporção 2:1)
        // Pacotes: 0402 (1.0x0.5mm), 0603 (1.6x0.8mm), 0805 (2.0x1.25mm), 1206 (3.2x1.6mm)
        const resistorSizes = [
          { w: 12, h: 6 },  // 1206 (mais visível)
          { w: 10, h: 5 },  // 0805
          { w: 8, h: 4 },   // 0603
          { w: 6, h: 3 },   // 0402 (menor, menos comum na animação)
        ];
        const resSize = resistorSizes[Math.floor(Math.random() * resistorSizes.length)];
        sizeW = resSize.w;
        sizeH = resSize.h;
      } else if (randomType === 'smd-capacitor') {
        // Capacitores: formato similar aos resistores (proporção 2:1)
        // Podem ser um pouco mais altos que resistores
        const capSizes = [
          { w: 12, h: 6.5 },  // 1206 (ligeiramente mais alto)
          { w: 10, h: 5.5 },  // 0805
          { w: 8, h: 4.5 },   // 0603
        ];
        const capSize = capSizes[Math.floor(Math.random() * capSizes.length)];
        sizeW = capSize.w;
        sizeH = capSize.h;
      } else {
        // Fallback: formato genérico retangular
        sizeW = Math.random() * 6 + 8;
        sizeH = sizeW * 0.5;
      }
      
      // Garantir que componentes não sejam muito pequenos para visualização
      sizeW = Math.max(sizeW, 5);
      sizeH = Math.max(sizeH, 2.5);

      // Física realista: componentes maiores (mais massa) caem mais rápido
      // Velocidade terminal proporcional à raiz quadrada da área (massa)
      const area = sizeW * sizeH;
      const baseDuration = 12; // Duração base aumentada para queda mais suave
      const massFactor = Math.sqrt(area / 60); // Fator de massa ajustado
      const duration = baseDuration + (massFactor * 2); // 12-16 segundos (mais variado)
      
      // Delay negativo controlado para começar em posições aleatórias na tela
      // Limitar delay negativo para evitar componentes começando muito "no meio" da animação
      // Máximo de 30% da duração para garantir movimento fluido desde o início
      const maxDelay = duration * 0.3;
      const delay = -(Math.random() * maxDelay);
      
      // Rotação física realista: componentes menores rotacionam mais (mais instabilidade)
      // Componentes retangulares (resistores/diodos) rotacionam mais que quadrados (ICs)
      const isRectangular = sizeW / sizeH > 1.5;
      const rotationMultiplier = isRectangular ? 1.3 : 1.0; // Retangulares rotacionam mais
      const rotationFactor = (1 / Math.max(sizeW, sizeH)) * rotationMultiplier;
      const maxRotation = 360 + (rotationFactor * 540); // 360-900 graus (mais realista)
      const startRot = Math.random() * 360;
      // Garantir rotação progressiva e suave
      const rotationDirection = Math.random() > 0.5 ? 1 : -1; // Direção aleatória
      const totalRotation = rotationDirection * (360 + Math.random() * 540);
      const midRot = startRot + (totalRotation * 0.5) + (Math.random() * 60 - 30); // Rotação no meio
      const endRot = startRot + totalRotation; // Rotação final progressiva
      
      // Turbulência/deriva horizontal (efeito de ar - mais sutil)
      // Componentes menores têm mais deriva (mais afetados pelo ar)
      const driftFactor = 1 / Math.max(sizeW, sizeH);
      const drift = (Math.random() - 0.5) * 25 * driftFactor; // -12.5px a +12.5px (ajustado)

      // Opacidade baseada no tamanho e tipo
      // Componentes maiores e mais claros são mais visíveis
      let opacityBase = 0.65; // Base aumentada para melhor visibilidade
      if (randomType === 'smd-ic') {
        opacityBase = 0.55; // ICs são um pouco mais discretos
      }
      const opacityVariation = 0.15; // Variação reduzida
      let opacity = Math.min(opacityBase + (opacityVariation * (sizeW / 25)), 0.8);
      
      // Ajuste especial para resistores bege (mais claros, mais visíveis)
      const classesStr = classes.join(' ');
      if (randomType === 'smd-resistor' && classesStr.includes('beige')) {
        opacity = Math.min(opacity + 0.05, 0.85); // Aumentar um pouco mais
      }

      // Z-index para profundidade (componentes maiores na frente)
      const zIndex = Math.floor((sizeW / 30) * 10);

      components.push({
        type: randomType,
        classes: classes.join(' '),
        width: sizeW,
        height: sizeH,
        left: Math.random() * 100,
        opacity: Math.min(opacity, 0.9), // Limitar a 0.9
        duration,
        delay,
        startRot,
        midRot,
        endRot,
        drift,
        zIndex,
      });
    }

    // Criar elementos DOM
    const fragment = document.createDocumentFragment();
    components.forEach((comp) => {
      const element = document.createElement('div');
      element.className = comp.classes;
      
      // Aplicar estilos inline diretamente com física realista
      // Usar cubic-bezier para simular física de gravidade
      element.style.cssText = `
        position: absolute !important;
        top: -50px !important;
        width: ${comp.width}px !important;
        height: ${comp.height}px !important;
        left: ${comp.left}% !important;
        opacity: ${comp.opacity} !important;
        z-index: ${comp.zIndex} !important;
        border-radius: 2px !important;
        will-change: transform !important;
        pointer-events: none !important;
        animation: smd-fall ${comp.duration}s linear infinite ${comp.delay}s !important;
        --start-rot: ${comp.startRot}deg;
        --mid-rot: ${comp.midRot !== undefined ? comp.midRot : comp.startRot + 180}deg;
        --end-rot: ${comp.endRot}deg;
        --drift: ${comp.drift || 0}px;
        --opacity-start: ${comp.opacity};
        transform-origin: center center !important;
      `;
      
      // Cores realistas de componentes SMD reais
      let bgColor: string;
      const classesStr = comp.classes; // classes já é uma string (join(' '))
      
      if (comp.type === 'smd-resistor') {
        bgColor = classesStr.includes('beige') 
          ? '#f0e6d6' // Bege claro (resistor cerâmico)
          : '#2a2a2a'; // Preto escuro (resistor filme)
      } else if (comp.type === 'smd-capacitor') {
        if (classesStr.includes('blue')) {
          bgColor = '#2563eb'; // Azul vibrante (tantalum/capacitor eletrolítico)
        } else if (classesStr.includes('tan')) {
          bgColor = '#d4a574'; // Bege bronzeado (cerâmico)
        } else {
          bgColor = '#8b4513'; // Marrom (cerâmico padrão)
        }
      } else if (comp.type === 'smd-diode') {
        bgColor = '#1a1a1a'; // Preto profundo
      } else if (comp.type === 'smd-ic') {
        bgColor = classesStr.includes('gray') 
          ? '#374151' // Cinza escuro
          : '#111827'; // Preto quase sólido
      } else {
        bgColor = '#2a2a2a'; // Fallback
      }
      
      element.style.backgroundColor = bgColor;
      
      fragment.appendChild(element);
    });

    container.appendChild(fragment);

    // Cleanup
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -10,
        pointerEvents: 'none',
        overflow: 'hidden', // Garantir que componentes não saiam dos limites
        isolation: 'isolate', // Criar novo contexto de empilhamento para melhor performance
      }}
      aria-hidden="true"
    />
  );
}

