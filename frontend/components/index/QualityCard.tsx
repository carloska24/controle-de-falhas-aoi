'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, Calculator } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { Registro } from '@/types/index';

interface QualityCardProps {
  registros: Registro[];
  selectedIds: string[];
}

export default function QualityCard({ registros, selectedIds }: QualityCardProps) {
  const [totalInspec, setTotalInspec] = useState('');
  const [escopo, setEscopo] = useState<'visiveis' | 'selecionados'>('visiveis');
  const [quality, setQuality] = useState<{
    yield: number;
    status: 'aprovado' | 'atencao' | 'reprovado' | 'indefinido';
    totalFalhas: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateQuality = () => {
    const totalInspecionado = Number(totalInspec);
    if (!totalInspecionado || totalInspecionado <= 0) {
      setQuality(null);
      return;
    }

    const rowsForScope =
      escopo === 'selecionados'
        ? registros.filter((r) => selectedIds.includes(r.id))
        : registros;

    const totalFalhas = rowsForScope.length;
    const badPct = Math.min(100, Math.max(0, (totalFalhas / totalInspecionado) * 100));
    const yieldPct = 100 - badPct;

    let status: 'aprovado' | 'atencao' | 'reprovado';
    if (yieldPct >= 98) {
      status = 'aprovado';
    } else if (yieldPct >= 90) {
      status = 'atencao';
    } else {
      status = 'reprovado';
    }

    setQuality({ yield: yieldPct, status, totalFalhas });
    drawPieChart(yieldPct, badPct);
  };

  useEffect(() => {
    if (quality) {
      drawPieChart(quality.yield, 100 - quality.yield);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [quality]);

  const drawPieChart = (goodPct: number, badPct: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 90;
    const startAngle = -Math.PI / 2;

    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha o gráfico de pizza
    const goodAngle = (goodPct / 100) * 2 * Math.PI;
    const badAngle = (badPct / 100) * 2 * Math.PI;

    // Parte boa (verde)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + goodAngle);
    ctx.closePath();
    ctx.fillStyle = quality?.status === 'aprovado' ? '#22c55e' : quality?.status === 'atencao' ? '#f59e0b' : '#ef4444';
    ctx.fill();

    // Parte ruim (vermelho)
    if (badPct > 0) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle + goodAngle, startAngle + goodAngle + badAngle);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    }

    // Borda
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const getStatusConfig = () => {
    if (!quality) return { emoji: '😐', text: 'Qualidade Indefinida', color: 'text-slate-400' };
    
    switch (quality.status) {
      case 'aprovado':
        return { emoji: '✅', text: 'Aprovado', color: 'text-green-400' };
      case 'atencao':
        return { emoji: '⚠️', text: 'Atenção', color: 'text-amber-400' };
      case 'reprovado':
        return { emoji: '❌', text: 'Reprovado', color: 'text-red-400' };
      default:
        return { emoji: '😐', text: 'Indefinida', color: 'text-slate-400' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl p-6"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <HeartPulse className="w-6 h-6 text-red-400" />
        <span>Qualidade do Lote</span>
      </h3>

      <div className="space-y-6">
        {/* Gráfico */}
        <div className="flex justify-center relative">
          <canvas
            ref={canvasRef}
            width="220"
            height="220"
            className="drop-shadow-xl"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {quality ? `${quality.yield.toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Yield</div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          <div className={`text-2xl mb-1 ${statusConfig.color} font-bold`}>
            {statusConfig.emoji} {statusConfig.text}
          </div>
          {quality && (
            <div className="text-sm text-slate-400 mt-2">
              {quality.totalFalhas} falhas de {totalInspec} inspecionados
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="space-y-4">
          <Input
            label="Total Inspecionado *"
            type="number"
            min="0"
            value={totalInspec}
            onChange={(e) => setTotalInspec(e.target.value)}
            placeholder="Ex: 100"
          />

          <Select
            label="Escopo"
            value={escopo}
            onChange={(e) => setEscopo(e.target.value as 'visiveis' | 'selecionados')}
            options={[
              { value: 'visiveis', label: 'Visíveis na Tabela' },
              { value: 'selecionados', label: 'Apenas Selecionados' },
            ]}
          />

          <Button
            onClick={calculateQuality}
            disabled={!totalInspec || Number(totalInspec) <= 0}
            className="w-full"
          >
            <Calculator className="w-4 h-4" />
            Calcular Qualidade
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

