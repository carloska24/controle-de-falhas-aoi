'use client';

import { useState, useCallback, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Package, Settings, TrendingUp, BarChart3, Sparkles, Wrench, Zap, Power, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProQuickLinksProps {
  isAdmin: boolean;
}

const links = [
  { 
    icon: Package, 
    label: 'Gestão de Estoque',
    href: '/almoxarifado', 
    color: 'from-blue-500 via-blue-600 to-indigo-600', 
    glowColor: 'rgba(59, 130, 246, 0.3)',
    baseHref: '/almoxarifado', 
    supportsDemo: true 
  },
  { 
    icon: Settings, 
    label: 'Centro de Reparos',
    href: '/reparo', 
    color: 'from-orange-500 via-orange-600 to-amber-600', 
    glowColor: 'rgba(249, 115, 22, 0.3)',
    baseHref: '/reparo', 
    supportsDemo: true 
  },
  { 
    icon: TrendingUp, 
    label: 'Dashboard de Qualidade',
    href: '/qualidade', 
    color: 'from-emerald-500 via-teal-600 to-cyan-600', 
    glowColor: 'rgba(16, 185, 129, 0.3)',
    baseHref: '/qualidade', 
    supportsDemo: true 
  },
];

const reports = [
  { 
    icon: BarChart3, 
    label: 'Auditoria de Falhas',
    href: '/relatorios/controle-falhas',
    baseHref: '/relatorios/controle-falhas',
    color: 'from-sky-500 via-cyan-600 to-blue-600', 
    glowColor: 'rgba(14, 165, 233, 0.3)',
    supportsDemo: true
  },
  { 
    icon: Sparkles, 
    label: 'Analytics de Qualidade',
    href: '/relatorios/qualidade',
    baseHref: '/relatorios/qualidade',
    color: 'from-purple-500 via-violet-600 to-fuchsia-600', 
    glowColor: 'rgba(168, 85, 247, 0.3)',
    supportsDemo: true
  },
  { 
    icon: Wrench, 
    label: 'Histórico de Manutenções',
    href: '/relatorios/reparo',
    baseHref: '/relatorios/reparo',
    color: 'from-rose-500 via-pink-600 to-rose-600', 
    glowColor: 'rgba(244, 63, 94, 0.3)',
    supportsDemo: true
  },
];

export default function ProQuickLinks({ isAdmin }: ProQuickLinksProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [demoModes, setDemoModes] = useState<Record<string, boolean>>({
    '/almoxarifado': false,
    '/reparo': false,
    '/qualidade': false,
    '/relatorios/controle-falhas': false,
    '/relatorios/qualidade': false,
    '/relatorios/reparo': false,
  });

  const toggleDemo = useCallback((href: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDemoModes(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  }, []);

  const getReportHref = useCallback((baseHref: string) => {
    return demoModes[baseHref] ? `${baseHref}?demo=true` : baseHref;
  }, [demoModes]);

  const handleCardClick = useCallback((baseHref: string) => {
    const href = getReportHref(baseHref);
    // Usar startTransition para tornar a navegação não bloqueante
    startTransition(() => {
      router.push(href);
    });
  }, [router, getReportHref, startTransition]);

  const handleCardHover = useCallback((baseHref: string) => {
    // Pré-carregar a página ao passar o mouse para navegação mais rápida
    const href = demoModes[baseHref] ? `${baseHref}?demo=true` : baseHref;
    router.prefetch(href);
  }, [router, demoModes]);

  return (
    <>
      {/* Acessos Rápidos */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-purple-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Glow Effect */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-3 mb-8 tracking-tight">
            <div className="relative p-3 bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 rounded-xl shadow-lg shadow-purple-500/30 shrink-0">
              <Zap className="w-6 h-6 text-white" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
            </div>
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent whitespace-nowrap">
              Acessos Rápidos
            </span>
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {links.map((link, index) => {
              const Icon = link.icon;
              const isDemoActive = demoModes[link.baseHref];
              const href = getReportHref(link.baseHref);
              
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  <div 
                    onClick={() => handleCardClick(link.baseHref)}
                    onMouseEnter={() => handleCardHover(link.baseHref)}
                    className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm hover:border-purple-500/60 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer active:scale-[0.98]"
                  >
                    {/* Gradient Background on Hover */}
                    <div 
                      className={`absolute inset-0 bg-gradient-to-r ${link.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    ></div>
                    
                    {/* Glow Effect */}
                    <div 
                      className="absolute -inset-1 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
                      style={{ backgroundColor: link.glowColor }}
                    ></div>
                    
                    <div className="relative p-4 overflow-visible">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-start gap-3 min-w-0">
                          {/* Icon Container */}
                          <div className={`relative p-3 rounded-xl bg-gradient-to-br ${link.color} shadow-lg shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0`}>
                            <Icon className="w-5 h-5 text-white relative z-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-2 flex items-center">
                            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors break-words">
                              {link.label}
                            </h3>
                          </div>

                          {/* Arrow Icon */}
                          <div className="flex items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 shrink-0">
                            <ArrowRight className="w-5 h-5 text-purple-400" />
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => toggleDemo(link.baseHref, e)}
                          className={`relative flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-300 shrink-0 ${
                            isDemoActive
                              ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 shadow-lg shadow-yellow-500/40 text-white'
                              : 'bg-slate-700/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-600/50'
                          }`}
                          title={isDemoActive ? 'Desativar Demo' : 'Ativar Demo'}
                        >
                          <Power className={`w-3.5 h-3.5 ${isDemoActive ? 'animate-pulse' : ''} shrink-0`} />
                          <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">
                            DEMO
                          </span>
                          {isDemoActive && (
                            <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse"></div>
                          )}
                        </button>
                      </div>
                      
                      {isDemoActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="p-3 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl backdrop-blur-sm"
                        >
                          <p className="text-xs text-yellow-400/90 flex items-center gap-2 font-semibold">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            Modo Demonstração Ativo
                          </p>
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Relatórios */}
      {isAdmin && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-purple-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl overflow-hidden mt-6"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* Glow Effect */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

          <div className="relative">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-3 mb-8 tracking-tight">
              <div className="relative p-3 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-500/30 shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
              </div>
              <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent whitespace-nowrap">
                Relatórios Executivos
              </span>
            </h2>
            
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
                    transition={{ delay: (index + links.length) * 0.1 }}
                    className="group relative"
                  >
                    <div 
                      onClick={() => handleCardClick(report.baseHref)}
                      onMouseEnter={() => handleCardHover(report.baseHref)}
                      className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm hover:border-purple-500/60 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 cursor-pointer active:scale-[0.98]"
                    >
                      {/* Gradient Background on Hover */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-r ${report.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                      ></div>
                      
                      {/* Glow Effect */}
                      <div 
                        className="absolute -inset-1 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
                        style={{ backgroundColor: report.glowColor }}
                      ></div>
                      
                      <div className="relative p-4 overflow-visible">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-start gap-3 min-w-0">
                            {/* Icon Container */}
                            <div className={`relative p-3 rounded-xl bg-gradient-to-br ${report.color} shadow-lg shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0`}>
                              <Icon className="w-5 h-5 text-white relative z-10" />
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 pr-2 flex items-center">
                              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors break-words">
                                {report.label}
                              </h3>
                            </div>

                            {/* Arrow Icon */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 shrink-0">
                              <ArrowRight className="w-5 h-5 text-purple-400" />
                            </div>
                          </div>
                          
                          {report.supportsDemo && (
                            <button
                              onClick={(e) => toggleDemo(report.baseHref, e)}
                              className={`relative flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-300 shrink-0 ${
                                isDemoActive
                                  ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 shadow-lg shadow-yellow-500/40 text-white'
                                  : 'bg-slate-700/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-600/50'
                              }`}
                              title={isDemoActive ? 'Desativar Demo' : 'Ativar Demo'}
                            >
                              <Power className={`w-3.5 h-3.5 ${isDemoActive ? 'animate-pulse' : ''} shrink-0`} />
                              <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">
                                DEMO
                              </span>
                              {isDemoActive && (
                                <div className="absolute inset-0 rounded-lg bg-white/20 animate-pulse"></div>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {isDemoActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="p-3 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl backdrop-blur-sm"
                          >
                            <p className="text-xs text-yellow-400/90 flex items-center gap-2 font-semibold">
                              <Zap className="w-3.5 h-3.5 animate-pulse" />
                              Modo Demonstração Ativo
                            </p>
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}
    </>
  );
}
