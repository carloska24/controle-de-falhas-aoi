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
  BellOff,
  ArrowLeft,
} from 'lucide-react';
import { fetchAutenticado, encerrarSessao, fetchListaCompleta } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Requisicao } from '@/types/index';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import DemoBadge from '@/components/ui/DemoBadge';
import { Trash2 } from 'lucide-react';
import { filterWarehouseRequests, validWarehouseDay } from '@/lib/warehouseFilters';
import DeliveryDialog from '@/components/warehouse/DeliveryDialog';

export default function AlmoxarifadoPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Data
  const [allData, setAllData] = useState<Requisicao[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // UI State
  const [currentView, setCurrentView] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggingReqId, setDraggingReqId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Filters
  const [omFilter, setOmFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dataFilter, setDataFilter] = useState('');
  const invalidDateFilter = !validWarehouseDay(dataFilter);
  const filteredData = useMemo(() => filterWarehouseRequests(allData, {
    search: searchTerm, om: omFilter, status: statusFilter, day: dataFilter,
  }), [allData, searchTerm, omFilter, statusFilter, dataFilter]);

  // Delivery workflow is owned by its modal; the page retains the confirmed queue.
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequisicao, setSelectedRequisicao] = useState<Requisicao | null>(null);

  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requisicaoToDelete, setRequisicaoToDelete] = useState<Requisicao | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteAttemptFailed, setDeleteAttemptFailed] = useState(false);
  const deletePending = useRef(false);

  // Notifications
  const [hasPending, setHasPending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previousPendingCount, setPreviousPendingCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check URL for demo mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsDemoMode(urlParams.get('demo') === 'true');
    }
  }, []);

  // Preferência local de som do alerta
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('almoxarifado_sound_enabled');
    if (saved !== null) {
      setSoundEnabled(saved === 'true');
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
    setLoadError('');
    try {
      const requisicoes = await fetchListaCompleta<Requisicao>('/api/requisicoes');

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
      setLoadError(error.message || 'Não foi possível consultar as requisições.');
      showToast(error.message || 'Erro ao carregar requisições', 'error');
      setIsDataLoading(false);
    }
  }, [showToast, isDemoMode, user?.role]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

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
    if (soundEnabled && pendentes > previousPendingCount && pendentes > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignora erros de autoplay (políticas do navegador)
        });
      }
    }
    setPreviousPendingCount(pendentes);
  }, [allData, previousPendingCount, soundEnabled]);

  const handleToggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('almoxarifado_sound_enabled', String(next));
      }
      showToast(next ? 'Som de alerta ativado' : 'Som de alerta desativado', 'info');
      return next;
    });
  };

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
    if (!Number.isFinite(d.getTime())) return 'Data inválida';
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatElapsed = (createdAt: string) => {
    const agora = Date.now();
    const criacao = new Date(createdAt).getTime();
    if (!Number.isFinite(criacao)) return '—';
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
      await encerrarSessao();
    } catch (error: any) {
      showToast(error.message || 'Não foi possível encerrar a sessão. Tente novamente antes de deixar o terminal.', 'error');
    }
  };

  const openModal = (req: Requisicao) => {
    if (modalOpen || deleteConfirmOpen) return;
    setSelectedRequisicao(req);
    setModalOpen(true);
  };

  const closeDelivery = () => {
    setModalOpen(false);
    setSelectedRequisicao(null);
  };

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

  const handleStatusUpdate = (id: number, _status: string) => {
    const request = allData.find(item => item.id === id);
    if (!request) return;
    openModal(request);
    showToast('Confira as quantidades entregues. O status será calculado ao confirmar.', 'info');
  };

  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>, reqId: number) => {
    e.dataTransfer.setData('text/plain', String(reqId));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingReqId(reqId);
  };

  const handleCardDragEnd = () => {
    setDraggingReqId(null);
    setDragOverStatus(null);
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleColumnDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: string) => {
    e.preventDefault();
    const reqIdRaw = e.dataTransfer.getData('text/plain');
    const reqId = Number(reqIdRaw);
    if (!Number.isFinite(reqId)) {
      setDraggingReqId(null);
      setDragOverStatus(null);
      return;
    }

    const req = allData.find(r => r.id === reqId);
    if (req && req.status !== targetStatus) {
      handleStatusUpdate(reqId, targetStatus);
    }

    setDraggingReqId(null);
    setDragOverStatus(null);
  };

  const handleDeleteClick = (req: Requisicao) => {
    if (deletePending.current || modalOpen) return;
    setRequisicaoToDelete(req);
    setDeleteReason('');
    setDeleteError('');
    setDeleteAttemptFailed(false);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requisicaoToDelete || deletePending.current || deleteAttemptFailed) return;
    if (deleteReason.trim().length < 5) {
      setDeleteError('Informe o motivo da exclusão com pelo menos 5 caracteres.');
      return;
    }

    deletePending.current = true;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await fetchAutenticado(`/api/requisicoes/${requisicaoToDelete.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ version: requisicaoToDelete.version, motivo: deleteReason.trim() }),
        signal: AbortSignal.timeout(10000),
      });

      // Se chegou aqui sem erro, a requisição foi bem-sucedida
      // (response será null para 204, ou um objeto para 200)
      showToast('Requisição excluída. Histórico preservado no registro de exclusões.', 'success');
      setDeleteConfirmOpen(false);
      setRequisicaoToDelete(null);
      loadData(); // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao excluir requisição:', error);
      setDeleteAttemptFailed(true);
      setDeleteError(`${error.message || 'Não foi possível confirmar a exclusão.'} Feche esta confirmação e atualize a lista antes de tentar novamente.`);
      void loadData();
    } finally {
      deletePending.current = false;
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
    <div className="app-shell-bg">
      {/* Header */}
      <div className="app-shell-header">
        <div className="app-shell-container py-4 flex items-center justify-between">
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
            <motion.button
              onClick={handleToggleSound}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`relative inline-flex items-center justify-center rounded-xl border px-2.5 py-2 transition-all ${
                soundEnabled
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/60'
                  : 'border-slate-600/60 bg-slate-800/70 text-slate-300 hover:border-slate-500/80'
              } ${hasPending && soundEnabled ? 'shadow-lg shadow-cyan-500/10' : ''}`}
              title={soundEnabled ? 'Desativar som de alerta' : 'Ativar som de alerta'}
              aria-label={soundEnabled ? 'Desativar som de alerta' : 'Ativar som de alerta'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {hasPending && soundEnabled && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-400" />
              )}
            </motion.button>
            <span className="text-slate-300">{user.name || user.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="app-shell-container py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="app-card p-6"
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
            className="app-card p-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-yellow-400" />
              <h3 className="text-sm font-semibold text-slate-400">Parcialmente Entregues</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{kpis.separando}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="app-card p-6"
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
            className="app-card p-6"
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
          className="app-card p-6 mb-6"
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
              aria-label="Data da requisição (horário de Brasília)"
              aria-invalid={invalidDateFilter}
              aria-describedby={invalidDateFilter ? 'warehouse-date-error' : undefined}
              title="Data da requisição no horário de Brasília"
              value={dataFilter}
              onChange={e => setDataFilter(e.target.value)}
              className="bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>
          {invalidDateFilter && (
            <p id="warehouse-date-error" role="alert" className="text-sm text-red-400 mb-4">
              Informe uma data válida ou limpe o filtro.
            </p>
          )}

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
              {
                status: 'pendente',
                title: 'Pendentes',
                baseClass: 'border-red-500/20',
                activeClass: 'border-red-400/60 ring-2 ring-red-500/25',
              },
              {
                status: 'parcialmente_entregue',
                title: 'Parcialmente Entregues',
                baseClass: 'border-yellow-500/20',
                activeClass: 'border-yellow-400/60 ring-2 ring-yellow-500/25',
              },
              {
                status: 'entregue',
                title: 'Entregues',
                baseClass: 'border-green-500/20',
                activeClass: 'border-green-400/60 ring-2 ring-green-500/25',
              },
            ].map(col => {
              const colData = filteredData.filter(d => d.status === col.status);
              const isDropTarget = dragOverStatus === col.status;
              return (
                <div
                  key={col.status}
                  onDragOver={e => handleColumnDragOver(e, col.status)}
                  onDrop={e => handleColumnDrop(e, col.status)}
                  onDragLeave={() => setDragOverStatus(prev => (prev === col.status ? null : prev))}
                  className={`bg-gradient-to-br from-slate-800 to-slate-900 border rounded-xl p-4 min-h-[500px] transition-all ${
                    isDropTarget ? col.activeClass : col.baseClass
                  }`}
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
                          draggable={!modalOpen}
                          onDragStart={(e: any) => handleCardDragStart(e, req.id)}
                          onDragEnd={handleCardDragEnd}
                          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
                            isUrgente(req.created_at)
                              ? 'border-red-500/50 hover:border-red-500'
                              : 'border-purple-500/20 hover:border-purple-500/50'
                          } ${
                            draggingReqId === req.id ? 'opacity-50 ring-2 ring-cyan-400/60' : 'opacity-100'
                          } ${modalOpen ? 'pointer-events-none opacity-60' : ''}`}
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
                              {new Date(req.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(req.created_at).toLocaleTimeString('pt-BR', {
                                timeZone: 'America/Sao_Paulo',
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
                                title="Conferir entrega parcial"
                              >
                                <Package className="w-5 h-5" />
                              </button>
                            )}
                            {(req.status === 'pendente' ||
                              req.status === 'parcialmente_entregue') && (
                              <button
                                onClick={() => handleStatusUpdate(req.id, 'entregue')}
                                className="text-green-400 hover:text-white hover:bg-green-600 transition-all p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-sm hover:shadow-green-500/20"
                                title="Conferir entrega total"
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

        {loadError && !isDataLoading && (
          <div role="alert" className="text-center py-6 text-red-400">
            <p>{loadError}</p>
            <Button variant="outline" className="mt-3" onClick={() => void loadData()}>
              Tentar novamente
            </Button>
          </div>
        )}
        {filteredData.length === 0 && !isDataLoading && !loadError && !invalidDateFilter && (
          <div role="status" className="text-center py-12 text-slate-400">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Nenhuma requisição encontrada para os filtros selecionados.</p>
            {(searchTerm || omFilter !== 'all' || statusFilter !== 'all' || dataFilter) && (
              <Button variant="outline" className="mt-3" onClick={clearFilters}>
                Limpar filtros e mostrar todas
              </Button>
            )}
          </div>
        )}
      </div>

      {modalOpen && selectedRequisicao && <DeliveryDialog
        request={selectedRequisicao}
        actorName={user?.name || user?.username || user?.email || 'Usuário autenticado'}
        canEdit={['admin', 'almoxarifado'].includes(user?.role)}
        onClose={closeDelivery}
        onSaved={saved => {
          setAllData(current => current.map(item => item.id === saved.id ? saved : item));
          closeDelivery();
          showToast('Quantidades confirmadas. Histórico e lista atualizados.', 'success');
        }}
      />}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (deletePending.current) return;
          setDeleteConfirmOpen(false);
          setRequisicaoToDelete(null);
        }}
        title={`Excluir requisição #${requisicaoToDelete?.id}`}
        size="sm"
        icon={<Trash2 className="h-5 w-5 text-red-400" />}
      >
        <div className="space-y-4">
          <p className="text-slate-300">OM: {requisicaoToDelete?.om}. A requisição será removida da lista, com seus itens e vínculos. Uma cópia das entregas e o motivo ficarão no registro de exclusões.</p>
          <p className="text-slate-300">As falhas de origem serão mantidas e poderão gerar nova requisição. A exclusão não registra devolução física de componentes.</p>
          <p className="text-sm text-amber-300">Requisições com entregas ou histórico só podem ser excluídas pelo administrador.</p>
          <div>
            <label htmlFor="request-delete-reason" className="block text-sm mb-2">Motivo da exclusão</label>
            <textarea id="request-delete-reason" value={deleteReason} maxLength={500} disabled={isDeleting || deleteAttemptFailed}
              onChange={event => { setDeleteReason(event.target.value); setDeleteError(''); }}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2" rows={3} />
          </div>
          {deleteError && <p role="alert" className="text-red-400">{deleteError}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="outline" disabled={isDeleting} onClick={() => { setDeleteConfirmOpen(false); setRequisicaoToDelete(null); }}>Cancelar</Button>
            <Button variant="danger" isLoading={isDeleting} disabled={deleteAttemptFailed} onClick={handleDeleteConfirm}>Excluir requisição</Button>
          </div>
        </div>
      </Dialog>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Audio para notificações */}
      <audio ref={audioRef} preload="auto" src="/sounds/notification.mp3">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}
