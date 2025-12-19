'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  Activity,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Registro } from '@/types/index';
import Button from '@/components/ui/Button';
import DemoBadge from '@/components/ui/DemoBadge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const DEFEITOS_SOLDAGEM = [
  'Curto',
  'Solda Fria',
  'Excesso de Solda',
  'Insuficiência de Solda',
  'Tombstone',
  'Bilboard',
  'Solder Ball',
  'Terminal Levantado',
];
const DEFEITOS_POSICIONAMENTO = [
  'Ausente',
  'Danificado',
  'Deslocado',
  'Incorreto',
  'Invertido',
  'Polaridade Incorreta',
  'Levantado',
];
const DEFEITOS_VALIDOS = new Set([...DEFEITOS_SOLDAGEM, ...DEFEITOS_POSICIONAMENTO]);

export default function RelatorioQualidadePage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Data
  const [allData, setAllData] = useState<Registro[]>([]);
  const [filteredData, setFilteredData] = useState<Registro[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [omFilter, setOmFilter] = useState('all');

  // Check URL for demo mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsDemoMode(urlParams.get('demo') === 'true');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      if (!['admin', 'qualidade'].includes(parsedUser.role)) {
        router.push('/operador');
        return;
      }

      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setLoading(false);
      router.push('/login');
    }
  };

  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await fetchAutenticado('/api/registros');
      const registrosList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Se estiver em modo demo, incluir todos os dados; caso contrário, filtrar DEMO
      if (isDemoMode && user?.role === 'admin') {
        setAllData(registrosList);
      } else {
        setAllData(registrosList.filter((r: Registro) => !r.om?.startsWith('DEMO-')));
      }
      setIsDataLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar registros:', error);
      showToast(error.message || 'Erro ao carregar registros', 'error');
      setIsDataLoading(false);
    }
  }, [showToast, isDemoMode, user?.role]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allData];

    // Filtro por período
    if (dateRange === 'custom') {
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        filtered = filtered.filter(d => new Date(d.createdat) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        filtered = filtered.filter(d => new Date(d.createdat) <= end);
      }
    } else if (dateRange !== 'all') {
      const dias = parseInt(dateRange, 10);
      if (!isNaN(dias)) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        filtered = filtered.filter(d => new Date(d.createdat) >= dataLimite);
      }
    }

    // Filtro por OM
    if (omFilter !== 'all') {
      filtered = filtered.filter(d => d.om === omFilter);
    }

    setFilteredData(filtered);
  }, [allData, dateRange, startDate, endDate, omFilter]);

  // Remover duplicatas por ID
  const uniqueFilteredData = useMemo(() => {
    return filteredData.filter(
      (item, index, self) => index === self.findIndex(t => t.id === item.id)
    );
  }, [filteredData]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFalhas = uniqueFilteredData.length;

    const contagemDefeitos = uniqueFilteredData.reduce((acc, item) => {
      const tipo = item.tipodefeito || '';
      if (!DEFEITOS_VALIDOS.has(tipo)) return acc;
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const principalDefeito = Object.entries(contagemDefeitos).sort((a, b) => b[1] - a[1])[0];
    const falhasSoldagem = uniqueFilteredData.filter(d =>
      DEFEITOS_SOLDAGEM.includes(d.tipodefeito)
    ).length;
    const falhasPosicionamento = uniqueFilteredData.filter(d =>
      DEFEITOS_POSICIONAMENTO.includes(d.tipodefeito)
    ).length;

    // Calcular total de unidades inspecionadas
    const totalInspecionadas = uniqueFilteredData.reduce(
      (sum, item) => sum + (item.qtdlote || 1),
      0
    );

    // Calcular Yield
    const yieldPercent =
      totalInspecionadas > 0
        ? (((totalInspecionadas - totalFalhas) / totalInspecionadas) * 100).toFixed(2)
        : '0.00';

    return {
      totalFalhas,
      principalDefeito: principalDefeito ? `${principalDefeito[0]} (${principalDefeito[1]})` : '—',
      falhasSoldagem,
      falhasPosicionamento,
      contagemDefeitos,
      totalInspecionadas,
      yieldPercent,
    };
  }, [uniqueFilteredData]);

  // Unique OMs
  const uniqueOms = useMemo(() => {
    const oms = Array.from(new Set(allData.map(r => r.om)));
    return ['all', ...oms];
  }, [allData]);

  const handleLogout = async () => {
    try {
      // Se for admin, limpar dados demo antes do logout
      if (user?.role === 'admin') {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/logout`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );
      }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignora erros na limpeza
    }
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['OM', 'PN', 'Serial', 'Designador', 'Tipo Defeito', 'Descrição', 'Operador', 'Data'].join(
        ','
      ),
      ...uniqueFilteredData.map(r =>
        [
          r.om || '',
          r.pn || '',
          r.serial || '',
          r.designador || '',
          r.tipodefeito || '',
          r.descricao || '',
          r.operador || '',
          r.createdat || '',
        ]
          .map(v => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-qualidade-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV exportado com sucesso!', 'success');
  };

  // Gráfico: Defeitos por Tipo
  const defeitosPorTipoData = useMemo(() => {
    const sortedData = Object.entries(kpis.contagemDefeitos)
      .filter(([label, count]) => label && DEFEITOS_VALIDOS.has(label) && count > 0)
      .sort((a, b) => b[1] - a[1]);

    const colors = [
      '#22c55e',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#f97316',
    ];

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Quantidade de Falhas',
          data: sortedData.map(item => item[1]),
          backgroundColor: sortedData.map((_, i) => colors[i % colors.length] + 'CC'),
          borderColor: sortedData.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  }, [kpis.contagemDefeitos]);

  // Gráfico: Categorias
  const categoriasData = useMemo(
    () => ({
      labels: ['Falhas de Soldagem', 'Falhas de Posicionamento'],
      datasets: [
        {
          data: [kpis.falhasSoldagem, kpis.falhasPosicionamento],
          backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(59, 130, 246, 0.8)'],
          borderColor: ['#f59e0b', '#3b82f6'],
          borderWidth: 2,
        },
      ],
    }),
    [kpis.falhasSoldagem, kpis.falhasPosicionamento]
  );

  // Gráfico: Tendência
  const tendenciaData = useMemo(() => {
    const falhasPorDia = uniqueFilteredData.reduce((acc, item) => {
      const dataObj = new Date(item.createdat);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const data = `${ano}-${mes}-${dia}`;
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(falhasPorDia).sort((a, b) => {
      const dateA = new Date(a[0] + 'T00:00:00');
      const dateB = new Date(b[0] + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Falhas por Dia',
          data: sortedData.map(item => item[1]),
          borderColor: '#ef4444',
          borderWidth: 3,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [uniqueFilteredData]);

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 }, usePointStyle: true } },
      title: { color: '#e5e7eb', font: { size: 16, weight: 'bold' as const } },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        titleColor: '#e5e7eb',
        bodyColor: '#cbd5e1',
        displayColors: true,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, beginAtZero: true },
    },
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
            >
              <Activity className="w-6 h-6 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Relatório de Análise de Qualidade
              {isDemoMode && <DemoBadge />}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {(user.role === 'admin' || user.role === 'operator') && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/operador')}
                className="group relative p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                title="Voltar para Registro de Falhas"
              >
                <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-300" />
              </motion.button>
            )}
            <span className="text-slate-300">{user.name || user.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 via-red-900/20 to-slate-900 border border-red-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Total de Falhas
            </div>
            <p className="text-4xl font-black text-red-400">{kpis.totalFalhas}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 via-purple-900/20 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Principal Defeito
            </div>
            <p className="text-lg font-bold text-purple-400 truncate">{kpis.principalDefeito}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 via-orange-900/20 to-slate-900 border border-orange-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Falhas Soldagem
            </div>
            <p className="text-4xl font-black text-orange-400">{kpis.falhasSoldagem}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 via-blue-900/20 to-slate-900 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Falhas Posicionamento
            </div>
            <p className="text-4xl font-black text-blue-400">{kpis.falhasPosicionamento}</p>
          </motion.div>
        </div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Período Rápido
              </label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todo o Período</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">OM</label>
              <select
                value={omFilter}
                onChange={e => setOmFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todas as OMs</option>
                {uniqueOms
                  .filter(om => om !== 'all')
                  .map(om => (
                    <option key={om} value={om}>
                      {om}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <Button onClick={loadData} variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportCSV} variant="success">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="secondary">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </motion.div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Distribuição de Falhas por Tipo</h3>
            <div style={{ height: '350px' }}>
              <Bar
                data={defeitosPorTipoData}
                options={{
                  ...chartOptions,
                  indexAxis: 'y' as const,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false },
                  },
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Tendência Temporal de Falhas</h3>
            <div style={{ height: '300px' }}>
              <Line data={tendenciaData} options={chartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Origem da Falha (Processo)</h3>
            <div style={{ height: '300px' }}>
              <Doughnut data={categoriasData} options={chartOptions} />
            </div>
          </motion.div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
