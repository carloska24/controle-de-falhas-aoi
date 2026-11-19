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

interface DeliveryReview {
  id: number;
  om: string;
  version: number;
  status: string;
  items: { pn: string; requested: number; before: number; quantidade_entregue: number }[];
}

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

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [deliveryReview, setDeliveryReview] = useState<DeliveryReview | null>(null);
  const [deliveryReason, setDeliveryReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const deliveryPending = useRef(false);
  const [selectedRequisicao, setSelectedRequisicao] = useState<Requisicao | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<{
    version: number; actorName: string; occurredAt: string; motivo: string | null;
    antes: { items: { pn: string; quantidade_entregue: number }[] };
    depois: { items: { pn: string; quantidade_entregue: number }[] };
  }[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    if (!selectedRequisicao) return;
    const controller = new AbortController();
    setDeliveryHistory(null);
    setHistoryError('');
    fetchAutenticado(`/api/requisicoes/${selectedRequisicao.id}/entregas`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setDeliveryHistory(result.data); })
      .catch(() => { if (!controller.signal.aborted) setHistoryError('Não foi possível consultar o histórico. Reabra a requisição para tentar novamente.'); });
    return () => controller.abort();
  }, [selectedRequisicao?.id]);
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [initialEditedQuantities, setInitialEditedQuantities] = useState<Record<string, number>>({});
  const [modalSearch, setModalSearch] = useState('');
  const [showOnlyPendingItems, setShowOnlyPendingItems] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const modalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
    if (deliveryPending.current || deliveryReview) return;
    setSelectedRequisicao(req);
    // Inicializa as quantidades editadas com os valores agrupados por PN
    if (Array.isArray(req.items)) {
      const initialQuantities: Record<string, number> = Object.create(null);
      const grouped = req.items.reduce((acc: any, item: any) => {
        const pn = item.pn || 'SEM-CODIGO';
        if (!acc[pn]) {
          acc[pn] = 0;
        }
        acc[pn] += item.quantidade_entregue || 0;
        return acc;
      }, Object.create(null));

      Object.keys(grouped).forEach(pn => {
        initialQuantities[pn] = grouped[pn];
      });

      setEditedQuantities(initialQuantities);
      setInitialEditedQuantities(initialQuantities);
    }
    setModalSearch('');
    setShowOnlyPendingItems(false);
    setHasUnsavedChanges(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (deliveryPending.current || deliveryReview) return;
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm(
        'Existem alterações não salvas. Deseja fechar mesmo assim?'
      );
      if (!shouldClose) return;
    }
    setModalOpen(false);
    setSelectedRequisicao(null);
    setEditedQuantities({});
    setInitialEditedQuantities({});
    setModalSearch('');
    setShowOnlyPendingItems(false);
    setHasUnsavedChanges(false);
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
    }, Object.create(null));

    return Object.values(grouped);
  }, [selectedRequisicao]);

  useEffect(() => {
    if (!modalOpen) return;
    const hasChanges =
      JSON.stringify(editedQuantities) !== JSON.stringify(initialEditedQuantities);
    setHasUnsavedChanges(hasChanges);
  }, [editedQuantities, initialEditedQuantities, modalOpen]);

  const filteredGroupedItems = useMemo(() => {
    if (!Array.isArray(groupedItems) || groupedItems.length === 0) return [];

    const search = modalSearch.trim().toLowerCase();

    return groupedItems.filter((item: any) => {
      const itemKey = item.pn;
      const qtdEntregue = editedQuantities[itemKey] ?? item.quantidade_entregue;
      const isPending = qtdEntregue < item.quantidade_requisitada;

      if (showOnlyPendingItems && !isPending) return false;

      if (!search) return true;
      const designadores = Array.isArray(item.designadores) ? item.designadores.join(' ') : '';
      const searchable = `${item.pn || ''} ${item.descricao || ''} ${designadores}`.toLowerCase();
      return searchable.includes(search);
    });
  }, [groupedItems, editedQuantities, modalSearch, showOnlyPendingItems]);

  const modalSummary = useMemo(() => {
    if (!Array.isArray(groupedItems) || groupedItems.length === 0) {
      return { totalItens: 0, pendentes: 0, progresso: 0, projectedStatus: 'pendente' };
    }

    let totalItens = groupedItems.length;
    let pendentes = 0;
    let deliveredGroups = 0;

    groupedItems.forEach((item: any) => {
      const itemKey = item.pn;
      const qtdEntregue = editedQuantities[itemKey] ?? item.quantidade_entregue;
      const isDelivered = qtdEntregue >= item.quantidade_requisitada;
      if (!isDelivered) pendentes += 1;
      if (qtdEntregue > 0) deliveredGroups += 1;
    });

    const progresso = totalItens > 0 ? Math.round(((totalItens - pendentes) / totalItens) * 100) : 0;
    let projectedStatus = 'pendente';
    if (pendentes === 0 && deliveredGroups > 0) projectedStatus = 'entregue';
    else if (deliveredGroups > 0) projectedStatus = 'parcialmente_entregue';

    return { totalItens, pendentes, progresso, projectedStatus };
  }, [groupedItems, editedQuantities]);

  const handleFillPendingAsDelivered = () => {
    const next: Record<string, number> = Object.create(null);
    groupedItems.forEach((item: any) => {
      next[item.pn] = item.quantidade_requisitada;
    });
    setEditedQuantities(prev => ({ ...prev, ...next }));
  };

  const handleResetEdits = () => {
    setEditedQuantities(initialEditedQuantities);
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

  const handleSaveItems = async () => {
    if (!selectedRequisicao || deliveryReview || deliveryPending.current) return;
    if (!Number.isInteger(selectedRequisicao.version)) {
      showToast('Atualize a lista antes de conferir esta requisição.', 'error');
      return;
    }
    const items = groupedItems.map((item: any) => ({
      pn: item.pn,
      requested: item.quantidade_requisitada,
      before: item.quantidade_entregue,
      quantidade_entregue: editedQuantities[item.pn] ?? item.quantidade_entregue,
    }));
    if (items.some(item => !Number.isSafeInteger(item.quantidade_entregue)
      || item.quantidade_entregue < 0 || item.quantidade_entregue > item.requested)) {
      showToast('Confira as quantidades. Use números inteiros entre zero e o total requisitado.', 'error');
      return;
    }
    setDeliveryError('');
    setDeliveryReason('');
    setReasonError('');
    setDeliveryReview({ id: selectedRequisicao.id, om: selectedRequisicao.om,
      version: selectedRequisicao.version, status: modalSummary.projectedStatus, items });
  };

  const confirmDelivery = async () => {
    if (!deliveryReview || deliveryPending.current || deliveryError) return;
    if (deliveryReview.items.some(item => item.quantidade_entregue < item.before) && !deliveryReason.trim()) {
      setReasonError('Informe o motivo da correção de quantidades já entregues.');
      return;
    }
    deliveryPending.current = true;
    setSavingDelivery(true);
    try {
      const saved = await fetchAutenticado(`/api/requisicoes/${deliveryReview.id}/itens`, {
        method: 'PUT', signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ version: deliveryReview.version, motivo: deliveryReason,
          items: deliveryReview.items.map(item => ({ pn: item.pn, quantidade_entregue: item.quantidade_entregue })) }),
      });
      setAllData(current => current.map(item => item.id === saved.id ? saved : item));
      setDeliveryReview(null);
      setModalOpen(false);
      setSelectedRequisicao(null);
      setHasUnsavedChanges(false);
      showToast('Entregas confirmadas. Histórico e quantidades atualizados.', 'success');
    } catch (error: any) {
      setDeliveryError(error.status === 400 || error.status === 409 ? error.message
        : 'Não foi possível confirmar a entrega. Atualize a lista para conferir o resultado antes de tentar novamente.');
    } finally {
      deliveryPending.current = false;
      setSavingDelivery(false);
    }
  };

  const handleQuantityInputKeyDown = useCallback(
    (itemKey: string, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const currentIndex = filteredGroupedItems.findIndex((item: any) => item.pn === itemKey);
      if (currentIndex < 0) return;

      const nextItem = filteredGroupedItems[currentIndex + 1] as any;
      if (nextItem) {
        const nextInput = quantityInputRefs.current[nextItem.pn];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    },
    [filteredGroupedItems]
  );

  useEffect(() => {
    if (!modalOpen) return;

    const focusTimeout = setTimeout(() => {
      modalSearchInputRef.current?.focus();
    }, 80);

    const handleModalHotkeys = (e: KeyboardEvent) => {
      if (!modalOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          void handleSaveItems();
        }
      }
    };

    window.addEventListener('keydown', handleModalHotkeys);
    return () => {
      clearTimeout(focusTimeout);
      window.removeEventListener('keydown', handleModalHotkeys);
    };
  }, [modalOpen, closeModal, handleSaveItems, hasUnsavedChanges]);

  const handleDeleteClick = (req: Requisicao) => {
    if (deletePending.current || deliveryPending.current) return;
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
                          draggable={!savingDelivery}
                          onDragStart={(e: any) => handleCardDragStart(e, req.id)}
                          onDragEnd={handleCardDragEnd}
                          className={`bg-slate-900 border rounded-lg p-4 cursor-pointer transition-colors ${
                            isUrgente(req.created_at)
                              ? 'border-red-500/50 hover:border-red-500'
                              : 'border-purple-500/20 hover:border-purple-500/50'
                          } ${
                            draggingReqId === req.id ? 'opacity-50 ring-2 ring-cyan-400/60' : 'opacity-100'
                          } ${savingDelivery ? 'pointer-events-none opacity-60' : ''}`}
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

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={`Requisição #${selectedRequisicao?.id}`}
        size="xl"
        icon={<Package className="w-5 h-5 text-purple-400" />}
      >
        {selectedRequisicao && (
          <div className="space-y-5">
            {/* Informações da Requisição */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Painel operacional do modal */}
            <div className="bg-slate-900/45 rounded-xl p-4 border border-slate-700/50 space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <div className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 min-w-[120px]">
                  <span className="text-slate-400">Itens</span>
                  <p className="text-white font-bold">{modalSummary.totalItens}</p>
                </div>
                <div className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 min-w-[120px]">
                  <span className="text-slate-400">Pendentes</span>
                  <p className="text-amber-300 font-bold">{modalSummary.pendentes}</p>
                </div>
                <div className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 min-w-[120px]">
                  <span className="text-slate-400">Concluído</span>
                  <p className="text-emerald-300 font-bold">{modalSummary.progresso}%</p>
                </div>
                <div className="rounded-lg bg-slate-800/70 border border-slate-700 px-3 py-2 min-w-[150px]">
                  <span className="text-slate-400">Status ao salvar</span>
                  <p className="text-cyan-300 font-bold">{getStatusLabel(modalSummary.projectedStatus)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={modalSearchInputRef}
                      type="text"
                      value={modalSearch}
                      onChange={e => setModalSearch(e.target.value)}
                      placeholder="Buscar item por PN, designador ou descrição..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showOnlyPendingItems}
                    onChange={e => setShowOnlyPendingItems(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900"
                  />
                  Mostrar apenas pendentes
                </label>
              </div>
            </div>

            {/* Itens da Requisição */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-bold text-white">Itens da Requisição</h4>
                <span className="ml-auto text-sm text-slate-400">
                  {filteredGroupedItems.length} item(ns) exibido(s)
                </span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredGroupedItems.map((groupedItem: any, idx: number) => {
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
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Quantidade Entregue
                          </label>
                          <input
                            ref={el => {
                              quantityInputRefs.current[itemKey] = el;
                            }}
                            type="number"
                            aria-label={`Quantidade entregue de ${itemKey}`}
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
                            onKeyDown={e => handleQuantityInputKeyDown(itemKey, e)}
                            disabled={savingDelivery}
                            className="w-full md:w-36 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center font-semibold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          />
                        </div>
                        <div className="flex items-center md:justify-end gap-2">
                          {!isDelivered && (
                            <button
                              onClick={() => {
                                setEditedQuantities(prev => ({
                                  ...prev,
                                  [itemKey]: groupedItem.quantidade_requisitada,
                                }));
                              }}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg transition-all shadow-lg hover:shadow-green-500/20 text-sm whitespace-nowrap"
                              title="Marcar entrega total deste item"
                            >
                              <CheckCircle2 className="w-4 h-4 inline mr-1" />
                              Entregar total
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
            <details className="border-t border-slate-700/50 pt-4 text-sm">
              <summary className="cursor-pointer text-slate-300">Histórico de entregas · 50 alterações mais recentes</summary>
              {historyError ? <p role="alert" className="text-red-400 mt-3">{historyError}</p>
                : deliveryHistory === null ? <p className="mt-3">Carregando histórico...</p>
                : deliveryHistory.length === 0 ? <p className="mt-3 text-slate-400">Nenhuma conferência registrada desde a atualização.</p>
                : deliveryHistory.map(event => <div key={event.version} className="border-b border-slate-700 py-3 space-y-1">
                  <p>{formatDate(event.occurredAt)} · {event.actorName} · versão {event.version}</p>
                  {event.motivo && <p>Motivo · {event.motivo}</p>}
                  {Object.entries(event.depois.items.reduce<Record<string, number>>((totals, item) => {
                    totals[item.pn] = (totals[item.pn] || 0) + item.quantidade_entregue;
                    return totals;
                  }, Object.create(null))).map(([pn, quantity]) => <p key={pn} className="text-slate-400">
                    {pn} · {event.antes.items.filter(item => item.pn === pn).reduce((sum, item) => sum + item.quantidade_entregue, 0)} → {quantity}
                  </p>)}
                </div>)}
            </details>
            <div className="border-t border-slate-700/50 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {hasUnsavedChanges ? (
                  <span className="text-amber-300">Alterações pendentes de salvamento</span>
                ) : (
                  <span className="text-slate-400">Sem alterações pendentes</span>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={handleFillPendingAsDelivered}>
                  Marcar tudo como entregue
                </Button>
                <Button variant="outline" onClick={handleResetEdits} disabled={!hasUnsavedChanges}>
                  Desfazer alterações
                </Button>
              <Button variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button variant="success" onClick={handleSaveItems} disabled={!hasUnsavedChanges || savingDelivery}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Revisar Entregas
              </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!deliveryReview} onClose={() => {
        if (!deliveryPending.current) setDeliveryReview(null);
      }} title="Conferir entregas" size="lg" icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}>
        {deliveryReview && <div className="space-y-4" aria-busy={savingDelivery}>
          <p>Requisição <strong>#{deliveryReview.id}</strong> · OM <strong>{deliveryReview.om}</strong></p>
          <p className="text-sm text-slate-300">Confira o total acumulado entregue de cada material antes de confirmar.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead><tr><th className="p-2">PN</th><th className="p-2">Requisitado</th><th className="p-2">Entregue antes</th><th className="p-2">Total ao confirmar</th></tr></thead>
              <tbody>{deliveryReview.items.map(item => <tr key={item.pn} className="border-t border-slate-700">
                <td className="p-2 break-all">{item.pn}</td><td className="p-2">{item.requested}</td>
                <td className="p-2">{item.before}</td><td className="p-2 font-bold">{item.quantidade_entregue}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <p>Status ao confirmar · <strong>{getStatusLabel(deliveryReview.status)}</strong></p>
          {deliveryReview.items.some(item => item.quantidade_entregue < item.before) && <div>
            <label htmlFor="delivery-reason" className="block text-sm mb-2">Motivo da correção de entrega</label>
            <input id="delivery-reason" value={deliveryReason} maxLength={500} disabled={savingDelivery}
              onChange={event => { setDeliveryReason(event.target.value); setReasonError(''); }}
              aria-invalid={!!reasonError} aria-describedby={reasonError ? 'delivery-reason-error' : undefined}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2" />
            {reasonError && <p id="delivery-reason-error" role="alert" className="text-red-400 mt-2">{reasonError}</p>}
          </div>}
          {deliveryError && <p role="alert" className="text-red-400">{deliveryError}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={savingDelivery} onClick={() => setDeliveryReview(null)}>
              Voltar à conferência
            </Button>
            <Button variant="success" isLoading={savingDelivery} disabled={!!deliveryError} onClick={confirmDelivery}>
              Confirmar entregas
            </Button>
          </div>
        </div>}
      </Dialog>

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
