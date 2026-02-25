'use client';

import { motion } from 'framer-motion';
import { FileText, Boxes, TrendingUp } from 'lucide-react';

interface MetricsCardProps {
  total: number;
  oms: number;
  distrib: string;
}

export default function MetricsCard({ total, oms, distrib }: MetricsCardProps) {
  const metrics = [
    {
      icon: FileText,
      label: 'Registros',
      value: total,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Boxes,
      label: 'OMs Distintas',
      value: oms,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Top 3 Defeitos',
      value: distrib || '—',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      isString: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl p-6"
    >
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-sky-400">📊</span>
        Métricas
      </h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div>
                  <div className="text-sm text-slate-400">{metric.label}</div>
                  <div className={`text-2xl font-bold ${metric.color} mt-1`}>
                    {metric.isString ? (
                      <span className="text-sm font-normal text-slate-300">{metric.value}</span>
                    ) : (
                      metric.value.toLocaleString()
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

