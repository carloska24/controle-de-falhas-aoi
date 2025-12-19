'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface DemoBadgeProps {
  className?: string;
}

export default function DemoBadge({ className = '' }: DemoBadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`ml-3 inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 text-yellow-400 px-3 py-1.5 rounded-full border border-yellow-500/40 shadow-lg shadow-yellow-500/20 ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      <span>Demo Mode</span>
    </motion.span>
  );
}

