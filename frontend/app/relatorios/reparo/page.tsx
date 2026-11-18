'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { encerrarSessao, fetchListaCompleta } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import DemoBadge from '@/components/ui/DemoBadge';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import type { Registro } from '@/types/index';
import { repairStatus, repairStatusLabels } from '@/lib/repairStatus';
import { filterRepairReport, normalizedRepairPriority, serializeRepairCSV, summarizeRepairReport } from '@/lib/repairReport';
import { reportDay, reportPage } from '@/lib/falhasReport';

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
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Data
  const [report, setReport] = useState<{ rows: Registro[]; status: 'loading' | 'ready' | 'error'; error?: string }>({ rows: [], status: 'loading' });
  const activeRequest = useRef<AbortController | null>(null);

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
    activeRequest.current?.abort();
    const request = new AbortController();
    activeRequest.current = request;
    const timer = setTimeout(() => request.abort(), 20000);
    setReport(previous => ({ rows: previous.rows, status: 'loading' }));
    try {
      const rows = await fetchListaCompleta<Registro>('/api/registros', request.signal);
      request.signal.throwIfAborted();
      if (activeRequest.current !== request) return;
      const includeDemo = isDemoMode && user?.role === 'admin';
      setReport({ rows: includeDemo ? rows : rows.filter(row => !row.om.startsWith('DEMO-')), status: 'ready' });
    } catch (error) {
      if (activeRequest.current !== request) return;
      setReport(previous => ({ rows: previous.rows, status: 'error', error: request.signal.aborted
        ? 'A consulta do relatório excedeu o tempo de espera.'
        : error instanceof Error ? error.message : 'Não foi possível carregar o relatório.' }));
    } finally {
      clearTimeout(timer);
    }
  }, [isDemoMode, user?.role]);

  useEffect(() => {
    if (!user) return;
    void loadData();
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [user, loadData]);

  const invalidPeriod = dateRange === 'custom' && !!startDate && !!endDate && startDate > endDate;
  const ready = report.status === 'ready' && !invalidPeriod;
  const problem = invalidPeriod ? 'A data inicial deve ser anterior ou igual à final.' : report.error;
  const filteredData = useMemo(() => ready ? filterRepairReport(report.rows, {
    dateRange, startDate, endDate, om: omFilter, status: statusFilter,
    prioridade: prioridadeFilter, operador: operadorFilter,
  }) : [], [ready, report.rows, dateRange, startDate, endDate, omFilter, statusFilter, prioridadeFilter, operadorFilter]);

  useEffect(() => { setCurrentPage(1); }, [report.rows, dateRange, startDate, endDate, omFilter, statusFilter, prioridadeFilter, operadorFilter]);
  const pagination = reportPage(filteredData, currentPage, itemsPerPage);
  const kpis = useMemo(() => summarizeRepairReport(filteredData), [filteredData]);
  const taxaConclusao = kpis.total ? (kpis.counts.reparado * 100 / kpis.total).toFixed(1) + '%' : '—';

  // Unique values for filters
  const uniqueOms = useMemo(() => {
    const oms = Array.from(new Set(report.rows.map(r => r.om)));
    return ['all', ...oms];
  }, [report.rows]);

  const handleLogout = async () => {
    try {
      await encerrarSessao();
    } catch (error: any) {
      showToast(error.message || 'Não foi possível encerrar a sessão. Tente novamente antes de deixar o terminal.', 'error');
    }
  };

  const handleExportCSV = () => {
    if (!ready || !filteredData.length) return;
    const blob = new Blob([serializeRepairCSV(filteredData)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-reparo-' + reportDay(new Date().toISOString()) + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(filteredData.length + ' registro(s) exportado(s) em CSV.', 'success');
  };

  const statusData = useMemo(() => {
    const states = ['reparado', 'em_analise', 'pendente', 'cancelado'] as const;
    return {
      labels: states.map(state => repairStatusLabels[state]),
      datasets: [{
        data: states.map(state => kpis.counts[state]),
        backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(107, 114, 128, 0.8)'],
        borderColor: ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'],
        borderWidth: 2,
      }],
    };
  }, [kpis.counts]);

  // Gráfico: Tendência Temporal
  const tendenciaData = useMemo(() => {
    const registrosPorDia = new Map<string, number>();
    for (const record of filteredData) {
      const day = reportDay(record.createdat);
      if (day !== 'Data inválida') registrosPorDia.set(day, (registrosPorDia.get(day) || 0) + 1);
    }
    const sortedData = [...registrosPorDia.entries()].sort(([a], [b]) => a.localeCompare(b));

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Registros criados por dia',
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
      const p = normalizedRepairPriority(r.prioridade) || 'sem prioridade';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, Object.create(null) as Record<string, number>);

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
    <div
      id="rel-reparo-dashboard"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
    >
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
                Total de Registros
              </div>
            </div>
            <p className="text-4xl font-black text-blue-400">{ready ? kpis.total : '—'}</p>
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
            <p className="text-4xl font-black text-green-400">{ready ? kpis.counts.reparado : '—'}</p>
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
                Abertos
              </div>
            </div>
            <p className="text-4xl font-black text-orange-400" title="Inclui registros pendentes e em análise">{ready ? kpis.abertos : '—'}</p>
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
            <p className="text-4xl font-black text-purple-400">{ready ? taxaConclusao : '—'}</p>
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
            <p className="text-4xl font-black text-red-400">{ready ? kpis.urgentes : '—'}</p>
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
            <p className="text-2xl font-black text-cyan-400" title="Disponível quando houver data registrada de conclusão do reparo">
              —
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
                  <label htmlFor="reparo-data-inicio" className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    id="reparo-data-inicio"
                    type="date"
                    value={startDate}
                    onInput={e => setStartDate(e.currentTarget.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="reparo-data-fim" className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    id="reparo-data-fim"
                    type="date"
                    value={endDate}
                    onInput={e => setEndDate(e.currentTarget.value)}
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
                <option value="aberto">Abertos (pendentes e em análise)</option>
                <option value="em_analise">Em análise</option>
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
            <Button onClick={loadData} variant="primary" disabled={report.status === 'loading'}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportCSV} variant="success" disabled={!ready || filteredData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="secondary">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </motion.div>

        {problem && <p role="alert" className="mb-4 text-sm text-red-200">{problem}</p>}

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
            <div className="text-sm text-slate-400">{ready ? `Mostrando ${pagination.records.length} de ${filteredData.length} registros` : 'Consulta não confirmada'}</div>
          </div>

          {report.status === 'loading' ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-left border-b border-slate-700">
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        OM
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        PN
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Serial
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Designador
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Tipo Defeito
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Status
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Prioridade
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Operador
                      </th>
                      <th className="py-4 px-5 text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Data Criação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center gap-3">
                            <Wrench className="w-12 h-12 opacity-20" />
                            <p>{problem ? 'Consulta não confirmada' : 'Nenhum registro encontrado'}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagination.records.map((registro, idx) => (
                        <tr
                          key={registro.id || idx}
                          className={`border-b border-slate-700/50 hover:bg-slate-800/60 transition-colors ${
                            idx % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'
                          }`}
                        >
                          <td className="py-4 px-5">
                            <span className="font-mono text-base font-bold text-cyan-400 bg-cyan-950/30 px-3 py-1.5 rounded border border-cyan-500/20 inline-block shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                              {registro.om || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-mono text-base font-bold text-amber-300">
                              {registro.pn || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className="font-mono text-xs px-2 py-1 rounded bg-slate-800/80 border border-slate-600/50 text-cyan-200 tracking-wider uppercase cursor-help whitespace-nowrap block w-fit shadow-sm"
                              style={{ letterSpacing: '0.15em' }}
                              title={registro.serial ? `Serial: ${registro.serial}` : ''}
                            >
                              {registro.serial
                                ? registro.serial.length > 8
                                  ? `...${registro.serial.slice(-8)}`
                                  : registro.serial
                                : '—'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-mono text-sm font-bold text-purple-300 bg-purple-900/20 px-2 py-1 rounded inline-block">
                              {registro.designador || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-lg border shadow-sm whitespace-nowrap ${(() => {
                                const def = (registro.tipodefeito || '').toLowerCase();
                                if (def.includes('curto') || def.includes('solder ball'))
                                  return 'bg-rose-500/20 text-rose-200 border-rose-500/40 shadow-rose-500/20';
                                if (
                                  def.includes('ausente') ||
                                  def.includes('danificado') ||
                                  def.includes('invertido') ||
                                  def.includes('incorreta')
                                )
                                  return 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-amber-500/20';
                                if (
                                  def.includes('solda') ||
                                  def.includes('levantado') ||
                                  def.includes('tombstone')
                                )
                                  return 'bg-blue-500/20 text-blue-200 border-blue-500/40 shadow-blue-500/20';
                                return 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-purple-500/20';
                              })()}`}
                            >
                              {registro.tipodefeito || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <Badge
                              variant={
                                ({ reparado: 'success', em_analise: 'info', pendente: 'warning', cancelado: 'danger' } as const)[repairStatus(registro.status)]
                              }
                              size="md"
                              className="px-3 py-1 font-bold shadow-sm"
                            >
                              {repairStatusLabels[repairStatus(registro.status)]}
                            </Badge>
                          </td>
                          <td className="py-4 px-5">
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
                                size="md"
                                className="px-3 py-1 font-bold shadow-sm"
                              >
                                {registro.prioridade}
                              </Badge>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold border border-slate-600 shadow-sm">
                                {(registro.operador || 'S')[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-slate-300">
                                {registro.operador || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-slate-300 font-medium">
                                {new Date(registro.createdat).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(registro.createdat).toLocaleTimeString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
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
