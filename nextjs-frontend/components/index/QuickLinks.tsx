'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Archive, Wrench, BarChart2, FileText, Activity, Zap, Power } from 'lucide-react';
import Link from 'next/link';

interface QuickLinksProps {
  isAdmin: boolean;
}

const links = [
  { icon: Archive, label: 'Almoxarifado', href: '/almoxarifado', color: 'from-blue-500 to-blue-600' },
  { icon: Wrench, label: 'Tela de Reparo', href: '/reparo', color: 'from-orange-500 to-orange-600' },
];

const reports = [
  { 
    icon: FileText, 
    label: 'Controle de Falhas', 
    href: '/relatorios/controle-falhas',
    baseHref: '/relatorios/controle-falhas',
    color: 'from-sky-500 to-cyan-600',
    supportsDemo: true
  },
  { 
    icon: Activity, 
    label: 'Análise de Qualidade', 
    href: '/relatorios/qualidade',
    baseHref: '/relatorios/qualidade',
    color: 'from-emerald-500 to-teal-600',
    supportsDemo: true
  },
  { 
    icon: Wrench, 
    label: 'Relatório de Reparo', 
    href: '/relatorios/reparo',
    baseHref: '/relatorios/reparo',
    color: 'from-rose-500 to-pink-600',
    supportsDemo: true
  },
];

export default function QuickLinks({ isAdmin }: QuickLinksProps) {
  const [demoModes, setDemoModes] = useState<Record<string, boolean>>({
    '/relatorios/controle-falhas': false,
    '/relatorios/qualidade': false,
    '/relatorios/reparo': false,
  });

  const toggleDemo = (href: string) => {
    setDemoModes(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const getReportHref = (baseHref: string) => {
    return demoModes[baseHref] ? `${baseHref}?demo=true` : baseHref;
  };

  return (
    <div className="space-y-6">
      {/* Acessos Rápidos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-purple-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-sm"
      >
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span>Acessos Rápidos</span>
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {links.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={link.href}
                  className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${link.color} hover:scale-[1.02] transition-all duration-300 border border-white/10 shadow-lg hover:shadow-xl`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <div className="relative z-10 bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="relative z-10 text-sm font-semibold text-white">{link.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Relatórios (Admin Only) */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border border-purple-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-sm"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <span>Relatórios</span>
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report, index) => {
              const Icon = report.icon;
              const isDemoActive = demoModes[report.baseHref];
              const href = getReportHref(report.baseHref);
              
              return (
                <motion.div
                  key={report.baseHref}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 shadow-lg hover:shadow-2xl"
                >
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${report.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <div className="relative p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        href={href}
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${report.color} shadow-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white">{report.label}</span>
                      </Link>
                      
                      {report.supportsDemo && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleDemo(report.baseHref);
                          }}
                          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                            isDemoActive
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
                              : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                          title={isDemoActive ? 'Desativar Demo' : 'Ativar Demo'}
                        >
                          <Power className={`w-3.5 h-3.5 ${isDemoActive ? 'text-white' : 'text-slate-400'}`} />
                          <span className={`text-xs font-medium ${isDemoActive ? 'text-white' : 'text-slate-400'}`}>
                            DEMO
                          </span>
                          <div className={`absolute inset-0 rounded-lg bg-white/20 ${isDemoActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}></div>
                        </button>
                      )}
                    </div>
                    
                    {isDemoActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                      >
                        <p className="text-xs text-yellow-400 flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          Modo Demo ativado
                        </p>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
