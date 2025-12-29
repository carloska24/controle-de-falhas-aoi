'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Search,
  X,
  Archive,
  AlertCircle,
  Package,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  LayoutGrid,
  Table2,
  Bell,
  ArrowLeft,
} from 'lucide-react';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Requisicao } from '@/types/index';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DemoBadge from '@/components/ui/DemoBadge';
import { Trash2 } from 'lucide-react';

export default function AlmoxarifadoPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Data
  const [allData, setAllData] = useState<Requisicao[]>([]);
  const [filteredData, setFilteredData] = useState<Requisicao[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // UI State
  const [currentView, setCurrentView] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [omFilter, setOmFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dataFilter, setDataFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequisicao, setSelectedRequisicao] = useState<Requisicao | null>(null);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requisicaoToDelete, setRequisicaoToDelete] = useState<Requisicao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [hasPending, setHasPending] = useState(false);
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

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
      if (!['admin', 'almoxarifado', 'operator'].includes(parsedUser.role)) {
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
      const data = await fetchAutenticado('/api/requisicoes');
      const requisicoes = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Parse items se vier como string (SQLite)
      const parsedData = requisicoes.map((r: any) => ({
        ...r,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      }));

      // Se estiver em modo demo, incluir todos os dados; caso contrário, filtrar DEMO
      if (isDemoMode && user?.role === 'admin') {
        setAllData(parsedData);
      } else {
        setAllData(parsedData.filter((r: Requisicao) => !r.om?.startsWith('DEMO-')));
      }
      setIsDataLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar requisições:', error);
      showToast(error.message || 'Erro ao carregar requisições', 'error');
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
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.id.toString().includes(search) ||
          r.om.toLowerCase().includes(search) ||
          (r.created_by && r.created_by.toLowerCase().includes(search))
      );
    }

    // OM Filter
    if (omFilter !== 'all') {
      filtered = filtered.filter(r => r.om === omFilter);
    }

    // Status Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Data Filter
    if (dataFilter) {
      const dataReq = new Date(filtered[0]?.created_at).toISOString().split('T')[0];
      filtered = filtered.filter(r => {
        const data = new Date(r.created_at).toISOString().split('T')[0];
        return data === dataFilter;
      });
    }

    setFilteredData(filtered);
  }, [allData, searchTerm, omFilter, statusFilter, dataFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const pendentes = allData.filter(r => r.status === 'pendente').length;
    const separando = allData.filter(r => r.status === 'parcialmente_entregue').length;
    const entregues = allData.filter(r => r.status === 'entregue').length;

    // Calcular tempo médio (apenas entregues hoje)
    const hoje = new Date().setHours(0, 0, 0, 0);
    const entreguesHoje = allData.filter(r => {
      if (r.status !== 'entregue') return false;
      const dataCriacao = new Date(r.created_at).setHours(0, 0, 0, 0);
      return dataCriacao === hoje;
    });

    let tempoMedio = 0;
    if (entreguesHoje.length > 0) {
      const tempos = entreguesHoje.map(r => {
        const criacao = new Date(r.created_at).getTime();
        const agora = Date.now();
        return Math.floor((agora - criacao) / (1000 * 60)); // minutos
      });
      tempoMedio = Math.floor(tempos.reduce((a, b) => a + b, 0) / tempos.length);
    }

    const horas = Math.floor(tempoMedio / 60);
    const minutos = tempoMedio % 60;

    return {
      pendentes,
      separando,
      entregues,
      tempoMedio:
        tempoMedio > 0
          ? `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
          : '00:00',
    };
  }, [allData]);

  // Check for pending notifications
  useEffect(() => {
    const pendentes = allData.filter(r => r.status === 'pendente').length;
    setHasPending(pendentes > 0);

    // Tocar som quando novos pendentes aparecem
    if (pendentes > previousPendingCount && pendentes > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignora erros de autoplay (políticas do navegador)
        });
      }
    }
    setPreviousPendingCount(pendentes);
  }, [allData, previousPendingCount]);

  // Unique OMs
  const uniqueOms = useMemo(() => {
    const oms = Array.from(new Set(allData.map(r => r.om)));
    return ['all', ...oms];
  }, [allData]);

  const clearFilters = () => {
    setSearchTerm('');
    setOmFilter('all');
    setStatusFilter('all');
    setDataFilter('');
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

  const formatElapsed = (createdAt: string) => {
    const agora = Date.now();
    const criacao = new Date(createdAt).getTime();
    const diff = agora - criacao;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (horas >= 24) {
      const dias = Math.floor(horas / 24);
      return `${dias}d ${horas % 24}h`;
    }
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  };

  const isUrgente = (createdAt: string) => {
    const agora = Date.now();
    const criacao = new Date(createdAt).getTime();
    const diff = agora - criacao;
    return diff > 2 * 60 * 60 * 1000; // 2 horas
  };

  const handleLogout = async () => {
    try {
      // Se for admin, a limpeza é feita automaticamente no backend no endpoint /auth/logout
      await fetchAutenticado('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  };

  const openModal = (req: Requisicao) => {
    setSelectedRequisicao(req);
    // Inicializa as quantidades editadas com os valores agrupados por PN
    if (Array.isArray(req.items)) {
      const initialQuantities: Record<string, number> = {};
      const grouped = req.items.reduce((acc: any, item: any) => {
        const pn = item.pn || 'SEM-CODIGO';
        if (!acc[pn]) {
          acc[pn] = 0;
        }
        acc[pn] += item.quantidade_entregue || 0;
        return acc;
      }, {});

      Object.keys(grouped).forEach(pn => {
        initialQuantities[pn] = grouped[pn];
      });

      setEditedQuantities(initialQuantities);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRequisicao(null);
    setEditedQuantities({});
  };

  // Agrupar itens por PN quando uma requisição é selecionada
  const groupedItems = useMemo(() => {
    if (!selectedRequisicao || !Array.isArray(selectedRequisicao.items)) return [];

    const grouped = selectedRequisicao.items.reduce((acc: any, item: any) => {
      const pn = item.pn || 'SEM-CODIGO';
      const designador = item.designador || '';

      if (!acc[pn]) {
        acc[pn] = {
          pn: pn,
          designadores: [],
          descricao: item.descricao || '',
          quantidade_requisitada: 0,
          quantidade_entregue: 0,
          items_originais: [],
        };
      }

      if (designador) {
        acc[pn].designadores.push(designador);
      }
      acc[pn].quantidade_requisitada += item.quantidade_requisitada || 0;
      acc[pn].quantidade_entregue += item.quantidade_entregue || 0;
      acc[pn].items_originais.push(item);

      return acc;
    }, {});

    return Object.values(grouped);
  }, [selectedRequisicao]);

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      pendente: 'bg-red-600 text-red-100',
      parcialmente_entregue: 'bg-yellow-600 text-yellow-100',
      entregue: 'bg-green-600 text-green-100',
    };
    return map[status] || 'bg-slate-600 text-slate-200';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pendente: 'Pendente',
      parcialmente_entregue: 'Parcialmente Entregue',
      entregue: 'Entregue',
    };
    return map[status] || status;
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await fetchAutenticado(`/api/requisicoes/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      showToast(`Status atualizado para '${getStatusLabel(status)}'`, 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar status', 'error');
    }
  };

  const handleSaveItems = async () => {
    if (!selectedRequisicao || !Array.isArray(selectedRequisicao.items)) {
      return;
    }

    try {
      // Mapear quantidades editadas para os itens agrupados
      // Distribuir a quantidade agrupada proporcionalmente entre os itens originais
      const updatedItems = groupedItems.flatMap((groupedItem: any) => {
        const itemKey = groupedItem.pn;
        const qtdEntregueTotal = editedQuantities[itemKey] ?? groupedItem.quantidade_entregue;

        // Se não há designadores diferentes, distribuir igualmente
        if (groupedItem.items_originais.length === 1) {
          return [
            {
              ...groupedItem.items_originais[0],
              quantidade_entregue: qtdEntregueTotal,
            },
          ];
        }

        // Distribuir proporcionalmente entre os itens originais
        const qtdPorItem = Math.floor(qtdEntregueTotal / groupedItem.items_originais.length);
        const resto = qtdEntregueTotal % groupedItem.items_originais.length;

        return groupedItem.items_originais.map((item: any, idx: number) => ({
          ...item,
          quantidade_entregue: qtdPorItem + (idx < resto ? 1 : 0),
        }));
      });

      // Salva itens
      await fetchAutenticado(`/api/requisicoes/${selectedRequisicao.id}/itens`, {
        method: 'PUT',
        body: JSON.stringify({ items: updatedItems }),
      });

      showToast('Quantidades salvas com sucesso!', 'success');
      closeModal();
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar itens', 'error');
    }
  };

  const handleQuickDeliver = (pn: string, qtdRequisitada: number) => {
    setEditedQuantities(prev => ({
      ...prev,
      [pn]: qtdRequisitada,
    }));
  };

  // Delete Requisicao
  const handleDeleteClick = (req: Requisicao) => {
    setRequisicaoToDelete(req);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requisicaoToDelete) return;

    setIsDeleting(true);
    try {
      // fetchAutenticado retorna null para status 204 (No Content), o que indica sucesso
      const response = await fetchAutenticado(`/api/requisicoes/${requisicaoToDelete.id}`, {
        method: 'DELETE',
      });

      // Se chegou aqui sem erro, a requisição foi bem-sucedida
      // (response será null para 204, ou um objeto para 200)
      showToast('Requisição excluída com sucesso', 'success');
      setDeleteConfirmOpen(false);
      setRequisicaoToDelete(null);
      loadData(); // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao excluir requisição:', error);
      showToast(error.message || 'Erro ao excluir requisição', 'error');
    } finally {
      setIsDeleting(false);
    }
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
              <Archive className="w-6 h-6 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Gestão de Requisições
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
            {hasPending && (
              <motion.div
                animate={{
                  rotate: [0, -15, 15, -15, 15, 0],
                  scale: [1, 1.1, 1, 1.1, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: 'easeInOut',
                }}
                className="relative"
              >
                <Bell className="w-6 h-6 text-red-500" />
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.4,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">!</span>
                </motion.span>
              </motion.div>
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
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-red-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-400">Pendentes</h3>
            </div>
            <p className="text-3xl font-bold text-red-400">{kpis.pendentes}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-yellow-400" />
              <h3 className="text-sm font-semibold text-slate-400">Separando</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{kpis.separando}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              <h3 className="text-sm font-semibold text-slate-400">Entregues</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{kpis.entregues}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-400">Tempo Médio</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{kpis.tempoMedio}</p>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por ID, OM, Solicitante..."
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
              <option value="pendente">Pendente</option>
              <option value="parcialmente_entregue">Parcialmente Entregue</option>
              <option value="entregue">Entregue</option>
            </select>

            <input
              type="date"
              value={dataFilter}
              onChange={e => setDataFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            />
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
                  className={`px-4 py-2 rounded-md transition-colors ${
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
                  className={`px-4 py-2 rounded-md transition-colors ${
                    currentView === 'table'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table2 className="w-4 h-4 inline mr-2" />
                  Tabela
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content - Kanban */}
        {currentView === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { status: 'pendente', title: 'Pendentes', color: 'red' },
              { status: 'parcialmente_entregue', title: 'Separando', color: 'yellow' },
              { status: 'entregue', title: 'Entregues', color: 'green' },
            ].map(col => {
              const colData = filteredData.filter(d => d.status === col.status);
              return (
                <div
                  key={col.status}
                  className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-${col.color}-500/20 rounded-xl p-4 min-h-[500px]`}
                >
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-slate-200">{col.title}</h3>
                    <span className="bg-slate-900 px-3 py-1 rounded-full text-sm font-semibold">
                      {colData.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {colData
                      .sort((a, b) => {
                        const urgenteA = isUrgente(a.created_at);
                        const urgenteB = isUrgente(b.created_at);
                        if (urgenteA !== urgenteB) return urgenteB ? 1 : -1;
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                      })
                      .map(req => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
                            isUrgente(req.created_at)
                              ? 'border-red-500/50 hover:border-red-500'
                              : 'border-purple-500/20 hover:border-purple-500/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-white">#{req.id}</h4>
                            <Badge className={getStatusClass(req.status)}>
                              {getStatusLabel(req.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-slate-400 mb-3">
                            <p>
                              <span className="font-semibold">OM:</span> {req.om}
                            </p>
                            <p>
                              <span className="font-semibold">Solicitante:</span>{' '}
                              {req.created_by || 'N/A'}
                            </p>
                            <p>
                              <span className="font-semibold">Data:</span>{' '}
                              {formatDate(req.created_at)}
                            </p>
                            <p>
                              <span className="font-semibold">Tempo:</span>{' '}
                              {formatElapsed(req.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(req)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                              <Eye className="w-4 h-4 inline mr-1" />
                              Ver Itens
                            </button>
                            {req.status === 'pendente' && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'parcialmente_entregue')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {req.status === 'parcialmente_entregue' && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'entregue')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {req.status === 'entregue' && (
                              <button
                                onClick={() => handleDeleteClick(req)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                title="Excluir Requisição"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Content - Tabela */}
        {currentView === 'table' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-left">
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      ID
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      OM
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      Data
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      Solicitante
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      Status
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      Tempo
                    </th>
                    <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="">
                  {filteredData.map((req, index) => {
                    const urgente = isUrgente(req.created_at);
                    const statusClass = getStatusClass(req.status);

                    return (
                      <tr
                        key={req.id}
                        className={`group border-b border-slate-700/50 hover:bg-slate-800/60 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'
                        }`}
                      >
                        <td className="p-5">
                          <span className="font-mono text-base font-bold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700">
                            #{req.id}
                          </span>
                        </td>
                        <td className="p-5">
                          <p className="font-mono text-base font-bold text-cyan-400 bg-cyan-950/30 px-3 py-1.5 rounded border border-cyan-500/20 inline-block">
                            {req.om}
                          </p>
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-sm text-slate-300 font-medium">
                              {new Date(req.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(req.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-slate-300 font-bold border border-slate-600">
                              {(req.created_by || 'S')[0].toUpperCase()}
                            </div>
                            <span className="text-base text-slate-400 group-hover:text-slate-200 transition-colors font-medium">
                              {req.created_by || 'Sistema'}
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <Badge
                            className={`${statusClass} shadow-sm border border-white/5 text-sm px-3 py-1`}
                          >
                            {getStatusLabel(req.status)}
                          </Badge>
                        </td>
                        <td className="p-5 align-middle">
                          <span
                            className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full w-fit ${
                              urgente
                                ? 'text-red-300 bg-red-900/30 border border-red-500/30 animate-pulse'
                                : 'text-slate-400 bg-slate-800/50 border border-slate-700'
                            }`}
                          >
                            <Clock
                              className={`w-4 h-4 ${urgente ? 'text-red-400' : 'text-slate-500'}`}
                            />
                            {formatElapsed(req.created_at)}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(req)}
                              className="text-blue-400 hover:text-white hover:bg-blue-600 transition-all p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-sm hover:shadow-blue-500/20"
                              title="Ver Itens"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            {req.status === 'pendente' && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'parcialmente_entregue')}
                                className="text-yellow-400 hover:text-white hover:bg-yellow-600 transition-all p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-sm hover:shadow-yellow-500/20"
                                title="Iniciar Separação"
                              >
                                <Package className="w-5 h-5" />
                              </button>
                            )}
                            {(req.status === 'pendente' ||
                              req.status === 'parcialmente_entregue') && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'entregue')}
                                className="text-green-400 hover:text-white hover:bg-green-600 transition-all p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-sm hover:shadow-green-500/20"
                                title="Finalizar Entrega"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                            )}
                            {req.status === 'entregue' && (
                              <button
                                onClick={() => handleDeleteClick(req)}
                                className="text-red-400 hover:text-white hover:bg-red-600 transition-all p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-sm hover:shadow-red-500/20"
                                title="Arquivar/Excluir"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredData.length === 0 && !isDataLoading && (
          <div className="text-center py-12 text-slate-400">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhuma requisição encontrada para os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={`Requisição #${selectedRequisicao?.id}`}
        size="lg"
        icon={<Package className="w-5 h-5 text-purple-400" />}
      >
        {selectedRequisicao && (
          <div className="space-y-6">
            {/* Informações da Requisição */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    OM
                  </span>
                  <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-black text-3xl tracking-tighter drop-shadow-sm">
                    {selectedRequisicao.om}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Solicitante
                  </span>
                  <p className="text-white font-semibold">
                    {selectedRequisicao.created_by || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Data
                  </span>
                  <p className="text-white font-semibold">
                    {formatDate(selectedRequisicao.created_at)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </span>
                  <Badge className={getStatusClass(selectedRequisicao.status)}>
                    {getStatusLabel(selectedRequisicao.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Itens da Requisição */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-bold text-white">Itens da Requisição</h4>
                <span className="ml-auto text-sm text-slate-400">
                  {groupedItems.length} item(ns) agrupado(s)
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {groupedItems.map((groupedItem: any, idx: number) => {
                  const itemKey = groupedItem.pn;
                  const qtdEntregue = editedQuantities[itemKey] ?? groupedItem.quantidade_entregue;
                  const isDelivered = qtdEntregue >= groupedItem.quantidade_requisitada;
                  const progressPercent =
                    groupedItem.quantidade_requisitada > 0
                      ? (qtdEntregue / groupedItem.quantidade_requisitada) * 100
                      : 0;

                  // Remove designadores da descrição se houver
                  const descricaoLimpa = groupedItem.descricao
                    ? groupedItem.descricao.replace(/\s*\([^)]*\)\s*$/, '').trim()
                    : '';
                  const designadoresUnicos = [...new Set(groupedItem.designadores)].sort();
                  const designadoresStr = designadoresUnicos.join(', ');

                  return (
                    <motion.div
                      key={itemKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="text-white font-black text-xl tracking-wide bg-slate-900/80 px-3 py-1 rounded-lg border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)] font-mono">
                              {groupedItem.pn}
                            </p>
                            {designadoresStr && (
                              <div className="flex flex-wrap gap-0.5">
                                {designadoresStr
                                  .split(/[,\s]+/)
                                  .filter(Boolean)
                                  .map((des, i) => {
                                    const prefix =
                                      des.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || '';
                                    const colorMap: Record<string, string> = {
                                      R: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                                      C: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                                      U: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
                                      Q: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                                      D: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
                                      L: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
                                      J: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
                                      Y: 'bg-red-500/20 text-red-400 border-red-500/40',
                                      FL: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
                                      F: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                                      SW: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
                                      LED: 'bg-lime-500/20 text-lime-400 border-lime-500/40',
                                    };
                                    const colorClass =
                                      colorMap[prefix] ||
                                      'bg-slate-500/20 text-slate-300 border-slate-500/40';
                                    return (
                                      <span
                                        key={`${des}-${i}`}
                                        className={`inline-flex items-center px-1 py-px text-[10px] font-medium rounded border ${colorClass}`}
                                        title={`Componente: ${des}`}
                                      >
                                        {des}
                                      </span>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          {descricaoLimpa && (
                            <p className="text-slate-200 text-base font-medium leading-relaxed border-l-2 border-slate-600 pl-3 py-0.5">
                              {descricaoLimpa}
                            </p>
                          )}
                        </div>
                        <Badge variant={isDelivered ? 'success' : 'warning'}>
                          {isDelivered ? 'Entregue' : 'Pendente'}
                        </Badge>
                      </div>

                      {/* Barra de progresso */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-400">Progresso</span>
                          <span className="text-sm font-bold text-slate-200">
                            {qtdEntregue} / {groupedItem.quantidade_requisitada}
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${
                              isDelivered
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Controles de entrega */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Quantidade Entregue
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={groupedItem.quantidade_requisitada}
                            value={qtdEntregue}
                            onChange={e => {
                              const value = Math.max(
                                0,
                                Math.min(
                                  groupedItem.quantidade_requisitada,
                                  parseInt(e.target.value) || 0
                                )
                              );
                              setEditedQuantities(prev => ({ ...prev, [itemKey]: value }));
                            }}
                            disabled={isDelivered}
                            className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-semibold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          />
                          {!isDelivered && (
                            <button
                              onClick={() => {
                                setEditedQuantities(prev => ({
                                  ...prev,
                                  [itemKey]: groupedItem.quantidade_requisitada,
                                }));
                              }}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg transition-all shadow-lg hover:shadow-green-500/20"
                              title="Entregar quantidade total"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="border-t border-slate-700/50 pt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button variant="success" onClick={handleSaveItems}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar Entregas
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRequisicaoToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a requisição #${requisicaoToDelete?.id}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Audio para notificações */}
      <audio ref={audioRef} preload="auto" src="/sounds/notification.mp3">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}
