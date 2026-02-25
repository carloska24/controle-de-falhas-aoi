'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  AlertTriangle,
  Download,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Registro } from '@/types/index';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import DemoBadge from '@/components/ui/DemoBadge';

export default function ReparoPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Data
  const [allData, setAllData] = useState<Registro[]>([]);
  const [filteredData, setFilteredData] = useState<Registro[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // UI State
  const [currentView, setCurrentView] = useState<'kanban' | 'table' | 'timeline'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filters
  const [omFilter, setOmFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [operadorFilter, setOperadorFilter] = useState('all');

  // Sort
  const [sortKey, setSortKey] = useState<string>('createdat');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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

  // Check auth
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
      if (!['admin', 'reparo', 'operator'].includes(parsedUser.role)) {
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

  // Load data
  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await fetchAutenticado('/api/registros');
      const registrosList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Traduzir status de "requisição_gerada" para "aberto"
      const translatedData = registrosList.map((r: Registro) => ({
        ...r,
        status: r.status === 'requisição_gerada' ? 'aberto' : r.status,
      }));

      // Se estiver em modo demo, incluir todos os dados; caso contrário, filtrar DEMO
      if (isDemoMode && user?.role === 'admin') {
        setAllData(translatedData);
      } else {
        setAllData(translatedData.filter((r: Registro) => !r.om?.startsWith('DEMO-')));
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

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        item =>
          item.om?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.operador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tipodefeito?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filters
    if (omFilter !== 'all') {
      filtered = filtered.filter(item => item.om === omFilter);
    }
    if (statusFilter !== 'all') {
      // Normalizar status antes de comparar
      const normalizeStatus = (status?: string | null): string => {
        if (!status) return 'aberto';
        const statusLower = status.toLowerCase().trim();
        // Mapear status similares para 'aberto'
        if (statusLower === 'requisição_gerada' || statusLower === 'pendente') {
          return 'aberto';
        }
        return statusLower;
      };
      filtered = filtered.filter(item => normalizeStatus(item.status) === statusFilter);
    }
    if (prioridadeFilter !== 'all') {
      filtered = filtered.filter(item => item.prioridade === prioridadeFilter);
    }
    if (operadorFilter !== 'all') {
      filtered = filtered.filter(item => item.operador === operadorFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey as keyof Registro];
      let bVal: any = b[sortKey as keyof Registro];

      if (sortKey === 'createdat') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredData(filtered);
    // Resetar página quando filtros mudarem
    setCurrentPage(1);
  }, [
    allData,
    searchTerm,
    omFilter,
    statusFilter,
    prioridadeFilter,
    operadorFilter,
    sortKey,
    sortDir,
  ]);

  // Paginação dos dados filtrados
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredData.slice(startIdx, endIdx);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  // Função helper para normalizar status (usada em vários lugares)
  const normalizeStatus = useCallback((status?: string | null): string => {
    if (!status) return 'aberto';
    const statusLower = status.toLowerCase().trim();
    // Mapear status similares para 'aberto'
    if (statusLower === 'requisição_gerada' || statusLower === 'pendente') {
      return 'aberto';
    }
    return statusLower;
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const normalizeStatus = (status?: string | null): string => {
      if (!status) return 'aberto';
      const statusLower = status.toLowerCase().trim();
      // Mapear status similares para 'aberto'
      if (statusLower === 'requisição_gerada' || statusLower === 'pendente') {
        return 'aberto';
      }
      return statusLower;
    };

    const urgentes = filteredData.filter(
      r => r.prioridade === 'urgente' || r.prioridade === 'alta'
    ).length;
    const pendentes = filteredData.filter(r => normalizeStatus(r.status) === 'aberto').length;
    const emAndamento = filteredData.filter(
      r => normalizeStatus(r.status) === 'em_andamento'
    ).length;
    const concluidos = filteredData.filter(r => normalizeStatus(r.status) === 'reparado').length;

    return { urgentes, pendentes, emAndamento, concluidos };
  }, [filteredData]);

  // Get unique values for filters
  const uniqueOms = useMemo(
    () => ['all', ...new Set(allData.map(d => d.om).filter(Boolean))],
    [allData]
  );
  const uniqueOperadores = useMemo(
    () => ['all', ...new Set(allData.map(d => d.operador).filter(Boolean))],
    [allData]
  );

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setOmFilter('all');
    setStatusFilter('all');
    setPrioridadeFilter('all');
    setOperadorFilter('all');
  };

  // Actions
  const handleReparar = async (id: string) => {
    try {
      setIsDataLoading(true);
      await fetchAutenticado(`/api/registros/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'reparado' }),
      });

      showToast('Status atualizado para "Reparado".', 'success');
      await loadData();
    } catch (error: any) {
      showToast(`Erro ao atualizar status: ${error.message}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleCancelar = async (id: string) => {
    try {
      setIsDataLoading(true);
      await fetchAutenticado(`/api/registros/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelado' }),
      });

      showToast('Status atualizado para "Cancelado".', 'success');
      await loadData();
    } catch (error: any) {
      showToast(`Erro ao cancelar: ${error.message}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      setIsDataLoading(true);
      await fetchAutenticado('/api/registros', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [id] }),
      });

      showToast('Registro excluído com sucesso.', 'success');
      await loadData();
      setSelectedItems(new Set());
    } catch (error: any) {
      showToast(`Erro ao excluir registro: ${error.message}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Batch actions
  const handleBatchAction = async (action: 'repair' | 'cancel' | 'delete') => {
    if (selectedItems.size === 0) return;

    const ids = Array.from(selectedItems);

    try {
      setIsDataLoading(true);

      if (action === 'delete') {
        await fetchAutenticado('/api/registros', {
          method: 'DELETE',
          body: JSON.stringify({ ids }),
        });
      } else {
        const status = action === 'repair' ? 'reparado' : 'cancelado';
        // TODO: Implementar batch status update
        // Por enquanto, fazer chamadas individuais
        for (const id of ids) {
          await fetchAutenticado(`/api/registros/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
          });
        }
      }

      showToast(`${ids.length} itens atualizados com sucesso.`, 'success');
      await loadData();
      setSelectedItems(new Set());
    } catch (error: any) {
      showToast(`Erro na ação em lote: ${error.message}`, 'error');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Export
  const exportData = () => {
    const csvContent = [
      [
        'OM',
        'Cod. Alt',
        'Serial',
        'Descrição',
        'Defeito',
        'Prioridade',
        'Status',
        'Operador',
        'Data/Hora',
      ],
      ...filteredData.map(item => [
        item.om || '',
        item.pn || '',
        item.serial || '',
        item.descricao || '',
        item.tipodefeito || '',
        item.prioridade || 'baixa',
        item.status || '',
        item.operador || '',
        new Date(item.createdat).toLocaleString('pt-BR'),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reparos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Dados exportados com sucesso!', 'success');
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetchAutenticado('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  };

  // Utils
  const getPriorityClass = (prioridade?: string) => {
    const map: Record<string, string> = {
      baixa: 'bg-slate-600 text-slate-200',
      media: 'bg-blue-600 text-blue-100',
      alta: 'bg-orange-600 text-orange-100',
      urgente: 'bg-red-600 text-red-100',
    };
    return map[prioridade || 'baixa'] || map.baixa;
  };

  const getPriorityLabel = (prioridade?: string) => {
    const map: Record<string, string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
      urgente: 'Urgente',
    };
    return map[prioridade || 'baixa'] || 'Baixa';
  };

  const getStatusClass = (status?: string) => {
    const map: Record<string, string> = {
      aberto: 'bg-blue-600 text-blue-100',
      em_andamento: 'bg-yellow-600 text-yellow-100',
      reparado: 'bg-green-600 text-green-100',
      cancelado: 'bg-red-600 text-red-100',
    };
    return map[status || 'aberto'] || 'bg-slate-600 text-slate-200';
  };

  const getStatusLabel = (status?: string) => {
    const map: Record<string, string> = {
      aberto: 'Aberto',
      em_andamento: 'Em Andamento',
      reparado: 'Reparado',
      cancelado: 'Cancelado',
    };
    return map[status || 'aberto'] || 'Aberto';
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${min}`;
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
              className="w-10 h-10"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                className="w-full h-full text-orange-400 drop-shadow-lg"
              >
                <g id="Tech_service" data-name="Tech service">
                  <path
                    d="M32,43a15.862,15.862,0,0,0,10.856-4.264c.009-.008.017-.017.025-.025l.01-.01a15.957,15.957,0,0,0,4.192-17.034c-.006-.016-.014-.031-.02-.047l-.007-.017A16.013,16.013,0,0,0,37.1,11.858,6.038,6.038,0,0,0,34.405,9.5,1,1,0,0,0,33,10.41v4.176l-1,1-1-1V10.41A1,1,0,0,0,29.6,9.5a6.039,6.039,0,0,0-2.687,2.351A15.991,15.991,0,0,0,32,43Zm-5.5-8a.5.5,0,0,1,0-1H28a1,1,0,0,0,0-2H26.5a.5.5,0,0,1,0-1H28a1,1,0,0,0,0-2H26.5a.5.5,0,0,1,0-1H28a1,1,0,0,0,0-2H26.5a.5.5,0,0,1,0-1H40V35Zm7.231,2a2,2,0,0,1-3.462,0ZM36,22h.465l.667,1H36Zm6,14.756V23h3.4A13.844,13.844,0,0,1,42,36.756ZM44.635,21H41a1,1,0,0,0-1,1v1h-.465l-1.7-2.555A1,1,0,0,0,37,20H36v-.529A6.038,6.038,0,0,0,38,15a5.885,5.885,0,0,0-.048-.652A14.029,14.029,0,0,1,44.635,21ZM29.293,15.707l2,2a1,1,0,0,0,1.414,0l2-2A1,1,0,0,0,35,15V12.356a4,4,0,0,1-.6,5.845,1,1,0,0,0-.4.8v4H30V19a1,1,0,0,0-.4-.8,4,4,0,0,1-.6-5.845V15A1,1,0,0,0,29.293,15.707Zm-3.245-1.364A5.975,5.975,0,0,0,26,15a6.038,6.038,0,0,0,2,4.471V23H26.5A2.5,2.5,0,0,0,24,25.5a2.471,2.471,0,0,0,.513,1.5,2.449,2.449,0,0,0,0,3,2.449,2.449,0,0,0,0,3A2.471,2.471,0,0,0,24,34.5,2.5,2.5,0,0,0,26.5,37h1.642a3.981,3.981,0,0,0,7.716,0H40v1a.985.985,0,0,0,.088.4A13.873,13.873,0,0,1,32,41a13.991,13.991,0,0,1-5.952-26.657Z"
                    fill="currentColor"
                  />
                  <path
                    d="M8,32h3.6a20.827,20.827,0,0,0,2.446,5.888l-2.552,2.544a1,1,0,0,0,0,1.415l5.66,5.66a1,1,0,0,0,.707.293h0a1,1,0,0,0,.707-.294l2.543-2.551A20.842,20.842,0,0,0,27,47.4V51a1,1,0,0,0,1,1h8a1,1,0,0,0,1-1V47.4a20.842,20.842,0,0,0,5.889-2.446l2.543,2.551a1,1,0,0,0,.707.294h0a1,1,0,0,0,.707-.293l5.66-5.66a1,1,0,0,0,0-1.415l-2.552-2.544A20.827,20.827,0,0,0,52.4,32H56a1,1,0,0,0,1-1V23a1,1,0,0,0-1-1H52.4a20.76,20.76,0,0,0-2.446-5.889l2.552-2.543a1,1,0,0,0,0-1.415l-5.66-5.66A1,1,0,0,0,46.14,6.2h0a1,1,0,0,0-.707.294L42.889,9.046A20.84,20.84,0,0,0,37,6.6V3a1,1,0,0,0-1-1H28a1,1,0,0,0-1,1V6.6a20.84,20.84,0,0,0-5.889,2.446L18.568,6.494a1,1,0,0,0-.707-.294h0a1,1,0,0,0-.707.293l-5.66,5.66a1,1,0,0,0,0,1.415l2.552,2.543A20.76,20.76,0,0,0,11.6,22H8a1,1,0,0,0-1,1v8A1,1,0,0,0,8,32Zm1-8h3.4a1,1,0,0,0,.981-.8,18.81,18.81,0,0,1,2.773-6.677,1,1,0,0,0-.128-1.261l-2.411-2.4,4.244-4.243,2.4,2.41a1,1,0,0,0,1.259.128A18.893,18.893,0,0,1,28.2,8.38,1,1,0,0,0,29,7.4V4h6V7.4a1,1,0,0,0,.8.98,18.893,18.893,0,0,1,6.679,2.774,1,1,0,0,0,1.259-.128l2.4-2.41,4.244,4.243-2.411,2.4a1,1,0,0,0-.128,1.261A18.81,18.81,0,0,1,50.619,23.2a1,1,0,0,0,.981.8H55v6H51.6a1,1,0,0,0-.98.8,18.869,18.869,0,0,1-2.774,6.678,1,1,0,0,0,.128,1.26l2.411,2.4-4.244,4.243-2.4-2.41a1,1,0,0,0-1.259-.128A18.839,18.839,0,0,1,35.8,45.62a1,1,0,0,0-.8.98V50H29V46.6a1,1,0,0,0-.8-.98,18.839,18.839,0,0,1-6.678-2.774,1,1,0,0,0-1.259.128l-2.4,2.41-4.244-4.243,2.411-2.4a1,1,0,0,0,.128-1.26A18.869,18.869,0,0,1,13.38,30.8a1,1,0,0,0-.98-.8H9Z"
                    fill="currentColor"
                  />
                  <path
                    d="M61.316,54.051l-6-2a1,1,0,0,0-.632,0L51.838,53H26V51a1,1,0,0,0-1-1H8A6,6,0,0,0,8,62H25a1,1,0,0,0,1-1V59H51.838l2.846.949a1,1,0,0,0,.632,0l6-2A1,1,0,0,0,62,57V55A1,1,0,0,0,61.316,54.051ZM24,60H8a4,4,0,0,1,0-8H24v8Zm36-3.721-5,1.667-2.684-.895A1,1,0,0,0,52,57H26V55H52a1,1,0,0,0,.316-.051L55,54.054l5,1.667Z"
                    fill="currentColor"
                  />
                  <path d="M21,57H7a1,1,0,0,1,0-2H21a1,1,0,0,1,0,2Z" fill="currentColor" />
                </g>
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Centro de Reparos
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
            <span className="text-slate-200">{user.name || user.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-400">Urgentes</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">{kpis.urgentes}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-orange-400" />
              <h3 className="text-sm font-semibold text-slate-400">Pendentes</h3>
            </div>
            <p className="text-3xl font-bold text-orange-400">{kpis.pendentes}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-6 h-6 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-400">Em Andamento</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{kpis.emAndamento}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h3 className="text-sm font-semibold text-slate-400">Concluídos</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{kpis.concluidos}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por OM, serial, operador..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 pl-10 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <select
              value={omFilter}
              onChange={e => setOmFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
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

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todos os Status</option>
              <option value="aberto">Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="reparado">Reparado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={prioridadeFilter}
              onChange={e => setPrioridadeFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>

            <select
              value={operadorFilter}
              onChange={e => setOperadorFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todos os Operadores</option>
              {uniqueOperadores
                .filter(op => op !== 'all')
                .map(op => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex gap-2 bg-slate-900/50 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'kanban'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 inline mr-2" />
                  Kanban
                </button>
                <button
                  onClick={() => setCurrentView('table')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'table'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="w-4 h-4 inline mr-2" />
                  Tabela
                </button>
                <button
                  onClick={() => setCurrentView('timeline')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'timeline'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Timeline
                </button>
              </div>

              <Button onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Batch Actions */}
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-900 to-red-900 border border-orange-500/30 rounded-xl p-4 mb-6 flex items-center justify-between"
          >
            <span className="text-white font-semibold">
              {selectedItems.size} itens selecionados
            </span>
            <div className="flex gap-2">
              <Button variant="warning" onClick={() => handleBatchAction('repair')}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Reparado
              </Button>
              <Button variant="danger" onClick={() => handleBatchAction('cancel')}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => handleBatchAction('delete')}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </motion.div>
        )}

        {/* Content */}
        {currentView === 'kanban' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Colunas do Kanban */}
              {[
                {
                  status: 'aberto',
                  title: 'Abertos',
                  borderColor: 'border-orange-500/30',
                  badgeBg: 'bg-orange-500/20',
                  badgeBorder: 'border-orange-500/30',
                  badgeText: 'text-orange-400',
                },
                {
                  status: 'em_andamento',
                  title: 'Em Andamento',
                  borderColor: 'border-blue-500/30',
                  badgeBg: 'bg-blue-500/20',
                  badgeBorder: 'border-blue-500/30',
                  badgeText: 'text-blue-400',
                },
                {
                  status: 'reparado',
                  title: 'Reparados',
                  borderColor: 'border-green-500/30',
                  badgeBg: 'bg-green-500/20',
                  badgeBorder: 'border-green-500/30',
                  badgeText: 'text-green-400',
                },
                {
                  status: 'cancelado',
                  title: 'Cancelados',
                  borderColor: 'border-red-500/30',
                  badgeBg: 'bg-red-500/20',
                  badgeBorder: 'border-red-500/30',
                  badgeText: 'text-red-400',
                },
              ].map(col => {
                // Função helper para normalizar status especificamente para o Kanban
                const getKanbanStatus = (status?: string | null) => {
                  if (!status) return 'aberto';
                  const s = status.toLowerCase().trim();

                  // Mapeamentos
                  if (
                    ['aberto', 'pendente', 'requisição_gerada', 'requisicao_gerada'].some(v =>
                      s.includes(v)
                    )
                  )
                    return 'aberto';
                  if (s.includes('andamento')) return 'em_andamento';
                  if (s.includes('reparado') || s.includes('concluido') || s.includes('concluído'))
                    return 'reparado';
                  if (s.includes('cancelado')) return 'cancelado';

                  return 'aberto'; // Fallback: qualquer outro status desconhecido vai para "Abertos"
                };

                const colStatus = col.status; // já é 'aberto', 'em_andamento', etc.

                // Itens desta coluna
                const columnItems = filteredData.filter(
                  d => getKanbanStatus(d.status) === colStatus
                );

                return (
                  <motion.div
                    key={col.status}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`bg-gradient-to-br from-slate-800/90 to-slate-900/90 border ${col.borderColor} rounded-xl p-4 min-h-[500px] shadow-xl`}
                  >
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
                      <h3 className="text-lg font-bold text-white">{col.title}</h3>
                      <span
                        className={`${col.badgeBg} ${col.badgeBorder} border px-3 py-1 rounded-full text-sm font-bold ${col.badgeText}`}
                      >
                        {columnItems.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        // Limitar a 20 itens por coluna para não sobrecarregar
                        return columnItems.length > 0 ? (
                          columnItems.slice(0, 20).map(item => {
                            const getPriorityVariant = (
                              prioridade?: string
                            ): 'danger' | 'warning' | 'info' | 'secondary' => {
                              if (prioridade === 'urgente') return 'danger';
                              if (prioridade === 'alta') return 'warning';
                              if (prioridade === 'media') return 'info';
                              return 'secondary';
                            };

                            return (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-purple-500/30 rounded-xl p-4 cursor-pointer hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
                              >
                                {/* Header com OM e Prioridade */}
                                <div className="flex items-start justify-between mb-3">
                                  <h4 className="font-bold text-white text-lg">{item.om}</h4>
                                  <Badge variant={getPriorityVariant(item.prioridade)} size="sm">
                                    {getPriorityLabel(item.prioridade)}
                                  </Badge>
                                </div>

                                {/* Informações do Item */}
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-semibold min-w-[75px]">
                                      Designador:
                                    </span>
                                    <span className="text-slate-100 font-bold font-mono bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">
                                      {item.designador || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-semibold min-w-[75px]">
                                      Serial:
                                    </span>
                                    <span className="text-slate-300 font-mono">
                                      {item.serial || 'N/A'}
                                    </span>
                                  </div>
                                  {item.pn && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-slate-500 font-semibold min-w-[75px]">
                                        PN:
                                      </span>
                                      <span className="text-slate-300 font-mono">{item.pn}</span>
                                    </div>
                                  )}
                                  {item.tipodefeito && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-slate-500 font-semibold min-w-[75px]">
                                        Defeito:
                                      </span>
                                      <span className="text-slate-300">{item.tipodefeito}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-semibold min-w-[75px]">
                                      Operador:
                                    </span>
                                    <span className="text-slate-300">{item.operador || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 font-semibold min-w-[75px]">
                                      Data:
                                    </span>
                                    <span className="text-slate-300">
                                      {formatDate(item.createdat)}
                                    </span>
                                  </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex gap-2">
                                  {(() => {
                                    const itemStatus = (item.status || 'aberto')
                                      .toLowerCase()
                                      .trim();
                                    // Normalizar status: 'requisição_gerada' e 'pendente' -> 'aberto'
                                    const normalizedStatus =
                                      itemStatus === 'requisição_gerada' ||
                                      itemStatus === 'pendente'
                                        ? 'aberto'
                                        : itemStatus;
                                    return normalizedStatus === 'aberto';
                                  })() && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleReparar(item.id)}
                                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-green-500/20 flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Reparar
                                    </motion.button>
                                  )}
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCancelar(item.id)}
                                    className="w-10 h-10 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg transition-all flex items-center justify-center"
                                    title="Cancelar"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleExcluir(item.id)}
                                    className="w-10 h-10 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/30 hover:border-slate-600/50 text-slate-300 rounded-lg transition-all flex items-center justify-center"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-slate-500 text-sm">
                            Nenhum item nesta coluna
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Nota: Paginação removida do Kanban - exibindo todos os itens filtrados por status (limitado a 20 por coluna) */}
          </>
        )}

        {currentView === 'table' && (
          <section className="bg-gradient-to-b from-[#16243a] to-[#112137] border border-[#314566] rounded-2xl p-6 shadow-2xl">
            {/* Header da Tabela */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#314566]">
              <h3 className="text-lg font-bold text-[#b5c6e3] flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-purple-400" />
                Registros de Reparo
              </h3>
              {selectedItems.size > 0 && (
                <span className="text-sm text-cyan-400 flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  {selectedItems.size} selecionado(s)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse" role="table">
                <thead>
                  <tr className="bg-slate-900/40 text-left">
                    <th className="p-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.size === paginatedData.length && paginatedData.length > 0
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedItems(new Set(paginatedData.map(d => d.id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                        className={`rounded border-2 transition-all cursor-pointer ${
                          selectedItems.size === paginatedData.length && paginatedData.length > 0
                            ? 'border-cyan-400 bg-cyan-500/20 checked:bg-cyan-500'
                            : 'border-[#2a3d5c] bg-[#0f1a2b]'
                        }`}
                        aria-label="Selecionar todos"
                      />
                    </th>
                    {[
                      { key: 'om', label: 'OM' },
                      { key: 'designador', label: 'Designador' },
                      { key: 'partnumber', label: 'Cod. Alt' }, // supondo partnumber ou pn
                      { key: 'serial', label: 'Serial' },
                      { key: 'descricao', label: 'Descrição' },
                      { key: 'tipodefeito', label: 'Defeito' },
                      { key: 'prioridade', label: 'Prioridade' },
                      { key: 'createdat', label: 'Data/Hora' },
                      { key: 'status', label: 'Status' },
                      { key: 'operador', label: 'Operador' },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (sortKey === col.key) {
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortKey(col.key);
                            setSortDir('asc');
                          }
                        }}
                        className="px-3 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide cursor-pointer hover:text-white hover:bg-white/5 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <span className="text-cyan-400">
                              {sortDir === 'asc' ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              )}
                            </span>
                          )}
                          {sortKey !== col.key && (
                            <svg
                              className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                              />
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-xs font-bold text-slate-300 uppercase tracking-wide text-right pr-6">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center p-8 text-slate-500">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`border-b border-white/5 transition-all duration-200 group cursor-pointer ${
                          selectedItems.has(item.id)
                            ? 'bg-cyan-500/10 shadow-[inset_3px_0_0_0_#22d3ee] border-cyan-500/20'
                            : index % 2 === 0
                            ? 'bg-white/[0.02] hover:bg-cyan-500/5 hover:border-cyan-500/30'
                            : 'bg-transparent hover:bg-cyan-500/5 hover:border-cyan-500/30'
                        }`}
                        onClick={() => {
                          const newSelected = new Set(selectedItems);
                          if (newSelected.has(item.id)) {
                            newSelected.delete(item.id);
                          } else {
                            newSelected.add(item.id);
                          }
                          setSelectedItems(newSelected);
                        }}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={e => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedItems);
                                if (e.target.checked) {
                                  newSelected.add(item.id);
                                } else {
                                  newSelected.delete(item.id);
                                }
                                setSelectedItems(newSelected);
                              }}
                              onClick={e => e.stopPropagation()}
                              className={`rounded border-2 transition-all ${
                                selectedItems.has(item.id)
                                  ? 'border-cyan-400 bg-cyan-500/20 checked:bg-cyan-500'
                                  : 'border-[#2a3d5c] bg-[#0f1a2b]'
                              }`}
                            />
                            {selectedItems.has(item.id) && (
                              <span className="text-cyan-400 text-xs">✓</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`font-mono text-base font-bold tracking-wide whitespace-nowrap ${
                              selectedItems.has(item.id) ? 'text-cyan-300' : 'text-white'
                            }`}
                          >
                            {item.om}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {/* Designadores com cores por tipo de componente - mesmo tamanho do defeito */}
                          <div className="flex flex-wrap gap-1.5">
                            {item.designador
                              ?.split(/[,\s]+/)
                              .filter(Boolean)
                              .map((des, i) => {
                                const prefix = des.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || '';
                                const colorMap: Record<string, string> = {
                                  R: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50',
                                  C: 'bg-blue-500/25 text-blue-200 border-blue-500/50',
                                  U: 'bg-purple-500/25 text-purple-200 border-purple-500/50',
                                  Q: 'bg-orange-500/25 text-orange-200 border-orange-500/50',
                                  D: 'bg-yellow-500/25 text-yellow-200 border-yellow-500/50',
                                  L: 'bg-pink-500/25 text-pink-200 border-pink-500/50',
                                  J: 'bg-cyan-500/25 text-cyan-200 border-cyan-500/50',
                                  Y: 'bg-red-500/25 text-red-200 border-red-500/50',
                                  FL: 'bg-teal-500/25 text-teal-200 border-teal-500/50',
                                  F: 'bg-amber-500/25 text-amber-200 border-amber-500/50',
                                  SW: 'bg-indigo-500/25 text-indigo-200 border-indigo-500/50',
                                  LED: 'bg-lime-500/25 text-lime-200 border-lime-500/50',
                                };
                                const colorClass =
                                  colorMap[prefix] ||
                                  'bg-slate-500/25 text-slate-200 border-slate-500/50';
                                return (
                                  <span
                                    key={`${des}-${i}`}
                                    className={`inline-flex items-center px-3 py-1.5 text-sm font-bold font-mono rounded-lg border shadow-sm ${colorClass}`}
                                    title={`Componente: ${des}`}
                                  >
                                    {des}
                                  </span>
                                );
                              }) || <span className="text-slate-500 text-sm">—</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-base font-bold text-amber-300 tracking-wide whitespace-nowrap">
                            {item.pn || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="font-mono text-xs px-2 py-1 rounded bg-slate-800/80 border border-slate-600/50 text-cyan-200 tracking-wider uppercase cursor-help whitespace-nowrap block w-fit"
                            style={{ letterSpacing: '0.15em' }}
                            title={item.serial ? `Serial: ${item.serial}` : ''}
                          >
                            {item.serial
                              ? item.serial.length > 8
                                ? `...${item.serial.slice(-8)}`
                                : item.serial
                              : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="text-sm text-slate-400 italic max-w-[150px] truncate block"
                            title={item.descricao}
                          >
                            {item.descricao || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-bold rounded-lg border shadow-sm whitespace-nowrap ${(() => {
                              const def = (item.tipodefeito || '').toLowerCase();
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
                            {(() => {
                              const def = item.tipodefeito || '—';
                              const map: Record<string, string> = {
                                'Insuficiência de Solda': 'Insuf. Solda',
                                'Excesso de Solda': 'Exces. Solda',
                                'Terminal Levantado': 'Term. Levant.',
                                'Polaridade Incorreta': 'Polar. Incorr.',
                                'Solder Ball': 'Solder Ball',
                              };
                              return map[def] || def;
                            })()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              item.prioridade === 'urgente'
                                ? 'danger'
                                : item.prioridade === 'alta'
                                ? 'warning'
                                : item.prioridade === 'media'
                                ? 'info'
                                : 'secondary'
                            }
                            size="lg"
                          >
                            {getPriorityLabel(item.prioridade)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-sm text-slate-300 tabular-nums">
                            {formatDate(item.createdat)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              normalizeStatus(item.status) === 'reparado'
                                ? 'success'
                                : normalizeStatus(item.status) === 'cancelado'
                                ? 'danger'
                                : normalizeStatus(item.status) === 'em_andamento'
                                ? 'warning'
                                : 'info'
                            }
                            size="lg"
                          >
                            {getStatusLabel(normalizeStatus(item.status))}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-sm text-slate-300 font-medium whitespace-nowrap">
                            {item.operador || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap pr-6">
                          <div
                            className="flex gap-2 justify-end"
                            onClick={e => e.stopPropagation()}
                          >
                            {['aberto', 'pendente', 'requisição_gerada'].includes(
                              (item.status || '').toLowerCase().trim()
                            ) && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleReparar(item.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 transition-all shadow-lg shadow-green-500/10"
                                title="Marcar como Reparado"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleExcluir(item.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 transition-all shadow-lg shadow-red-500/10"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação para Tabela */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              showInfo={true}
            />

            <div className="mt-4 text-xs text-slate-500 text-center">
              Dica: Clique em uma linha para selecionar.
            </div>
          </section>
        )}

        {currentView === 'timeline' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6">
            <div className="space-y-6">
              {paginatedData.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-4 pb-6 border-b border-slate-700 last:border-0 last:pb-0"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                      {(() => {
                        const itemStatus = (item.status || 'aberto').toLowerCase().trim();
                        const normalizedStatus =
                          itemStatus === 'requisição_gerada' || itemStatus === 'pendente'
                            ? 'aberto'
                            : itemStatus;
                        if (normalizedStatus === 'aberto')
                          return <AlertTriangle className="w-5 h-5 text-white" />;
                        if (normalizedStatus === 'em_andamento')
                          return <Settings className="w-5 h-5 text-white" />;
                        if (normalizedStatus === 'reparado')
                          return <CheckCircle className="w-5 h-5 text-white" />;
                        if (normalizedStatus === 'cancelado')
                          return <XCircle className="w-5 h-5 text-white" />;
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white">
                        {item.om} - {item.serial || 'N/A'}
                      </h4>
                      <span className="text-sm text-slate-400">{formatDate(item.createdat)}</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-400">
                      <p>
                        <span className="font-semibold">Defeito:</span> {item.tipodefeito || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Operador:</span> {item.operador || 'N/A'}
                      </p>
                      <p>
                        <span className="font-semibold">Prioridade:</span>{' '}
                        {getPriorityLabel(item.prioridade)}
                      </p>
                      <p>
                        <span className="font-semibold">Status:</span> {getStatusLabel(item.status)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação para Timeline */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              showInfo={true}
            />
          </div>
        )}

        {filteredData.length === 0 && !isDataLoading && (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhum registro encontrado para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Loading Overlay */}
      {isDataLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
}
