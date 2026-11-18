'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  FileText,
  Download,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
  Clock,
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
import { fetchAutenticado, encerrarSessao } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import OMTimeSummary from '@/components/index/OMTimeSummary';
import DemoBadge from '@/components/ui/DemoBadge';
import { useFalhasReport } from '@/hooks/useFalhasReport';
import { reportQuery, reportPage, serializeFalhasCSV, reportDay } from '@/lib/falhasReport';
import type { Registro } from '@/types';

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
  'Possível Incorreto',
  'Valor Incorreto',
  'Invertido',
  'Polaridade Incorreta',
  'Levantado',
];

interface GrupoOM { om: string; qtdlote: number; falhas: Registro[]; }

export default function ControleFalhasPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Data

  // Filters
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [omFilter, setOmFilter] = useState('all');
  const [defeitoFilter, setDefeitoFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [operadorFilter, setOperadorFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Fixado em 12 itens por página

  // OM Finalizada Data
  const [omTimeData, setOmTimeData] = useState<{
    elapsed: number;
    startTime: number | null;
    endTime: number | null;
  } | null>(null);

  // Check URL for demo mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const demo = urlParams.get('demo') === 'true';
      setIsDemoMode(demo);
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
      if (!['admin'].includes(parsedUser.role)) {
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

  const query = reportQuery({ dateRange, startDate, endDate, om: omFilter,
    defeito: defeitoFilter, prioridade: prioridadeFilter, status: statusFilter,
    operador: operadorFilter, demo: isDemoMode });
  const report = useFalhasReport(query, !!user);
  const isDataLoading = report.loading;
  const loadData = report.refresh;
  const allFalhas = report.snapshot?.data || [];
  const pagination = reportPage(allFalhas, currentPage, itemsPerPage);
  const totalItems = report.snapshot?.meta.total || 0;
  const totalPages = pagination.totalPages;
  const filteredData = useMemo(() => {
    const groups = new Map<string, GrupoOM>();
    for (const row of allFalhas) {
      if (!groups.has(row.om)) groups.set(row.om, { om: row.om, qtdlote: row.qtdlote || 0, falhas: [] });
      groups.get(row.om)!.falhas.push(row);
    }
    return [...groups.values()];
  }, [report.snapshot]);
  useEffect(() => { setCurrentPage(1); }, [query]);

  // Respostas de uma seleção anterior não podem substituir o resumo da OM atual.
  useEffect(() => {
    setOmTimeData(null);
    if (omFilter === 'all') return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    void fetchAutenticado('/api/om/' + encodeURIComponent(omFilter), { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted && data?.omNumber === omFilter && data.status === 'finalizada') {
          setOmTimeData({ elapsed: data.elapsed, startTime: data.startTime, endTime: data.endTime });
        }
      }).catch(() => {}).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [omFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalFalhas = allFalhas.length;
    const omsAfetadas = new Set(filteredData.map(g => g.om)).size;

    const contagemDefeitos = allFalhas.reduce((acc, f) => {
      const tipo = f.tipodefeito?.trim() || 'Não informado';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, Object.create(null) as Record<string, number>);

    const principalDefeito = Object.entries(contagemDefeitos).sort((a, b) => b[1] - a[1])[0];
    const totalInspecionadas = filteredData.reduce((sum, g) => sum + (g.qtdlote || 0), 0);
    const taxaQualidade =
      totalInspecionadas > 0
        ? (((totalInspecionadas - totalFalhas) / totalInspecionadas) * 100).toFixed(2)
        : '0.00';

    return {
      totalFalhas,
      omsAfetadas,
      principalDefeito: principalDefeito ? `${principalDefeito[0]} (${principalDefeito[1]})` : '—',
      taxaQualidade,
      contagemDefeitos,
      totalInspecionadas,
    };
  }, [allFalhas, filteredData]);

  // Opções independentes da página e dos filtros da própria opção.
  const uniqueOms = ['all', ...new Set([...(report.options?.oms || []), ...(omFilter === 'all' ? [] : [omFilter])])];
  const uniqueDefeitos = ['all', ...new Set([...(report.options?.defeitos || []), ...(defeitoFilter === 'all' ? [] : [defeitoFilter])])];
  const uniqueStatus = ['all', ...new Set([...(report.options?.statuses || []), ...(statusFilter === 'all' ? [] : [statusFilter])])];

  const handleLogout = async () => {
    try {
      await encerrarSessao();
    } catch (error: any) {
      showToast(error.message || 'Não foi possível encerrar a sessão. Tente novamente antes de deixar o terminal.', 'error');
    }
  };

  const handleExportCSV = () => {
    if (!report.ready) return;
    const blob = new Blob([serializeFalhasCSV(allFalhas)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-falhas-' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(allFalhas.length + ' registro(s) exportado(s) em CSV.', 'success');
  };

  // Gráfico: Defeitos por Tipo
  const defeitosPorTipoData = useMemo(() => {
    const sortedData = Object.entries(kpis.contagemDefeitos)
      .filter(([label, count]) => label && count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const colors = [
      '#22c55e',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#f97316',
      '#65a30d',
      '#14b8a6',
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

  // Gráfico: Tendência Temporal
  const tendenciaData = useMemo(() => {
    const falhasPorDia = allFalhas.reduce((acc, f) => {
      const data = reportDay(f.createdat);
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
  }, [allFalhas]);

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
      id="falhas-dashboard"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
    >
      {/* Header - não aparece no PDF */}
      <div className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-50 no-export">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 p-2"
            >
              <svg
                id="fi_8301010"
                enableBackground="new 0 0 450 450"
                className="w-full h-full"
                viewBox="0 0 450 450"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
              >
                <path
                  d="m298.08 431.83h-263.19c-16.89 0-30.63-13.74-30.63-30.63v-350.92c0-16.89 13.74-30.63 30.63-30.63h263.19c16.89 0 30.63 13.74 30.63 30.63v166.56c0 2.76-2.24 5-5 5s-5-2.24-5-5v-166.56c0-11.38-9.25-20.63-20.63-20.63h-263.19c-11.38 0-20.63 9.25-20.63 20.63v350.92c0 11.38 9.25 20.63 20.63 20.63h263.19c11.38 0 20.63-9.25 20.63-20.63v-22.14c0-2.76 2.24-5 5-5s5 2.24 5 5v22.14c0 16.89-13.74 30.63-30.63 30.63zm-73.93-355.61h-143.92c-2.76 0-5-2.24-5-5s2.24-5 5-5h143.92c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-143.92c-2.76 0-5-2.24-5-5s2.24-5 5-5h143.92c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-143.92c-2.76 0-5-2.24-5-5s2.24-5 5-5h143.92c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-143.92c-2.76 0-5-2.24-5-5s2.24-5 5-5h143.92c2.76 0 5 2.24 5 5s-2.24 5-5 5zm-166.84-112.38h-17.25c-2.76 0-5-2.24-5-5s2.24-5 5-5h17.25c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-17.25c-2.76 0-5-2.24-5-5s2.24-5 5-5h17.25c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-17.25c-2.76 0-5-2.24-5-5s2.24-5 5-5h17.25c2.76 0 5 2.24 5 5s-2.24 5-5 5zm0 37.46h-17.25c-2.76 0-5-2.24-5-5s2.24-5 5-5h17.25c2.76 0 5 2.24 5 5s-2.24 5-5 5zm14.3 196.66c-2.76 0-5-2.24-5-5v-105.9h-21.55v105.9c0 2.76-2.24 5-5 5s-5-2.24-5-5v-110.9c0-2.76 2.24-5 5-5h31.54c2.76 0 5 2.24 5 5v110.9c.01 2.76-2.23 5-4.99 5zm149.34 0h-180.89c-2.76 0-5-2.24-5-5s2.24-5 5-5h180.88c2.76 0 5 2.24 5 5s-2.23 5-4.99 5zm-99.56 0c-2.76 0-5-2.24-5-5v-123.15h-21.54v123.15c0 2.76-2.24 5-5 5s-5-2.24-5-5v-128.15c0-2.76 2.24-5 5-5h31.54c2.76 0 5 2.24 5 5v128.15c0 2.76-2.24 5-5 5zm49.78 0c-2.76 0-5-2.24-5-5v-143.09h-21.54v143.08c0 2.76-2.24 5-5 5s-5-2.24-5-5v-148.07c0-2.76 2.24-5 5-5h31.54c2.76 0 5 2.24 5 5v148.08c0 2.76-2.24 5-5 5zm49.78 0c-2.76 0-5-2.24-5-5v-166.12h-21.55v166.12c0 2.76-2.24 5-5 5s-5-2.24-5-5v-171.12c0-2.76 2.24-5 5-5h31.54c2.76 0 5 2.24 5 5v171.12c.01 2.76-2.23 5-4.99 5zm3.2-234.12c-1.15 0-2.3-.39-3.24-1.2-2.1-1.79-2.35-4.95-.56-7.05l55.86-65.5c1.79-2.1 4.95-2.35 7.05-.56s2.35 4.95.56 7.05l-55.86 65.5c-.99 1.17-2.4 1.76-3.81 1.76zm116.81-32.99c-1.1 0-2.21-.36-3.14-1.11l-42.38-34.23c-2.15-1.74-2.48-4.88-.75-7.03 1.74-2.15 4.89-2.48 7.03-.75l42.38 34.23c2.15 1.74 2.48 4.88.75 7.03-.99 1.22-2.44 1.86-3.89 1.86zm19.38-.97c-1.29 0-2.58-.5-3.56-1.49-1.94-1.96-1.92-5.13.04-7.07l36.52-36.1c1.96-1.94 5.13-1.92 7.07.04s1.92 5.13-.04 7.07l-36.52 36.1c-.97.97-2.24 1.45-3.51 1.45zm-71.88-28.42c-9.93 0-18.02-8.08-18.02-18.01s8.08-18.01 18.02-18.01c9.93 0 18.01 8.08 18.01 18.01s-8.08 18.01-18.01 18.01zm0-26.03c-4.42 0-8.02 3.6-8.02 8.01s3.6 8.01 8.02 8.01 8.01-3.6 8.01-8.01-3.59-8.01-8.01-8.01zm62.62 76.61c-9.93 0-18.01-8.08-18.01-18.01s8.08-18.01 18.01-18.01 18.01 8.08 18.01 18.01-8.07 18.01-18.01 18.01zm0-26.03c-4.42 0-8.01 3.6-8.01 8.01s3.6 8.01 8.01 8.01 8.01-3.6 8.01-8.01-3.59-8.01-8.01-8.01zm64.23-24.52c-17.07 0-30.95-13.88-30.95-30.95s13.88-30.95 30.95-30.95 30.95 13.88 30.95 30.95-13.88 30.95-30.95 30.95zm0-51.9c-11.55 0-20.95 9.4-20.95 20.95s9.4 20.95 20.95 20.95 20.95-9.4 20.95-20.95-9.4-20.95-20.95-20.95zm-77.55 348.37c-48.14 0-87.31-39.17-87.31-87.31s39.17-87.31 87.31-87.31 87.31 39.17 87.31 87.31-39.17 87.31-87.31 87.31zm0-164.62c-42.63 0-77.31 34.68-77.31 77.31s34.68 77.31 77.31 77.31 77.31-34.68 77.31-77.31-34.68-77.31-77.31-77.31zm0 122.72c-25.04 0-45.42-20.37-45.42-45.42s20.37-45.42 45.42-45.42 45.42 20.37 45.42 45.42-20.38 45.42-45.42 45.42zm0-80.83c-19.53 0-35.42 15.89-35.42 35.42s15.89 35.42 35.42 35.42 35.42-15.89 35.42-35.42-15.89-35.42-35.42-35.42zm0 0c-2.76 0-5-2.24-5-5v-41.89c0-2.76 2.24-5 5-5s5 2.24 5 5v41.89c0 2.76-2.24 5-5 5zm39.03 29.96c-2.21 0-4.23-1.47-4.83-3.71-.71-2.67.87-5.41 3.54-6.12l40.47-10.84c2.67-.71 5.41.87 6.12 3.54s-.87 5.41-3.54 6.12l-40.47 10.84c-.42.11-.86.17-1.29.17zm2.13 81.74c-1.73 0-3.41-.9-4.33-2.5l-20.95-36.28c-1.38-2.39-.56-5.45 1.83-6.83s5.45-.56 6.83 1.83l20.95 36.28c1.38 2.39.56 5.45-1.83 6.83-.79.45-1.65.67-2.5.67zm-99.36-13.08c-1.28 0-2.56-.49-3.54-1.46-1.95-1.95-1.95-5.12 0-7.07l29.62-29.62c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-29.62 29.62c-.97.97-2.25 1.46-3.53 1.46zm23.19-78.41c-.85 0-1.71-.22-2.49-.67l-36.28-20.95c-2.39-1.38-3.21-4.44-1.83-6.83s4.44-3.21 6.83-1.83l36.28 20.95c2.39 1.38 3.21 4.44 1.83 6.83-.93 1.6-2.61 2.5-4.34 2.5z"
                  fill="white"
                />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Relatório de Controle de Falhas
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
            <p className="text-4xl font-black text-red-400">{report.ready ? kpis.totalFalhas : '—'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 via-blue-900/20 to-slate-900 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              OMs Afetadas
            </div>
            <p className="text-4xl font-black text-blue-400">{report.ready ? kpis.omsAfetadas : '—'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 via-purple-900/20 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Defeito Mais Comum
            </div>
            <p className="text-lg font-bold text-purple-400 truncate">{report.ready ? kpis.principalDefeito : '—'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 via-green-900/20 to-slate-900 border border-green-500/20 rounded-xl p-6"
          >
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Estimativa de Qualidade
            </div>
            <p className="text-4xl font-black text-green-400" title="Cálculo legado por ocorrências/lote; não mede aprovação de placas. Definição a validar com Qualidade.">{report.ready && kpis.totalInspecionadas > 0 && kpis.totalFalhas <= kpis.totalInspecionadas ? kpis.taxaQualidade + '%' : '—'}</p>
          </motion.div>
        </div>

        {/* Informações de Tempo da OM Finalizada */}
        {omTimeData && omFilter !== 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <OMTimeSummary
              elapsed={omTimeData.elapsed}
              startTime={omTimeData.startTime}
              endTime={omTimeData.endTime}
              visible={true}
            />
          </motion.div>
        )}

        {/* Filtros - não aparece no PDF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6 no-export"
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
                  <label htmlFor="falhas-data-inicio" className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    id="falhas-data-inicio"
                    type="date"
                    value={startDate}
                    onInput={e => setStartDate(e.currentTarget.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="falhas-data-fim" className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    id="falhas-data-fim"
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Tipo de Defeito
              </label>
              <select
                value={defeitoFilter}
                onChange={e => setDefeitoFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todos os Defeitos</option>
                {uniqueDefeitos
                  .filter(d => d !== 'all')
                  .map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
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
              <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todos</option>
                {uniqueStatus
                  .filter(s => s !== 'all')
                  .map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
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
            <Button onClick={handleExportCSV} variant="success" disabled={!report.ready}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="secondary">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </motion.div>

        {report.error && <p role="alert" className="mb-4 text-sm text-red-200">{report.error} Use Atualizar para tentar novamente.</p>}
        {report.snapshot && <p role="status" className="mb-4 text-xs text-slate-400">{totalItems} registro(s) na consulta confirmada · horário de Brasília · {new Date(report.snapshot.meta.generatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{report.snapshot.meta.invalidDates > 0 ? ' · ' + report.snapshot.meta.invalidDates + ' registro(s) com data inválida' : ''}</p>}
        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Distribuição de Falhas por Tipo</h3>
            <div style={{ height: '300px' }}>
              <Bar data={defeitosPorTipoData} options={chartOptions} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
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
            <h3 className="text-lg font-bold">Registros de Falhas</h3>
            <div className="text-sm text-slate-400">
              {report.ready ? 'Mostrando ' + pagination.records.length + ' de ' + totalItems + ' registros' : isDataLoading ? 'Consultando relatório…' : 'Consulta não confirmada'}
            </div>
          </div>

          {isDataLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
            </div>
          ) : (
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
                      Operador
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                      Prioridade
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold text-xs uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.records.map((falha, idx) => {
                      // Lógica de cores para Defeitos (similar ao ReparoPage)
                      const tipoDefeito = falha.tipodefeito || '';
                      const isSoldagem = DEFEITOS_SOLDAGEM.includes(tipoDefeito);
                      const isPosicionamento = DEFEITOS_POSICIONAMENTO.includes(tipoDefeito);

                      let defeitoColorClass = 'bg-slate-700/50 text-slate-300 border-slate-600';
                      if (isSoldagem)
                        defeitoColorClass =
                          'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_-4px_rgba(244,63,94,0.3)]';
                      if (isPosicionamento)
                        defeitoColorClass =
                          'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_-4px_rgba(251,191,36,0.3)]';

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-slate-800/50 hover:bg-slate-800/80 transition-all duration-200 group ${
                            idx % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">
                              {falha.om}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {falha.pn || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            {falha.serial ? (
                              <span
                                className="font-mono text-xs text-slate-300 bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50 cursor-help whitespace-nowrap block w-fit"
                                title={falha.serial}
                              >
                                {falha.serial.length > 8
                                  ? `...${falha.serial.slice(-8)}`
                                  : falha.serial}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {falha.designador ? (
                              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/20">
                                {falha.designador}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {falha.tipodefeito ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${defeitoColorClass}`}
                              >
                                {falha.tipodefeito}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-sm">
                            {falha.operador || <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                falha.status === 'reparado'
                                  ? 'success'
                                  : falha.status === 'aberto' || falha.status === 'pendente'
                                  ? 'warning'
                                  : falha.status === 'em_andamento'
                                  ? 'info'
                                  : falha.status === 'cancelado' || falha.status === 'sucata'
                                  ? 'danger'
                                  : 'default'
                              }
                              className="bg-opacity-10 border bg-transparent"
                            >
                              {falha.status === 'pendente' ? 'Aberto' : falha.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {falha.prioridade && (
                              <Badge
                                variant={
                                  falha.prioridade === 'urgente'
                                    ? 'danger'
                                    : falha.prioridade === 'alta'
                                    ? 'warning'
                                    : falha.prioridade === 'media'
                                    ? 'info'
                                    : 'secondary'
                                }
                                className="uppercase text-[10px] tracking-wider font-bold"
                              >
                                {falha.prioridade}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                            {falha.createdat ? new Date(falha.createdat).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'America/Sao_Paulo',
                            }) : 'Data inválida'}
                          </td>
                        </tr>
                      );
                    })}
                  {/* Linha de Finalização da OM */}
                  {omTimeData && omFilter !== 'all' && omTimeData.endTime && (
                    <tr className="bg-gradient-to-r from-purple-500/10 via-purple-600/5 to-transparent border-t-2 border-purple-500/30">
                      <td colSpan={9} className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-purple-400" />
                            <span className="text-sm font-semibold text-purple-300 uppercase tracking-wide">
                              OM Finalizada
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {omTimeData.startTime && (
                              <div className="text-xs text-slate-400">
                                <span className="font-semibold text-slate-500">Início:</span>{' '}
                                <span className="text-slate-300 font-mono">
                                  {new Date(omTimeData.startTime).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                            <div className="text-sm text-white font-bold">
                              <span className="font-semibold text-purple-400">Finalizada em:</span>{' '}
                              <span className="text-purple-300 font-mono ml-2">
                                {new Date(omTimeData.endTime).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-sm text-emerald-400 font-bold">
                              <span className="font-semibold text-slate-400">Tempo Total:</span>{' '}
                              <span className="text-emerald-300 font-mono ml-2">
                                {(() => {
                                  const totalSec = Math.floor(omTimeData.elapsed / 1000);
                                  const h = Math.floor(totalSec / 3600)
                                    .toString()
                                    .padStart(2, '0');
                                  const m = Math.floor((totalSec % 3600) / 60)
                                    .toString()
                                    .padStart(2, '0');
                                  const s = (totalSec % 60).toString().padStart(2, '0');
                                  return `${h}:${m}:${s}`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            showInfo={true}
          />
        </motion.div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
