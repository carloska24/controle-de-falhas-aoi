'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  Wrench,
  Download,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
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
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import DemoBadge from '@/components/ui/DemoBadge';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { Registro } from '@/types/index';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function RelatorioReparoPage() {
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [operadorFilter, setOperadorFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Fixado em 12 itens por página

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
      if (!['admin', 'reparo'].includes(parsedUser.role)) {
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

      // Filtrar apenas registros que foram para reparo (status != 'aberto')
      const reparosData = registrosList.filter(
        (r: Registro) =>
          r.status === 'reparado' ||
          r.status === 'em_andamento' ||
          r.status === 'cancelado' ||
          r.status === 'aberto'
      );

      // Verificar modo demo novamente para garantir que está atualizado
      const urlParams = new URLSearchParams(window.location.search);
      const currentDemoMode = urlParams.get('demo') === 'true';

      // Filtrar DEMO baseado no modo demo
      if (currentDemoMode && user?.role === 'admin') {
        // Modo demo: mostrar todos os dados incluindo DEMO
        setAllData(reparosData);
      } else {
        // Modo normal: filtrar dados DEMO
        setAllData(reparosData.filter((r: Registro) => !r.om?.startsWith('DEMO-')));
      }
      setIsDataLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar dados de reparo:', error);
      showToast(error.message || 'Erro ao carregar dados', 'error');
      setIsDataLoading(false);
    }
  }, [user?.role, showToast]);

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

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Filtro por prioridade
    if (prioridadeFilter !== 'all') {
      filtered = filtered.filter(d => d.prioridade === prioridadeFilter);
    }

    // Filtro por operador
    if (operadorFilter) {
      filtered = filtered.filter(d =>
        d.operador?.toLowerCase().includes(operadorFilter.toLowerCase())
      );
    }

    setFilteredData(filtered);
    // Resetar página quando filtros mudarem
    setCurrentPage(1);
  }, [
    allData,
    dateRange,
    startDate,
    endDate,
    omFilter,
    statusFilter,
    prioridadeFilter,
    operadorFilter,
  ]);

  // Paginação dos dados filtrados
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredData.slice(startIdx, endIdx);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  // KPIs
  const kpis = useMemo(() => {
    const totalReparos = filteredData.length;
    const concluidos = filteredData.filter(r => r.status === 'reparado').length;
    const pendentes = filteredData.filter(r => r.status === 'aberto').length;
    const emAndamento = filteredData.filter(r => r.status === 'em_andamento').length;
    const urgentes = filteredData.filter(
      r => r.prioridade === 'urgente' || r.prioridade === 'alta'
    ).length;
    const taxaConclusao = totalReparos > 0 ? ((concluidos / totalReparos) * 100).toFixed(1) : '0.0';

    // Calcular tempo médio de reparo (em dias)
    const reparosConcluidos = filteredData.filter(r => r.status === 'reparado');
    let tempoMedio = '-';
    if (reparosConcluidos.length > 0) {
      // Assumindo que updatedAt tem a data de conclusão
      const tempos = reparosConcluidos
        .filter(r => r.createdat && r.updatedat)
        .map(r => {
          const inicio = new Date(r.createdat);
          const fim = new Date(r.updatedat || r.createdat);
          return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24); // dias
        });

      if (tempos.length > 0) {
        const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        tempoMedio = media.toFixed(1);
      }
    }

    return {
      totalReparos,
      concluidos,
      pendentes,
      emAndamento,
      urgentes,
      taxaConclusao,
      tempoMedio,
    };
  }, [filteredData]);

  // Unique values for filters
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
      [
        'OM',
        'PN',
        'Serial',
        'Designador',
        'Tipo Defeito',
        'Status',
        'Prioridade',
        'Operador',
        'Data Criação',
        'Data Atualização',
      ].join(','),
      ...filteredData.map(r =>
        [
          r.om || '',
          r.pn || '',
          r.serial || '',
          r.designador || '',
          r.tipodefeito || '',
          r.status || '',
          r.prioridade || '',
          r.operador || '',
          r.createdat || '',
          r.updatedat || r.createdat || '',
        ]
          .map(v => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-reparo-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('CSV exportado com sucesso!', 'success');
  };

  // Gráfico: Status de Reparos
  const statusData = useMemo(() => {
    const statusCount = filteredData.reduce((acc, r) => {
      const status = r.status || 'pendente';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(statusCount),
      datasets: [
        {
          data: Object.values(statusCount),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)', // verde - reparado
            'rgba(245, 158, 11, 0.8)', // laranja - em_andamento
            'rgba(239, 68, 68, 0.8)', // vermelho - aberto
            'rgba(107, 114, 128, 0.8)', // cinza - cancelado
          ],
          borderColor: ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'],
          borderWidth: 2,
        },
      ],
    };
  }, [filteredData]);

  // Gráfico: Tendência Temporal
  const tendenciaData = useMemo(() => {
    const reparosPorDia = filteredData.reduce((acc, r) => {
      const dataObj = new Date(r.createdat);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const data = `${ano}-${mes}-${dia}`;
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(reparosPorDia).sort((a, b) => {
      const dateA = new Date(a[0] + 'T00:00:00');
      const dateB = new Date(b[0] + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Reparos por Dia',
          data: sortedData.map(item => item[1]),
          borderColor: '#3b82f6',
          borderWidth: 3,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [filteredData]);

  // Gráfico: Prioridades
  const prioridadesData = useMemo(() => {
    const prioridades = filteredData.reduce((acc, r) => {
      const p = r.prioridade || 'sem prioridade';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(prioridades),
      datasets: [
        {
          label: 'Quantidade',
          data: Object.values(prioridades),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)', // vermelho - urgente
            'rgba(245, 158, 11, 0.8)', // laranja - alta
            'rgba(59, 130, 246, 0.8)', // azul - media
            'rgba(107, 114, 128, 0.8)', // cinza - baixa
          ],
          borderColor: ['#ef4444', '#f59e0b', '#3b82f6', '#6b7280'],
          borderWidth: 2,
        },
      ],
    };
  }, [filteredData]);

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
              <Wrench className="w-6 h-6 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Relatório de Reparo
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 via-blue-900/20 to-slate-900 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Reparos
              </div>
            </div>
            <p className="text-4xl font-black text-blue-400">{kpis.totalReparos}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 via-green-900/20 to-slate-900 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Concluídos
              </div>
            </div>
            <p className="text-4xl font-black text-green-400">{kpis.concluidos}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 via-orange-900/20 to-slate-900 border border-orange-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pendentes
              </div>
            </div>
            <p className="text-4xl font-black text-orange-400">{kpis.pendentes}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 via-purple-900/20 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Taxa Conclusão
              </div>
            </div>
            <p className="text-4xl font-black text-purple-400">{kpis.taxaConclusao}%</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-slate-800 via-red-900/20 to-slate-900 border border-red-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Urgentes
              </div>
            </div>
            <p className="text-4xl font-black text-red-400">{kpis.urgentes}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-800 via-cyan-900/20 to-slate-900 border border-cyan-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tempo Médio
              </div>
            </div>
            <p className="text-2xl font-black text-cyan-400">
              {kpis.tempoMedio} {kpis.tempoMedio !== '-' && 'dias'}
            </p>
          </motion.div>
        </div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Período</label>
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

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todos</option>
                <option value="aberto">Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="reparado">Reparado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Prioridade</label>
              <select
                value={prioridadeFilter}
                onChange={e => setPrioridadeFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todas</option>
                <option value="urgente">Urgente</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Operador</label>
              <input
                type="text"
                value={operadorFilter}
                onChange={e => setOperadorFilter(e.target.value)}
                placeholder="Digite o nome..."
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              />
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
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Status de Reparos</h3>
            <div style={{ height: '300px' }}>
              <Doughnut data={statusData} options={chartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Distribuição por Prioridade</h3>
            <div style={{ height: '300px' }}>
              <Bar data={prioridadesData} options={chartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 lg:col-span-1"
          >
            <h3 className="text-lg font-bold mb-4">Tendência Temporal</h3>
            <div style={{ height: '300px' }}>
              <Line data={tendenciaData} options={chartOptions} />
            </div>
          </motion.div>
        </div>

        {/* Tabela de Dados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Registros de Reparo</h3>
            <div className="text-sm text-slate-400">Mostrando {filteredData.length} registros</div>
          </div>

          {isDataLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        OM
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        PN
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Serial
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Designador
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Tipo Defeito
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Prioridade
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Operador
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                        Data Criação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-slate-400">
                          Nenhum registro encontrado
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((registro, idx) => (
                        <tr
                          key={registro.id || idx}
                          className={`border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'
                          }`}
                        >
                          <td className="py-3 px-4 text-white font-medium">{registro.om || '-'}</td>
                          <td className="py-3 px-4 text-slate-200">{registro.pn || '-'}</td>
                          <td className="py-3 px-4 text-slate-200 font-mono text-sm">
                            {registro.serial || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-200">{registro.designador || '-'}</td>
                          <td className="py-3 px-4 text-slate-200">
                            {registro.tipodefeito || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                registro.status === 'reparado'
                                  ? 'success'
                                  : registro.status === 'em_andamento'
                                  ? 'info'
                                  : registro.status === 'aberto'
                                  ? 'warning'
                                  : registro.status === 'cancelado'
                                  ? 'danger'
                                  : 'default'
                              }
                            >
                              {registro.status || '-'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {registro.prioridade && (
                              <Badge
                                variant={
                                  registro.prioridade === 'urgente'
                                    ? 'danger'
                                    : registro.prioridade === 'alta'
                                    ? 'warning'
                                    : registro.prioridade === 'media'
                                    ? 'info'
                                    : 'secondary'
                                }
                              >
                                {registro.prioridade}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{registro.operador || '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">
                            {new Date(registro.createdat).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredData.length}
                itemsPerPage={itemsPerPage}
                showInfo={true}
              />
            </>
          )}
        </motion.div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
