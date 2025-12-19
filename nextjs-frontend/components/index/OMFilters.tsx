'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { OM } from '@/types/index';

interface OMFiltersProps {
  pausedOMs: OM[];
  finishedOMs: OM[];
  onSelectPaused: (omNumber: string | null) => void;
  onSelectFinished: (omNumber: string | null) => void;
  activeOM: string | null;
}

export default function OMFilters({
  pausedOMs,
  finishedOMs,
  onSelectPaused,
  onSelectFinished,
  activeOM,
}: OMFiltersProps) {
  const [selectedPaused, setSelectedPaused] = useState<string>('');
  const [selectedFinished, setSelectedFinished] = useState<string>('');

  const pausedOptions = [
    { value: '', label: 'Filtrar OM Pausada' },
    ...(Array.isArray(pausedOMs) ? pausedOMs.map((om) => ({
      value: om.omNumber,
      label: `${om.omNumber} (${om.qtdlote || '?'} placas)`,
    })) : []),
  ];

  const finishedOptions = [
    { value: '', label: 'Filtrar OM Finalizada' },
    ...(Array.isArray(finishedOMs) ? finishedOMs.map((om) => ({
      value: om.omNumber,
      label: `${om.omNumber} (${om.qtdlote || '?'} placas)`,
    })) : []),
  ];

  useEffect(() => {
    // Limpa seleções quando a OM ativa muda
    if (activeOM && (selectedPaused || selectedFinished)) {
      if (selectedPaused === activeOM) setSelectedPaused('');
      if (selectedFinished === activeOM) setSelectedFinished('');
    }
  }, [activeOM]);

  const handlePausedChange = (value: string) => {
    setSelectedPaused(value);
    setSelectedFinished(''); // Limpa o outro
    onSelectPaused(value || null);
  };

  const handleFinishedChange = (value: string) => {
    setSelectedFinished(value);
    setSelectedPaused(''); // Limpa o outro
    onSelectFinished(value || null);
  };

  const clearAll = () => {
    setSelectedPaused('');
    setSelectedFinished('');
    onSelectPaused(null);
    onSelectFinished(null);
  };

  if ((!Array.isArray(pausedOMs) || pausedOMs.length === 0) && (!Array.isArray(finishedOMs) || finishedOMs.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700"
    >
      <Filter className="w-5 h-5 text-slate-400" />
      
      {Array.isArray(pausedOMs) && pausedOMs.length > 0 && (
        <div className="flex-1 max-w-xs">
          <Select
            value={selectedPaused}
            onChange={(e) => handlePausedChange(e.target.value)}
            options={pausedOptions}
            className="text-sm"
          />
        </div>
      )}

      {Array.isArray(finishedOMs) && finishedOMs.length > 0 && (
        <div className="flex-1 max-w-xs">
          <Select
            value={selectedFinished}
            onChange={(e) => handleFinishedChange(e.target.value)}
            options={finishedOptions}
            className="text-sm"
          />
        </div>
      )}

      {(selectedPaused || selectedFinished) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="flex-shrink-0"
        >
          <X className="w-4 h-4" />
          Limpar
        </Button>
      )}
    </motion.div>
  );
}

