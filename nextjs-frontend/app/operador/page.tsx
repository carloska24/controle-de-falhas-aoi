'use client';

import { useState, useEffect, useCallback, useMemo, useTransition, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ArrowRight,
  ArrowLeft,
  Play,
  Plus,
  Save,
  Eraser,
  Trash2,
  FilePlus,
  Wand2,
  HeartPulse,
  BarChart2,
  Archive,
  Wrench,
  Clock,
  Pause,
  Flag,
  LayoutDashboard,
} from 'lucide-react';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Registro, OM, Metrics } from '@/types/index';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import ProTimer from '@/components/index/ProTimer';
import ProForm from '@/components/index/ProForm';
import ProTable from '@/components/index/ProTable';
import ProMetrics from '@/components/index/ProMetrics';
import ProQuality from '@/components/index/ProQuality';
import ProQuickLinks from '@/components/index/ProQuickLinks';

export default function IndexPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Auth & User
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data - com optimistic updates
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [pausedOMs, setPausedOMs] = useState<OM[]>([]);
  const [finishedOMs, setFinishedOMs] = useState<OM[]>([]);
  const [activeOMs, setActiveOMs] = useState<OM[]>([]); // OMs em andamento
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, oms: 0, distrib: '—' });

  // OM State
  const [activeOM, setActiveOM] = useState<string | null>(null);
  const [activeOMQtdLote, setActiveOMQtdLote] = useState<number | null>(null);
  const [omState, setOmState] = useState<{
    elapsed: number;
    isRunning: boolean;
    isPaused: boolean;
    omNumber: string | null;
  }>({
    elapsed: 0,
    isRunning: false,
    isPaused: false,
    omNumber: null,
  });

  // OM Time Summary (para exibição de resumo de tempo)
  const [omTimeSummary, setOmTimeSummary] = useState<{
    startTime: number | null;
    endTime: number | null;
    elapsed: number;
  } | null>(null);

  const checkAuth = async () => {
    try {
      if (typeof window === 'undefined') return;

      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      // Verifica autenticação no backend antes de continuar
      try {
        const meResponse = await fetchAutenticado('/api/auth/me');
        if (meResponse?.user) {
          setUser(meResponse.user);
          setLoading(false);
        } else {
          throw new Error('Usuário não autenticado');
        }
      } catch (authError) {
        console.error('Erro ao verificar autenticação:', authError);
        localStorage.clear();
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.clear();
      setLoading(false);
      router.push('/login');
    }
  };

  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await fetchAutenticado('/api/registros');
      const registrosList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      // Filtra registros marcados como 'Alternativo' (foram aceitos pelo SMT)
      const visibleRegistros = registrosList.filter(
        (r: Registro) => r.tipodefeito !== 'Alternativo'
      );
      startTransition(() => {
        setRegistros(visibleRegistros);
      });
      setIsDataLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar registros:', error);
      startTransition(() => {
        setRegistros([]);
      });
      showToast(error.message || 'Erro ao carregar registros', 'error');
      setIsDataLoading(false);
    }
  }, [showToast]);

  const loadOMs = useCallback(async () => {
    try {
      const [paused, finished, actives] = await Promise.all([
        fetchAutenticado('/api/oms?status=pausada').catch(() => []),
        fetchAutenticado('/api/oms/finalizadas').catch(() => []),
        fetchAutenticado('/api/oms?status=ativa').catch(() => []),
      ]);
      setPausedOMs(Array.isArray(paused) ? paused : []);
      setFinishedOMs(Array.isArray(finished) ? finished : []);
      setActiveOMs(Array.isArray(actives) ? actives : []);
    } catch (error) {
      console.error('Erro ao carregar OMs:', error);
    }
  }, []);

  const restoreOM = async () => {
    const omEmAndamento = localStorage.getItem('omEmAndamento');
    if (!omEmAndamento) return;

    try {
      const omData = await fetchAutenticado(`/api/om/${encodeURIComponent(omEmAndamento)}`);
      if (omData) {
        setActiveOM(omData.omNumber);
        setActiveOMQtdLote(omData.qtdlote || null);
        setOmState({
          elapsed: omData.elapsed || 0, // Backend retorna em milissegundos
          isRunning: omData.status === 'em_andamento',
          isPaused: omData.status === 'pausada',
          omNumber: omData.omNumber,
        });
      }
    } catch (error) {
      localStorage.removeItem('omEmAndamento');
    }
  };

  // Sincronizar timer periodicamente com o backend quando running
  useEffect(() => {
    if (!omState.isRunning || !activeOM || !user) return;

    const syncInterval = setInterval(async () => {
      try {
        const omData = await fetchAutenticado(`/api/om/${encodeURIComponent(activeOM)}`);
        if (omData && omData.omNumber === activeOM) {
          setOmState(prev => ({
            ...prev,
            elapsed: omData.elapsed || prev.elapsed, // Backend retorna em milissegundos
          }));
        }
      } catch (error) {
        console.error('Erro ao sincronizar timer:', error);
      }
    }, 5000); // Sincroniza a cada 5 segundos

    return () => clearInterval(syncInterval);
  }, [omState.isRunning, activeOM, user]);

  const updateMetrics = useCallback(() => {
    try {
      if (!Array.isArray(registros) || registros.length === 0) {
        setMetrics({ total: 0, oms: 0, distrib: '—' });
        return;
      }

      const filtered = activeOM ? registros.filter(r => r.om === activeOM) : registros;

      const omsSet = new Set(filtered.map(r => r.om));

      const counts: Record<string, number> = {};
      filtered.forEach(r => {
        if (r.tipodefeito) {
          counts[r.tipodefeito] = (counts[r.tipodefeito] || 0) + 1;
        }
      });

      const top3 = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([defeito, qtd]) => `${defeito} (${qtd})`)
        .join(', ');

      setMetrics({
        total: filtered.length,
        oms: omsSet.size,
        distrib: top3 || '—',
      });
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
    }
  }, [registros, activeOM]);

  // Inicialização
  useEffect(() => {
    checkAuth();
  }, []);

  // Carregar dados quando user estiver disponível
  useEffect(() => {
    if (user) {
      loadData();
      loadOMs();
      restoreOM();
    }
  }, [user, loadData, loadOMs]);

  // Atualizar métricas quando registros ou OM mudarem
  useEffect(() => {
    updateMetrics();
  }, [updateMetrics]);

  // Atalhos de teclado
  useEffect(() => {
    if (loading || !user) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em um input, textarea ou select
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      // Alt+S - Iniciar OM (delegado para o ProForm via evento customizado)
      if (
        e.altKey &&
        e.key.toLowerCase() === 's' &&
        !omState.isRunning &&
        !omState.isPaused &&
        !activeOM
      ) {
        e.preventDefault();
        // Dispara evento customizado que o ProForm vai escutar
        window.dispatchEvent(new CustomEvent('startOMKeyboard'));
        return;
      }

      // Espaço - Pausar/Retomar OM
      if (e.key === ' ' && !e.ctrlKey && !e.altKey && activeOM) {
        e.preventDefault();
        if (omState.isRunning) {
          // Pausar
          try {
            const omData = await fetchAutenticado('/api/om/pause', {
              method: 'PUT',
              body: JSON.stringify({ omNumber: activeOM }),
            });
            setOmState(prev => ({
              ...prev,
              elapsed: omData.elapsed || prev.elapsed,
              isRunning: false,
              isPaused: true,
            }));
            showToast(`OM ${activeOM} pausada.`, 'info');
            await loadOMs();
          } catch (error: any) {
            showToast(error.message || 'Erro ao pausar OM', 'error');
          }
        } else if (omState.isPaused) {
          // Retomar
          try {
            const omData = await fetchAutenticado('/api/om/resume', {
              method: 'PUT',
              body: JSON.stringify({ omNumber: activeOM }),
            });
            setOmState(prev => ({
              ...prev,
              elapsed: omData.elapsed || prev.elapsed,
              isRunning: true,
              isPaused: false,
            }));
            showToast(`OM ${activeOM} retomada!`, 'success');
            await loadOMs();
          } catch (error: any) {
            showToast(error.message || 'Erro ao retomar OM', 'error');
          }
        }
      }

      // Ctrl+Enter - Finalizar OM
      if (e.ctrlKey && e.key === 'Enter' && activeOM) {
        e.preventDefault();
        try {
          const omData = await fetchAutenticado('/api/om/finalizar', {
            method: 'PUT',
            body: JSON.stringify({ omNumber: activeOM }),
          });
          const finalizadaOM = activeOM; // Guardar o número da OM antes de atualizar
          setOmState({
            elapsed: omData.elapsed || 0,
            isRunning: false,
            isPaused: false,
            omNumber: null,
          });
          // Salva resumo de tempo para exibição
          setOmTimeSummary({
            startTime: omData.startTime || null,
            endTime: omData.endTime || null,
            elapsed: omData.elapsed || 0,
          });
          // NÃO limpar activeOM e activeOMQtdLote aqui - manter para que o card de qualidade possa calcular
          // Esses valores serão limpos quando uma nova OM for iniciada ou quando o usuário clicar em "Limpar"
          localStorage.removeItem('omEmAndamento');
          showToast(`OM ${finalizadaOM} finalizada!`, 'success');
          await loadData();
          await loadOMs();
        } catch (error: any) {
          showToast(error.message || 'Erro ao finalizar OM', 'error');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, loading, activeOM, omState.isRunning, omState.isPaused, loadOMs, loadData]);

  // Filtrar registros - deve estar antes do return condicional
  const filteredRegistros = useMemo(() => {
    if (!activeOM) return registros;
    return registros.filter(r => r.om === activeOM);
  }, [registros, activeOM]);

  const handleLogout = async () => {
    try {
      // Se for admin, a limpeza é feita automaticamente no backend no endpoint /auth/logout
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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#0b0f1a] via-[#0f172a] to-[#0b0f1a]"
      style={{
        backgroundImage:
          'radial-gradient(1200px 600px at 80% -20%, rgba(124,58,237,.18), transparent 50%)',
      }}
    >
      {/* Header Moderno PRO */}
      <header className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20"
              >
                <LayoutDashboard className="w-6 h-6 text-white" />
              </motion.div>
              <h1 className="text-xl font-bold text-white">Controle de Falhas AOI — PRO</h1>
            </div>
            <div className="flex items-center gap-3">
              {user.role === 'admin' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/admin')}
                  className="group relative p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                  title="Voltar para Admin"
                >
                  <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-300" />
                </motion.button>
              )}
              <span className="text-sm text-slate-200">{user.name}</span>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-4">
        {/* Context Bar - Timer e Status */}
        <ProTimer
          omNumber={omState.omNumber}
          elapsed={omState.elapsed}
          isRunning={omState.isRunning}
          isPaused={omState.isPaused}
          activeOM={activeOM}
        />

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_0.9fr] gap-7">
          {/* Coluna Principal */}
          <div className="flex flex-col gap-5">
            {/* Formulário de Lançamento */}
            <ProForm
              activeOM={activeOM}
              activeOMQtdLote={activeOMQtdLote}
              omState={omState}
              registros={registros}
              onSubmit={async data => {
                try {
                  // Prepara dados completos conforme o backend espera
                  const registroData = {
                    om: data.om,
                    qtdlote: data.qtdlote,
                    serial: data.serial || null,
                    designador: data.designador,
                    tipodefeito: data.tipodefeito,
                    pn: data.pn || null,
                    descricao: data.descricao || null,
                    obs: data.obs || null,
                    prioridade: data.prioridade || 'media',
                  };

                  // Backend espera array no endpoint /batch
                  await fetchAutenticado('/api/registros/batch', {
                    method: 'POST',
                    body: JSON.stringify([registroData]),
                  });
                  showToast('Registro cadastrado com sucesso!', 'success');
                  await loadData();
                } catch (error: any) {
                  showToast(error.message || 'Erro ao cadastrar registro', 'error');
                  throw error;
                }
              }}
              onStartOM={async (omNumber: string, qtdLote: number) => {
                try {
                  const omData = await fetchAutenticado('/api/om/start', {
                    method: 'POST',
                    body: JSON.stringify({ omNumber, qtdLote }),
                  });
                  setActiveOM(omData.omNumber);
                  setActiveOMQtdLote(qtdLote);
                  setOmState({
                    elapsed: omData.elapsed || 0, // Backend retorna em milissegundos (0 ao iniciar)
                    isRunning: true,
                    isPaused: false,
                    omNumber: omData.omNumber,
                  });
                  setOmTimeSummary(null); // Limpa resumo de tempo anterior
                  localStorage.setItem('omEmAndamento', omData.omNumber);
                  showToast(`OM ${omData.omNumber} iniciada!`, 'success');
                  await loadOMs();
                } catch (error: any) {
                  showToast(error.message || 'Erro ao iniciar OM', 'error');
                }
              }}
              onPauseOM={async () => {
                if (!activeOM) return;
                try {
                  const omData = await fetchAutenticado('/api/om/pause', {
                    method: 'PUT',
                    body: JSON.stringify({ omNumber: activeOM }),
                  });
                  setOmState(prev => ({
                    ...prev,
                    elapsed: omData.elapsed || prev.elapsed, // Backend retorna elapsedAtPause em milissegundos
                    isRunning: false,
                    isPaused: true,
                  }));
                  showToast(`OM ${activeOM} pausada.`, 'info');
                  await loadOMs();
                } catch (error: any) {
                  showToast(error.message || 'Erro ao pausar OM', 'error');
                }
              }}
              onResumeOM={async () => {
                if (!activeOM) return;
                try {
                  const omData = await fetchAutenticado('/api/om/resume', {
                    method: 'PUT',
                    body: JSON.stringify({ omNumber: activeOM }),
                  });
                  setOmState(prev => ({
                    ...prev,
                    elapsed: omData.elapsed || prev.elapsed, // Backend retorna getElapsed(om) em milissegundos
                    isRunning: true,
                    isPaused: false,
                  }));
                  showToast(`OM ${activeOM} retomada!`, 'success');
                  await loadOMs();
                } catch (error: any) {
                  showToast(error.message || 'Erro ao retomar OM', 'error');
                }
              }}
              onFinishOM={async () => {
                if (!activeOM) return;
                try {
                  const omData = await fetchAutenticado('/api/om/finalizar', {
                    method: 'PUT',
                    body: JSON.stringify({ omNumber: activeOM }),
                  });
                  const finalizadaOM = activeOM; // Guardar o número da OM antes de atualizar
                  setOmState({
                    elapsed: omData.elapsed || 0,
                    isRunning: false,
                    isPaused: false,
                    omNumber: null,
                  });
                  // Salva resumo de tempo para exibição
                  setOmTimeSummary({
                    startTime: omData.startTime || null,
                    endTime: omData.endTime || null,
                    elapsed: omData.elapsed || 0,
                  });
                  // NÃO limpar activeOM e activeOMQtdLote aqui - manter para que o card de qualidade possa calcular
                  // Esses valores serão limpos quando uma nova OM for iniciada ou quando o usuário clicar em "Limpar"
                  localStorage.removeItem('omEmAndamento');
                  showToast(`OM ${finalizadaOM} finalizada!`, 'success');
                  await loadData();
                  await loadOMs();
                } catch (error: any) {
                  showToast(error.message || 'Erro ao finalizar OM', 'error');
                }
              }}
              onNewOM={() => {
                setActiveOM(null);
                setActiveOMQtdLote(null);
                setOmState({ elapsed: 0, isRunning: false, isPaused: false, omNumber: null });
                setOmTimeSummary(null); // Limpa resumo de tempo
                localStorage.removeItem('omEmAndamento');
              }}
              pausedOMs={pausedOMs}
              finishedOMs={finishedOMs}
              onSelectPausedOM={async (omNumber: string | null) => {
                if (!omNumber) {
                  setActiveOM(null);
                  setActiveOMQtdLote(null);
                  setOmState({ elapsed: 0, isRunning: false, isPaused: false, omNumber: null });
                  setOmTimeSummary(null);
                  localStorage.removeItem('omEmAndamento');
                  await loadData();
                  return;
                }
                try {
                  const omData = await fetchAutenticado(`/api/om/${encodeURIComponent(omNumber)}`);
                  if (omData && omData.status === 'pausada') {
                    setActiveOM(omData.omNumber);
                    setActiveOMQtdLote(omData.qtdlote || null);
                    setOmState({
                      elapsed: omData.elapsed || 0,
                      isRunning: false,
                      isPaused: true,
                      omNumber: omData.omNumber,
                    });
                    localStorage.setItem('omEmAndamento', omData.omNumber);
                    showToast(`OM ${omData.omNumber} carregada e pronta para retomar.`, 'info');
                  }
                } catch (error: any) {
                  showToast(error.message || 'Erro ao carregar OM pausada', 'error');
                }
              }}
              onSelectFinishedOM={async (omNumber: string | null) => {
                if (!omNumber) {
                  setActiveOM(null);
                  setActiveOMQtdLote(null);
                  setOmState({ elapsed: 0, isRunning: false, isPaused: false, omNumber: null });
                  setOmTimeSummary(null);
                  localStorage.removeItem('omEmAndamento');
                  await loadData();
                  return;
                }
                try {
                  const omData = await fetchAutenticado(`/api/om/${encodeURIComponent(omNumber)}`);
                  if (omData && omData.status === 'finalizada') {
                    setActiveOM(omData.omNumber);
                    setActiveOMQtdLote(omData.qtdlote || null);
                    setOmState({
                      elapsed: omData.elapsed || 0,
                      isRunning: false,
                      isPaused: false,
                      omNumber: null, // null para indicar que está finalizada (não rodando)
                    });
                    // Carrega resumo de tempo da OM finalizada
                    setOmTimeSummary({
                      startTime: omData.startTime || null,
                      endTime: omData.endTime || null,
                      elapsed: omData.elapsed || 0,
                    });
                    localStorage.removeItem('omEmAndamento');
                    showToast(`OM ${omData.omNumber} carregada em modo de consulta.`, 'info');
                  }
                } catch (error: any) {
                  showToast(error.message || 'Erro ao carregar OM finalizada', 'error');
                }
              }}
              activeOMs={activeOMs}
              onSelectActiveOM={async (omNumber: string | null) => {
                if (!omNumber) {
                  setActiveOM(null);
                  setActiveOMQtdLote(null);
                  setOmState({ elapsed: 0, isRunning: false, isPaused: false, omNumber: null });
                  setOmTimeSummary(null);
                  localStorage.removeItem('omEmAndamento');
                  await loadData();
                  return;
                }
                try {
                  const omData = await fetchAutenticado(`/api/om/${encodeURIComponent(omNumber)}`);
                  if (omData && omData.status === 'em_andamento') {
                    setActiveOM(omData.omNumber);
                    setActiveOMQtdLote(omData.qtdlote || null);
                    setOmState({
                      elapsed: omData.elapsed || 0,
                      isRunning: true,
                      isPaused: false,
                      omNumber: omData.omNumber,
                    });
                    localStorage.setItem('omEmAndamento', omData.omNumber);
                    showToast(`OM ${omData.omNumber} retomada! Timer ativo.`, 'success');
                    await loadData();
                  }
                } catch (error: any) {
                  showToast(error.message || 'Erro ao retomar OM ativa', 'error');
                }
              }}
            />

            {/* Tabela de Registros */}
            <ProTable
              registros={filteredRegistros}
              isLoading={isDataLoading || isPending}
              omTimeSummary={omTimeSummary || undefined}
              onDelete={async (ids: string[]) => {
                // Optimistic UI Update - remove imediatamente
                const deletedIds = new Set(ids);
                const beforeDelete = [...registros];
                const optimisticRegistros = registros.filter(r => !deletedIds.has(r.id));

                startTransition(() => {
                  setRegistros(optimisticRegistros);
                });

                try {
                  // Backend espera DELETE /api/registros com body { ids: [...] }
                  await fetchAutenticado('/api/registros', {
                    method: 'DELETE',
                    body: JSON.stringify({ ids }),
                  });
                  showToast(`${ids.length} registro(s) excluído(s)`, 'success');
                  await loadData(); // Sincroniza com servidor
                } catch (error: any) {
                  // Rollback em caso de erro
                  startTransition(() => {
                    setRegistros(beforeDelete);
                  });
                  showToast(error.message || 'Erro ao excluir registros', 'error');
                }
              }}
              onGenerateRequest={async (ids: string[]) => {
                try {
                  const response = await fetchAutenticado('/api/requisicoes', {
                    method: 'POST',
                    body: JSON.stringify({ registroIds: ids }),
                  });
                  const requisicaoIds = response.requisicaoIds || [];
                  showToast(
                    `${requisicaoIds.length || 1} requisição(ões) gerada(s) com sucesso!`,
                    'success'
                  );
                  await loadData();
                } catch (error: any) {
                  // Verifica se é erro de duplicata
                  if (error.message === 'duplicated_pns') {
                    showToast(
                      'Alguns materiais já foram requisitados anteriormente e ainda estão pendentes. Verifique a tela de Almoxarifado.',
                      'error'
                    );
                  } else {
                    showToast(error.message || 'Erro ao gerar requisição', 'error');
                  }
                }
              }}
              onAddDemo={async () => {
                if (!user || user.role !== 'admin') {
                  showToast('Apenas administradores podem lançar dados de demonstração.', 'error');
                  return;
                }

                try {
                  // Chama o backend para gerar dados reais (Registros + Requisições) com datas distintas
                  await fetchAutenticado('/api/debug/populate', {
                    method: 'POST',
                    body: JSON.stringify({ count: 15, clear: true }),
                  });

                  showToast('Dados de demonstração (15 registros) gerados com sucesso!', 'success');
                  await loadData(); // Recarrega a tabela
                } catch (error: any) {
                  showToast(error.message || 'Erro ao gerar dados de demonstração', 'error');
                }
              }}
              onEdit={async (id: string, data: Partial<Registro>) => {
                try {
                  await fetchAutenticado(`/api/registros/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                  });
                  showToast('Registro atualizado com sucesso!', 'success');
                  await loadData(); // Recarrega os dados
                } catch (error: any) {
                  showToast(error.message || 'Erro ao atualizar registro', 'error');
                  throw error;
                }
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            {/* Métricas */}
            <ProMetrics {...metrics} />

            {/* Qualidade */}
            <ProQuality
              registros={filteredRegistros}
              selectedIds={[]}
              activeOM={activeOM}
              activeOMQtdLote={activeOMQtdLote}
              omState={omState}
              finishedOMs={finishedOMs}
            />

            {/* Links Rápidos */}
            <ProQuickLinks isAdmin={user.role === 'admin'} />
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
