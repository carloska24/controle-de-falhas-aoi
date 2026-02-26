'use client';

import { motion } from 'framer-motion';
import { Metrics } from '@/types/index';
import { Database, FileText, AlertTriangle } from 'lucide-react';

interface ProMetricsProps extends Metrics {}

// Função para parsear a string de distribuição
function parseDistribution(distrib: string): Array<{ name: string; count: number }> {
  if (!distrib || distrib === '—') return [];

  // Formato: "Deslocado (3), Solder Ball (3), Solda Fria (2)"
  return distrib
    .split(', ')
    .map(item => {
      const match = item.match(/^(.+?)\s*\((\d+)\)$/);
      if (match) {
        return {
          name: match[1].trim(),
          count: parseInt(match[2], 10),
        };
      }
      return null;
    })
    .filter((item): item is { name: string; count: number } => item !== null);
}

export default function ProMetrics({ total, oms, distrib }: ProMetricsProps) {
  const distributionData = parseDistribution(distrib);
  const maxCount =
    distributionData.length > 0 ? Math.max(...distributionData.map(d => d.count)) : 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-card rounded-2xl p-4 md:p-5 shadow-[0_0_32px_rgba(31,45,61,0.45)] backdrop-blur-sm"
    >
      {/* Header com ícone animado */}
      <h2 className="text-lg md:text-xl font-black tracking-wide text-[#b5c6e3] flex items-center gap-3 mb-4">
        <svg
          id="fi_6159352"
          enableBackground="new 0 0 512 512"
          width="34"
          height="34"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          <g>
            <path
              d="m116.764 325.028h-52.861c-.652 0-1.18-.529-1.18-1.18v-190.918c0-.652.528-1.18 1.18-1.18h52.861c.652 0 1.18.529 1.18 1.18v190.917c0 .652-.528 1.181-1.18 1.181z"
              fill="#fe646f"
            ></path>
            <path
              d="m199.597 325.028h-52.861c-.652 0-1.18-.529-1.18-1.18v-219.709c0-.652.529-1.18 1.18-1.18h52.861c.652 0 1.18.528 1.18 1.18v219.709c.001.651-.528 1.18-1.18 1.18z"
              fill="#f68157"
            ></path>
            <path
              d="m282.431 325.028h-52.861c-.652 0-1.18-.529-1.18-1.18v-259.945c0-.652.529-1.18 1.18-1.18h52.861c.652 0 1.18.528 1.18 1.18v259.945c0 .651-.528 1.18-1.18 1.18z"
              fill="#fdb441"
            ></path>
            <path
              d="m365.264 325.028h-52.861c-.652 0-1.18-.529-1.18-1.18v-233.515c0-.652.529-1.18 1.18-1.18h52.861c.652 0 1.18.528 1.18 1.18v233.514c.001.652-.528 1.181-1.18 1.181z"
              fill="#8ac9fe"
            ></path>
            <path
              d="m448.098 325.028h-52.861c-.652 0-1.18-.529-1.18-1.18v-287.557c0-.652.528-1.18 1.18-1.18h52.861c.652 0 1.18.528 1.18 1.18v287.556c0 .652-.528 1.181-1.18 1.181z"
              fill="#6fd7a3"
            ></path>
            <path
              d="m504.5 407.861c0-66.377-25.848-128.781-72.784-175.716-46.935-46.936-109.339-72.784-175.716-72.784s-128.781 25.848-175.716 72.784c-46.936 46.936-72.784 109.34-72.784 175.716v26.319c0 .713.578 1.292 1.292 1.292h183.115c.505 0 .959.298 1.167.758 10.841 23.953 34.97 40.658 62.926 40.658s52.085-16.706 62.926-40.658c.208-.46.662-.758 1.167-.758h183.115c.713 0 1.292-.578 1.292-1.292z"
              fill="#685e68"
            ></path>
            <path
              d="m35.111 407.861c0-121.994 98.895-220.889 220.889-220.889s220.889 98.895 220.889 220.889z"
              fill="#f9f7f8"
            ></path>
            <path
              d="m334.156 201.197c45.189 28.664 79.257 73.285 94.28 125.937 8.685 30.44-14.231 60.726-45.886 60.726h-346.545c-.591 6.588-.894 13.259-.894 20.001h441.778c0-94.476-59.313-175.099-142.733-206.664z"
              fill="#dff6fd"
            ></path>
            <circle cx="256" cy="407.861" fill="#fe646f" r="41.417"></circle>
            <path d="m497.782 323.339c-1.364-3.911-5.64-5.976-9.552-4.612-3.911 1.364-5.976 5.64-4.612 9.551 8.88 25.464 13.382 52.239 13.382 79.583v20.111h-176.907c-3.438 0-6.579 2.027-8 5.166-9.967 22.022-31.985 36.251-56.094 36.251-24.108 0-46.126-14.229-56.094-36.252-1.42-3.137-4.561-5.165-8-5.165h-176.905v-20.111c0-137.599 112.428-241.149 240.041-241.149 14.66 0 148.545 1.844 215.189 130.488 1.906 3.678 6.432 5.114 10.109 3.21 3.678-1.905 5.115-6.432 3.21-10.109-7.557-14.587-16.516-28.407-26.771-41.316v-212.693c0-4.787-3.894-8.681-8.681-8.681h-52.861c-4.787 0-8.681 3.894-8.681 8.681v151.24c-4.141-2.464-8.346-4.806-12.611-7.024v-90.175c0-4.786-3.894-8.68-8.681-8.68h-52.861c-4.786 0-8.68 3.894-8.68 8.68v65.941c-4.177-.783-8.382-1.464-12.611-2.04v-90.332c0-4.786-3.894-8.68-8.681-8.68h-52.861c-4.786 0-8.68 3.894-8.68 8.68v90.331c-4.23.577-8.434 1.257-12.611 2.04v-52.135c0-4.786-3.894-8.68-8.681-8.68h-52.861c-4.786 0-8.68 3.894-8.68 8.68v76.369c-4.264 2.219-8.47 4.561-12.611 7.024v-54.601c0-4.786-3.894-8.68-8.68-8.68h-52.862c-4.787 0-8.681 3.894-8.681 8.68v49.572c0 4.142 3.358 7.5 7.5 7.5s7.5-3.358 7.5-7.5v-43.252h40.222v57.933c-14.498 10.062-27.973 21.64-40.222 34.543v-14.222c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v31.48c-35.796 45.053-55.222 100.472-55.222 158.877v26.32c0 4.848 3.944 8.792 8.792 8.792h179.219c13.1 25.289 39.358 41.417 67.989 41.417 28.632 0 54.89-16.129 67.99-41.417h179.219c4.848 0 8.792-3.944 8.792-8.792v-26.32c-.001-29.029-4.785-57.467-14.219-84.522zm-96.226-280.728h40.223v189.116c-12.104-12.75-25.549-24.36-40.223-34.544zm-82.833 54.042h40.222v76.668c-12.975-5.7-26.421-10.303-40.222-13.764zm-82.834-26.431h40.222v82.412c-12.929-.998-26.442-1.064-40.222 0zm-82.833 40.236h40.222v49.098c-13.801 3.46-27.247 8.064-40.222 13.763z"></path>
            <path d="m155.844 379.247c-1.136 3.983 1.172 8.134 5.155 9.27 3.984 1.137 8.134-1.173 9.27-5.155 9.264-32.483 36.302-56.603 68.66-62.974l-6.133 7.574c-2.607 3.219-2.11 7.942 1.109 10.548 3.226 2.612 7.946 2.104 10.548-1.109l17.334-21.407c.278-.334.571-.762.794-1.171 1.686-3.084 1.02-6.955-1.7-9.294-.244-.208-.974-.793-21.619-17.511-3.218-2.606-7.942-2.111-10.548 1.109-2.607 3.219-2.11 7.941 1.109 10.548l7.176 5.811c-38.219 7.158-70.242 35.493-81.155 73.761z"></path>
            <path d="m263.5 242.194v-27.611c0-4.142-3.358-7.5-7.5-7.5s-7.5 3.358-7.5 7.5v27.611c0 4.142 3.358 7.5 7.5 7.5s7.5-3.358 7.5-7.5z"></path>
            <path d="m211.49 241.749c4.001-1.072 6.375-5.185 5.304-9.186l-3.573-13.335c-1.072-4.001-5.186-6.373-9.186-5.304-4.001 1.072-6.375 5.185-5.304 9.186l3.573 13.335c1.073 4.003 5.185 6.374 9.186 5.304z"></path>
            <path d="m134.397 286.258c2.929-2.929 2.929-7.678 0-10.606l-9.762-9.762c-2.929-2.93-7.678-2.929-10.606 0-2.929 2.929-2.929 7.678 0 10.606l9.762 9.762c2.928 2.929 7.677 2.93 10.606 0z"></path>
            <path d="m71.25 350.593c-3.999-1.068-8.113 1.302-9.186 5.303-1.072 4.001 1.302 8.114 5.303 9.186l13.335 3.573c4.008 1.071 8.115-1.306 9.186-5.303 1.072-4.001-1.302-8.114-5.303-9.186z"></path>
            <path d="m165.856 236.728c-2.071-3.588-6.658-4.817-10.245-2.745-3.587 2.071-4.816 6.658-2.745 10.245l13.806 23.912c2.077 3.599 6.668 4.811 10.245 2.745 3.587-2.071 4.816-6.658 2.745-10.245z"></path>
            <path d="m119.023 328.778c2.071-3.587.842-8.174-2.745-10.245l-23.912-13.806c-3.588-2.073-8.174-.843-10.245 2.745-2.071 3.587-.842 8.174 2.745 10.245l23.912 13.806c3.572 2.062 8.165.858 10.245-2.745z"></path>
            <path d="m309.696 236.445 3.573-13.335c1.072-4.001-1.302-8.113-5.304-9.186-3.994-1.069-8.113 1.302-9.186 5.304l-3.573 13.335c-1.072 4.001 1.302 8.113 5.304 9.186 3.999 1.069 8.112-1.298 9.186-5.304z"></path>
            <path d="m387.365 265.89-9.762 9.762c-2.929 2.929-2.929 7.677 0 10.606 2.928 2.929 7.677 2.929 10.606 0l9.762-9.762c2.929-2.929 2.929-7.677 0-10.606-2.928-2.93-7.677-2.929-10.606 0z"></path>
            <path d="m422.113 363.352c1.07 3.991 5.172 6.376 9.186 5.303l13.335-3.573c4.001-1.072 6.375-5.185 5.303-9.186s-5.185-6.372-9.186-5.303l-13.335 3.573c-4.001 1.072-6.375 5.185-5.303 9.186z"></path>
            <path d="m345.329 268.14 13.806-23.912c2.071-3.587.842-8.174-2.745-10.245-3.588-2.072-8.175-.842-10.245 2.745l-13.806 23.912c-2.071 3.587-.842 8.174 2.745 10.245 3.572 2.063 8.165.856 10.245-2.745z"></path>
            <path d="m419.634 304.727-23.912 13.806c-3.587 2.071-4.816 6.658-2.745 10.245 2.077 3.599 6.668 4.811 10.245 2.745l23.912-13.806c3.587-2.071 4.816-6.658 2.745-10.245-2.071-3.588-6.658-4.817-10.245-2.745z"></path>
            <path d="m143.967 407.861c0 4.142 3.358 7.5 7.5 7.5h56.191c3.62 23.425 23.919 41.417 48.342 41.417s44.723-17.991 48.343-41.417h172.546c4.142 0 7.5-3.358 7.5-7.5 0-126.224-102.147-228.389-228.389-228.389-126.223 0-228.389 102.147-228.389 228.389 0 4.142 3.358 7.5 7.5 7.5h81.354c4.142 0 7.5-3.358 7.5-7.5s-3.358-7.5-7.5-7.5h-73.724c3.97-114.199 98.11-205.889 213.259-205.889s209.289 91.69 213.259 205.889h-164.916c-.107-.693-.229-1.381-.365-2.065l45.348-76.895c5.941-10.076 3.366-22.966-5.992-29.985s-22.454-5.881-30.463 2.644l-61.125 65.068c-22.494 1.947-40.681 19.182-44.088 41.233h-56.191c-4.142 0-7.5 3.358-7.5 7.5zm179.836-103.53c2.769-2.947 7.296-3.341 10.53-.915 3.235 2.426 4.125 6.882 2.071 10.365l-39.594 67.137c-6.176-9.323-15.458-16.418-26.359-19.795zm-68.161 69.616c18.764-.196 34.275 14.994 34.275 33.914 0 18.702-15.215 33.917-33.917 33.917s-33.917-15.215-33.917-33.917c0-18.421 14.824-33.686 33.559-33.914z"></path>
          </g>
          {/* Ponteiro animado */}
          <motion.g
            style={{
              transformOrigin: '256px 407.861px',
            }}
            animate={{
              rotate: [0, 45, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <path
              d="m286.372 413.384-44.178-33.133 76.142-81.055c5.381-5.728 14.209-6.495 20.497-1.779 6.288 4.716 8.024 13.405 4.031 20.175z"
              fill="#fd4755"
            ></path>
          </motion.g>
        </svg>
        <span>Métricas</span>
      </h2>

      {/* Grid de métricas - Layout melhorado */}
      <div className="space-y-4">
        {/* Métrica 1: Registros */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="relative p-4 bg-gradient-to-br from-[#0f1a2b]/60 to-[#1a2535]/60 rounded-xl border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 group overflow-hidden"
        >
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-[#8aa0c2] uppercase tracking-wider">
                  Total de Registros
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-cyan-500">
                {total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
        </motion.div>

        {/* Métrica 2: OMs Distintas */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative p-4 bg-gradient-to-br from-[#0f1a2b]/60 to-[#1a2535]/60 rounded-xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-[#8aa0c2] uppercase tracking-wider">
                  OM Distintas
                </span>
              </div>
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-300 to-blue-500">
                {oms}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Métrica 3: Distribuição de Defeitos com Gráfico */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-4 bg-gradient-to-br from-[#0f1a2b]/60 to-[#1a2535]/60 rounded-xl border border-amber-500/20 hover:border-amber-400/40 transition-all duration-300 group overflow-hidden col-span-full"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-[#8aa0c2] uppercase tracking-wider">
                Top 3 Defeitos
              </span>
            </div>

            {distributionData.length > 0 ? (
              <div className="space-y-3">
                {distributionData.map((item, index) => {
                  const percentage = (item.count / maxCount) * 100;
                  const colors = [
                    'from-amber-500/80 to-orange-500/80 border-amber-400/30',
                    'from-orange-500/80 to-red-500/80 border-orange-400/30',
                    'from-red-500/80 to-pink-500/80 border-red-400/30',
                  ];
                  const barColor = colors[index] || colors[0];

                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#cfe0ff] truncate flex-1 mr-2">
                          {item.name}
                        </span>
                        <span className="font-bold text-amber-400 tabular-nums shrink-0">
                          {item.count}
                        </span>
                      </div>
                      <div className="relative h-2 bg-[#0a1320] rounded-full overflow-hidden border border-[#1a2535]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{
                            delay: 0.5 + index * 0.1,
                            duration: 0.8,
                            ease: 'easeOut',
                          }}
                          className={`h-full bg-gradient-to-r ${barColor} border-r border-[#1a2535] rounded-full shadow-lg`}
                          style={{
                            boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-[#8aa0c2] italic py-2">Nenhum defeito registrado</div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
