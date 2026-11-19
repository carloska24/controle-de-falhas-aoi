'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowLeft,
  Check,
  X,
  FileText,
  Clock,
  LogOut,
} from 'lucide-react';
import { fetchAutenticado, encerrarSessao, fetchListaCompleta, getRegistroVersion } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Registro } from '@/types/index';
import { createSmtQueueLoader, filterSmtQueue, SmtQueueState } from '@/lib/smtQueue';

export default function SmtConferenciaPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [queue, setQueue] = useState<SmtQueueState>({ status: 'loading', records: [], error: '' });
  const queueLoader = useRef<ReturnType<typeof createSmtQueueLoader> | null>(null);
  const processing = useRef(false);
  const mounted = useRef(false);
  const loading = queue.status === 'loading';
  const registros = queue.records;
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const loadRegistros = useCallback(() => {
    if (!processing.current) return queueLoader.current?.load();
  }, []);

  // Verificar autenticação
  useEffect(() => {
    mounted.current = true;
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const loader = createSmtQueueLoader({
        read: signal => fetchListaCompleta<Registro>('/api/registros', signal),
        onState: setQueue,
      });
      queueLoader.current = loader;
      void loader.load();
    } catch {
      router.push('/login');
    }
    return () => {
      mounted.current = false;
      queueLoader.current?.dispose();
      queueLoader.current = null;
    };
  }, [router]);

  const handleAction = async (id: string, action: 'confirma_erro' | 'alternativo') => {
    if (processing.current || queueLoader.current?.getState().status !== 'ready') return;
    processing.current = true;
    setProcessingId(id);
    try {
      const novoDefeito = action === 'confirma_erro' ? 'Incorreto' : 'Alternativo';
      const obsAdicional =
        action === 'confirma_erro'
          ? ' - Validado como ERRO REAL pelo SMT'
          : ' - Validado como ALTERNATIVO pelo SMT';

      // A versão impede sobrescrever uma alteração feita em outro terminal.
      const registroAtual = registros.find(r => r.id === id);
      if (!registroAtual) return;

      const payload = {
        tipodefeito: novoDefeito,
        obs: (registroAtual.obs || '') + obsAdicional,
        version: getRegistroVersion(registroAtual),
      };

      await fetchAutenticado(`/api/registros/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      if (!mounted.current) return;

      showToast(
        action === 'confirma_erro'
          ? 'Falha confirmada como Incorreto!'
          : 'Componente marcado como Alternativo!',
        'success'
      );

      // Remove da lista localmente
      queueLoader.current?.removeConfirmed(id);
    } catch (error: any) {
      console.error('Erro ao processar:', error);
      if (mounted.current) queueLoader.current?.invalidate(`${error.message || 'Não foi possível confirmar a ação.'} Atualize a fila antes de tentar novamente.`);
    } finally {
      processing.current = false;
      if (mounted.current) setProcessingId(null);
    }
  };

  const filteredRegistros = filterSmtQueue(registros, searchTerm);

  const handleLogout = async () => {
    try {
      await encerrarSessao();
    } catch (error: any) {
      showToast(error.message || 'Não foi possível encerrar a sessão. Tente novamente antes de deixar o terminal.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Conferência SMT</h1>
              <p className="text-xs text-slate-400">Validação de Códigos Incorretos</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/operador')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="h-8 w-px bg-slate-700 mx-2" />
            <span className="text-sm font-medium text-slate-300 hidden md:block">
              {user?.name || 'Usuário'}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} aria-label="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl flex items-center gap-4"
          >
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Pendentes</p>
              <h3 className="text-2xl font-bold text-white">{queue.status === 'ready' ? registros.length : '—'}</h3>
            </div>
          </motion.div>
          {/* Adicionar mais KPIs se necessário */}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por OM, Designador ou PN..."
              aria-label="Buscar pendências SMT por OM, designador ou PN"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <Button variant="ghost" onClick={loadRegistros} disabled={loading || !!processingId}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Lista
          </Button>
        </div>
        {queue.status === 'ready' && <p role="status" className="text-sm text-slate-400 mb-4">
          Exibindo {filteredRegistros.length} de {registros.length} pendências.
        </p>}

        {/* Lista */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {loading ? (
              <div role="status" className="text-center py-20 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-500 mx-auto mb-4"></div>
                Carregando pendências...
              </div>
            ) : queue.status === 'error' ? (
              <div role="alert" className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 dashed">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Não foi possível consultar a fila</h3>
                <p className="text-slate-400 mt-2">{queue.error}</p>
                <Button variant="outline" className="mt-4" onClick={loadRegistros}>Tentar novamente</Button>
              </div>
            ) : filteredRegistros.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 dashed"
              >
                <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400">{registros.length === 0
                  ? 'Nenhuma conferência pendente' : 'Nenhum resultado para esta busca'}</h3>
                <p className="text-slate-500">{registros.length === 0
                  ? 'A consulta foi concluída e não há pendências de conferência no momento.'
                  : 'Há pendências na fila. Limpe ou ajuste a busca para encontrá-las.'}</p>
                {searchTerm.trim() && <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>Limpar busca</Button>}
              </motion.div>
            ) : (
              filteredRegistros.map(registro => (
                <motion.div
                  key={registro.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg group hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Info Principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant="secondary"
                          className="text-slate-300 border-slate-600 bg-transparent border"
                        >
                          OM: {registro.om}
                        </Badge>
                        <Badge variant="warning">{registro.tipodefeito}</Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(registro.createdat).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Designador
                          </p>
                          <p className="text-2xl font-mono text-white tracking-wider font-bold">
                            {registro.designador}
                          </p>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Search className="w-12 h-12 text-yellow-500" />
                          </div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Código Lido (PN)
                          </p>
                          <p className="text-2xl font-mono text-yellow-400 tracking-wider font-bold relative z-10">
                            {registro.pn}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/50 pt-3">
                        <span className="flex items-center gap-2">
                          Registrado Por:{' '}
                          <span className="text-slate-300 font-medium">
                            {registro.operador || '—'}
                          </span>
                        </span>
                      </div>

                      {registro.descricao && (
                        <div className="mt-3">
                          <p className="text-sm text-slate-400 italic">"{registro.descricao}"</p>
                        </div>
                      )}

                      {registro.obs && (
                        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start animate-pulse duration-[3000ms]">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-amber-500/90 font-bold uppercase tracking-wide mb-1">
                              Observação do Operador
                            </p>
                            <p className="text-sm text-amber-100 leading-relaxed font-medium">
                              {registro.obs}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-row gap-3 w-full lg:w-auto h-full items-center">
                      <Button
                        variant="danger"
                        className="flex-1 lg:flex-none justify-center h-12 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                        onClick={() => handleAction(registro.id, 'confirma_erro')}
                        isLoading={processingId === registro.id}
                        disabled={!!processingId}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Confirmar Erro
                        <span className="block text-[10px] opacity-70 ml-1">(Defeito Real)</span>
                      </Button>

                      <Button
                        variant="success"
                        className="flex-1 lg:flex-none justify-center h-12 px-6 bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20"
                        onClick={() => handleAction(registro.id, 'alternativo')}
                        isLoading={processingId === registro.id}
                        disabled={!!processingId}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />É Alternativo
                        <span className="block text-[10px] opacity-70 ml-1">(Aceitar Código)</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
