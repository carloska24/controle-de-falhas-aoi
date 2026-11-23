'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, History, Layers, Package, Search, ShieldCheck, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { fetchAutenticado } from '@/lib/api';
import { calculateDelivery, createDeliveryReview, fillVisibleDelivery, filterDeliveryItems,
  groupDeliveryItems, initialDeliveryDraft, DeliveryMode } from '@/lib/deliveryDraft';
import type { Requisicao } from '@/types';
import DeliveryProgress from './DeliveryProgress';
import DeliveryMaterialCard from './DeliveryMaterialCard';
import DeliverySummary from './DeliverySummary';

interface HistoryEvent {
  version: number; actorName: string; occurredAt: string; motivo: string | null;
  antes: { items: { pn: string; quantidade_entregue: number }[] };
  depois: { items: { pn: string; quantidade_entregue: number }[] };
}
interface Props {
  request: Requisicao;
  actorName: string;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (request: Requisicao) => void;
}
const labels: Record<string, string> = { pendente: 'Pendente', parcialmente_entregue: 'Parcialmente entregue', entregue: 'Entregue' };
const statusStyle: Record<string, string> = {
  pendente: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  parcialmente_entregue: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  entregue: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
const materialCount = (count: number) => `${count} ${count === 1 ? 'material' : 'materiais'}`;
const unitCount = (count: number) => `${count} ${count === 1 ? 'unidade' : 'unidades'}`;
function date(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
  }) : 'Data indisponível';
}
function Status({ value, preview = false }: { value: string; preview?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${preview ? 'border-purple-400/30 bg-purple-400/10 text-purple-200' : statusStyle[value] || statusStyle.pendente}`}>
    {value === 'entregue' && !preview ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}{preview ? 'Previsto: ' : ''}{labels[value] || value}
  </span>;
}
function historyTotals(items: HistoryEvent['antes']['items']) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.pn, (totals.get(item.pn) || 0) + item.quantidade_entregue);
  return totals;
}

export default function DeliveryDialog({ request, actorName, canEdit, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  const mounted = useRef(false);
  const titleId = useId();
  const reasonId = useId();
  const materialData = useMemo(() => {
    try { return { items: groupDeliveryItems(request.items), error: '' }; }
    catch (error) { return { items: [], error: message(error) }; }
  }, [request.items]);
  const items = materialData.items;
  const [mode, setMode] = useState<DeliveryMode>('delivery');
  const [draft, setDraft] = useState(() => initialDeliveryDraft(items, 'delivery'));
  const [section, setSection] = useState<'materials' | 'history'>('materials');
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [reason, setReason] = useState('');
  const [editError, setEditError] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [review, setReview] = useState<ReturnType<typeof createDeliveryReview> | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryEvent[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const inputs = useRef<Record<string, HTMLInputElement | null>>(Object.create(null));
  const summary = useMemo(() => calculateDelivery(items, draft, mode), [items, draft, mode]);
  const visible = useMemo(() => filterDeliveryItems(items, search, pendingOnly), [items, search, pendingOnly]);
  const rowsByPN = new Map(summary.rows.map(row => [row.pn, row]));
  const visiblePNs = new Set(visible.map(item => item.pn));
  const completedMaterials = items.filter(item => item.requested > 0 && item.before === item.requested).length;
  const hiddenChanges = summary.rows.filter(row => row.changed && !visiblePNs.has(row.pn)).length;

  useEffect(() => {
    mounted.current = true;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    titleRef.current?.focus();
    return () => { mounted.current = false; dialog?.close(); };
  }, []);
  useEffect(() => { titleRef.current?.focus(); if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [review]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setHistory(null); setHistoryError('');
    fetchAutenticado(`/api/requisicoes/${request.id}/entregas`, { signal: controller.signal })
      .then(result => {
        if (!Array.isArray(result?.data)) throw new Error('Histórico inválido.');
        if (!controller.signal.aborted) setHistory(result.data);
      })
      .catch(() => { if (active) setHistoryError('Não foi possível consultar o histórico. Tente novamente.'); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [request.id, historyAttempt]);

  function close() {
    if (pending.current || deliveryError) return;
    if (review) { setReview(null); return; }
    if (summary.changedCount && !window.confirm('Existem alterações não confirmadas. Deseja descartá-las e fechar?')) return;
    dialogRef.current?.close();
    onClose();
  }
  function changeMode() {
    if (summary.changedCount && !window.confirm('A troca de operação descartará a edição atual. Deseja continuar?')) return;
    const next = mode === 'delivery' ? 'correction' : 'delivery';
    setMode(next); setDraft(initialDeliveryDraft(items, next)); setReason(''); setEditError(''); setSection('materials');
  }
  function prepareReview() {
    if (!canEdit || pending.current) return;
    try {
      setReview(createDeliveryReview(items, draft, mode, request.version, reason));
      setEditError(''); setDeliveryError('');
    } catch (error) {
      setEditError(message(error));
      if (mode === 'correction' && summary.reduced > 0 && !reason.trim()) reasonRef.current?.focus();
    }
  }
  async function confirm() {
    if (!review || !canEdit || pending.current || deliveryError) return;
    pending.current = true; setSaving(true);
    try {
      const saved = await fetchAutenticado(`/api/requisicoes/${request.id}/itens`, {
        method: 'PUT', signal: AbortSignal.timeout(15000), body: JSON.stringify(review.payload),
      });
      if (mounted.current) { dialogRef.current?.close(); onSaved(saved); }
    } catch (error) {
      if (mounted.current) setDeliveryError(message(error));
    } finally { pending.current = false; if (mounted.current) setSaving(false); }
  }

  return <dialog ref={dialogRef} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key === 'Tab') {
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, summary, a[href], [tabindex="0"]',
        )].filter(element => !element.matches(':disabled') && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (first && last && event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
          event.preventDefault(); last.focus();
        } else if (first && last && !event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); if (!review && section === 'materials') prepareReview();
      }
    }}
    className="m-auto h-[min(90dvh,900px)] max-h-[90dvh] w-[calc(100%-2rem)] max-w-7xl overflow-hidden rounded-3xl border border-purple-400/30 bg-slate-900 p-0 text-slate-200 shadow-2xl shadow-purple-500/10 open:flex flex-col backdrop:bg-black/70 backdrop:backdrop-blur-sm">
    <header className="relative shrink-0 overflow-hidden border-b border-purple-400/15 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-4 py-3 sm:px-6 sm:pb-4 sm:pt-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400" />
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <span className="shrink-0 rounded-2xl border border-purple-300/20 bg-gradient-to-br from-purple-500/80 to-indigo-600/60 p-2.5 text-purple-50 shadow-lg shadow-purple-500/15 sm:p-3"><Package className="size-5 sm:size-6" /></span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase text-purple-300"><span className="hidden sm:inline">Almoxarifado / </span>Conferência</p>
            <h2 ref={titleRef} tabIndex={-1} id={titleId} className="text-balance text-lg font-bold text-white outline-none sm:text-2xl">
              {review ? mode === 'correction' ? 'Revisar correção' : 'Revisar entrega' : mode === 'correction' ? 'Corrigir quantidades registradas' : 'Entrega de componentes'}
            </h2>
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-300"><span>Requisição <strong className="text-white">#{request.id}</strong></span><span className="font-mono text-cyan-200 sm:hidden">OM {request.om}</span><span className="hidden sm:inline">· {date(request.created_at)}</span></p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="hidden rounded-xl border border-cyan-400/15 bg-slate-950/40 px-4 py-2 sm:block">
            <p className="text-xs text-slate-400">Ordem de manufatura</p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-cyan-200">{request.om}</p>
          </div>
          <button type="button" aria-label={review ? 'Voltar à edição' : 'Fechar conferência'} disabled={saving || !!deliveryError}
            onClick={close} className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-slate-600/60 bg-slate-900/50 text-slate-300 transition-colors hover:border-purple-400/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"><X className="size-5" /></button>
        </div>
      </div>
      <div className="mt-3 grid items-center gap-3 border-t border-white/5 pt-3 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4 sm:pt-4">
        <div className="min-w-0"><DeliveryProgress label="Atendimento confirmado" value={summary.before} total={summary.requested} /></div>
        <div className="flex flex-wrap items-center gap-3 sm:pl-4">
          <Status value={request.status} />
          <span className="flex items-center gap-1.5 text-xs text-slate-300"><Layers className="size-3.5 text-purple-300" /><strong className="tabular-nums text-white">{completedMaterials}/{items.length}</strong><span><span className="hidden sm:inline">materiais </span>completos</span></span>
        </div>
      </div>
    </header>

    <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-br from-slate-800/25 via-slate-900 to-slate-950/50 px-4 py-5 sm:px-6">
      {materialData.error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{materialData.error}</p>
        : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
          <div className="min-w-0">
            {review ? <div className="space-y-4">
              <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-r from-purple-500/10 to-slate-800/60 p-5">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-purple-200"><ShieldCheck className="size-4" />Conferência final</p>
                <h3 className="text-lg font-semibold text-white">{mode === 'delivery' ? `${unitCount(review.summary.added)} em ${materialCount(review.summary.changedCount)} nesta entrega` : `${materialCount(review.summary.changedCount)} com correção de quantidade`}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">Compare os valores abaixo com os componentes entregues fisicamente.</p>
              </div>
              {review.summary.rows.filter(row => row.changed).map(row => <article key={row.pn} className="overflow-hidden rounded-2xl border border-purple-400/25 bg-gradient-to-br from-slate-800/90 to-slate-900 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-3 py-1.5 font-mono font-bold text-purple-100">{row.pn}</p>
                  <span className="text-sm font-semibold tabular-nums text-purple-200">{row.delta > 0 ? '+' : ''}{row.delta} un. {mode === 'delivery' ? 'nesta entrega' : 'no ajuste'}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">{row.description}</p>
                <div className="my-4 grid grid-cols-3 gap-2">
                  {[['Já entregue', row.before], [mode === 'delivery' ? 'Agora' : 'Ajuste', `${row.delta > 0 ? '+' : ''}${row.delta}`], ['Total previsto', row.total]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-3">
                    <p className="text-xs text-slate-400">{label}</p><p className={`mt-1 text-xl font-bold tabular-nums ${label === 'Total previsto' ? 'text-purple-200' : 'text-white'}`}>{value}</p>
                  </div>)}
                </div>
                <DeliveryProgress preview label="Após confirmar este material" accessibleLabel={`Após confirmar o material ${row.pn}`} value={row.total!} total={row.requested} />
                <p className="mt-3 text-right text-xs text-slate-300">Saldo após confirmar: <strong className="text-amber-200">{row.remaining} un.</strong></p>
              </article>)}
              <p className="px-1 text-xs text-slate-400">{materialCount(items.length - review.summary.changedCount)} {items.length - review.summary.changedCount === 1 ? 'permanece' : 'permanecem'} sem alteração.</p>
              {review.payload.motivo && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="text-xs font-semibold uppercase text-amber-300">Motivo da correção</p><p className="mt-2 whitespace-pre-wrap text-sm">{review.payload.motivo}</p></div>}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-400/20 bg-purple-400/5 p-4">
                <p className="text-sm font-medium text-purple-200">Situação após confirmar</p><Status preview value={review.summary.status!} />
              </div>
              {deliveryError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200"><p>{deliveryError}</p><p className="mt-2 text-slate-300">Ao atualizar, esta edição será descartada. Confira as quantidades salvas e o histórico antes de uma nova operação.</p></div>}
            </div> : <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <nav aria-label="Seções da requisição" className="inline-flex gap-1 rounded-xl border border-slate-600/40 bg-slate-950/50 p-1">
                  {(['materials', 'history'] as const).map(value => <button key={value} type="button" aria-pressed={section === value} onClick={() => setSection(value)}
                    className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${section === value ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/20 text-purple-100 shadow-sm ring-1 ring-purple-400/30' : 'text-slate-400 hover:text-white'}`}>
                    {value === 'materials' ? <Package className="size-4" /> : <History className="size-4" />}{value === 'materials' ? 'Materiais' : 'Histórico'}
                    {value === 'materials' && <span className="rounded-md bg-slate-900/60 px-1.5 py-0.5 text-xs tabular-nums text-slate-300">{items.length}</span>}
                  </button>)}
                </nav>
                {canEdit && <button type="button" onClick={changeMode} className="min-h-10 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-purple-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{mode === 'delivery' ? 'Corrigir registro' : 'Voltar para entrega'}</button>}
              </div>
              {section === 'history' ? <section aria-label="Histórico de entregas" className="space-y-3">
              <p className="text-sm text-slate-400">50 alterações mais recentes · quantidades acumuladas por material.</p>
              {historyError ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"><p className="text-red-300">{historyError}</p><Button className="mt-3" variant="outline" onClick={() => setHistoryAttempt(value => value + 1)}>Tentar novamente</Button></div>
                : history === null ? <p role="status" className="py-8 text-center text-slate-400">Carregando histórico...</p>
                  : !history.length ? <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">Nenhuma conferência registrada desde a atualização.</p>
                    : <ol className="space-y-3">{history.map(event => {
                      const before = historyTotals(event.antes.items);
                      return <li key={event.version} className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-white">{event.actorName}</p><span className="text-xs text-slate-400">{date(event.occurredAt)} · versão {event.version}</span></div>
                        {event.motivo && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-500/10 p-2 text-sm text-amber-200">Motivo · {event.motivo}</p>}
                        <div className="mt-3 space-y-2">{[...historyTotals(event.depois.items)].map(([pn, total]) => <div key={pn} className="flex items-center justify-between gap-4 text-sm"><span className="break-words font-mono text-cyan-200">{pn}</span><span className="shrink-0 tabular-nums text-slate-300">{before.get(pn) || 0} <span className="mx-2 text-slate-500">→</span> <strong>{total}</strong> un.</span></div>)}</div>
                      </li>;
                    })}</ol>}
            </section> : <section aria-label="Materiais da requisição" className="space-y-4">
              {!canEdit && <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-200">Consulta de materiais. As entregas são confirmadas pelo almoxarifado.</p>}
              {mode === 'correction' && <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="font-semibold text-amber-200">Correção de valores já registrados</p><p className="text-sm text-slate-300">Informe o novo total acumulado. Para registrar uma nova remessa, use a operação de entrega.</p>
                <label htmlFor={reasonId} className="block text-sm font-semibold">Motivo da correção <span className="text-amber-300">(obrigatório ao reduzir)</span></label>
                <textarea ref={reasonRef} id={reasonId} value={reason} onChange={event => { setReason(event.target.value); setEditError(''); }} maxLength={500} rows={2}
                  aria-invalid={!!editError && summary.reduced > 0 && !reason.trim()}
                  aria-describedby={editError && summary.reduced > 0 && !reason.trim() ? `${reasonId}-error` : undefined}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20" />
                {editError && summary.reduced > 0 && !reason.trim() && <p id={`${reasonId}-error`} role="alert" className="text-sm text-red-300">{editError}</p>}
              </div>}
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative w-full min-w-0 sm:flex-1"><span className="sr-only">Buscar material por PN, descrição ou designador</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar PN ou descrição..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/50 py-2.5 pl-9 pr-3 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20" /></label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={pendingOnly} onChange={event => setPendingOnly(event.target.checked)} className="accent-purple-500" />Somente pendentes</label>
              </div>
              {hiddenChanges > 0 && <p role="status" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">{hiddenChanges === 1 ? '1 material editado está oculto pelos filtros. Ele também será incluído na revisão.' : `${hiddenChanges} materiais editados estão ocultos pelos filtros. Eles também serão incluídos na revisão.`}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <h3 className="text-sm font-semibold text-white">Materiais da requisição</h3><span className="text-xs text-slate-400">Exibindo {visible.length} de {items.length}</span>
              </div>
              <div className="space-y-4">{visible.map((item, index) => <DeliveryMaterialCard
                key={item.pn} row={rowsByPN.get(item.pn)!} mode={mode} canEdit={canEdit} inputId={`${reasonId}-${index}`}
                inputRef={element => { inputs.current[item.pn] = element; }}
                onChange={value => { setDraft(previous => ({ ...previous, [item.pn]: value })); setEditError(''); }}
                onAdvance={event => { if (event.key === 'Enter') { event.preventDefault(); const next = visible.slice(index + 1).find(candidate => inputs.current[candidate.pn]); if (next) inputs.current[next.pn]?.focus(); } }}
                onFill={() => setDraft(previous => fillVisibleDelivery(items, previous, [item.pn], mode))}
              />)}</div>
              {!visible.length && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center"><p className="text-slate-400">Nenhum material encontrado para estes filtros.</p><Button variant="outline" className="mt-3" onClick={() => { setSearch(''); setPendingOnly(false); }}>Limpar busca e filtros</Button></div>}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400"><span>Quantidades serão gravadas após a revisão.</span>
                {canEdit && visible.length > 0 && <Button variant="outline" size="sm" onClick={() => setDraft(previous => fillVisibleDelivery(items, previous, visible.map(item => item.pn), mode))}>{mode === 'delivery' ? 'Preencher saldo dos itens exibidos' : 'Usar total pedido dos itens exibidos'}</Button>}</div>
              {editError && !(summary.reduced > 0 && !reason.trim()) && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{editError}</p>}

            </section>}
            </div>}
          </div>
          <DeliverySummary summary={review ? review.summary : summary} mode={mode} canEdit={canEdit} actorName={actorName} review={!!review} />
        </div>}
    </div>

    <footer className="shrink-0 border-t border-slate-700/70 bg-gradient-to-r from-slate-900 via-slate-800/70 to-slate-900 px-4 py-4 sm:px-6" aria-busy={saving}>
      {review ? <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" disabled={saving} onClick={() => deliveryError ? window.location.reload() : setReview(null)}><ArrowLeft className="size-4" />{deliveryError ? 'Atualizar lista' : 'Voltar e editar'}</Button>
        <Button variant={mode === 'correction' ? 'warning' : 'success'} isLoading={saving} disabled={!!deliveryError} onClick={confirm}><CheckCircle2 className="size-4" />{mode === 'correction' ? 'Confirmar correção' : `Confirmar entrega de ${review.summary.added} un.`}</Button>
      </div> : <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm"><p className="font-semibold tabular-nums text-white">{!canEdit ? 'Consulta da requisição' : mode === 'delivery' ? `Nesta entrega: ${summary.added} un. / ${materialCount(summary.changedCount)}` : `${materialCount(summary.changedCount)} com alteração`}</p><p className="mt-1 text-xs text-slate-400">{!canEdit ? `${summary.before} de ${summary.requested} unidades confirmadas` : summary.invalid ? 'Confira os campos com erro.' : summary.changedCount ? `Edição não gravada · após confirmar: ${summary.remaining} un. pendentes` : 'Sem alterações pendentes'}</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={close}>Fechar</Button>
          {canEdit && !materialData.error && <><Button variant="ghost" disabled={!summary.changedCount} onClick={() => { setDraft(initialDeliveryDraft(items, mode)); setReason(''); setEditError(''); }}>Desfazer edição</Button>
            <Button variant="success" disabled={!summary.changedCount || summary.invalid} onClick={prepareReview}>Revisar {mode === 'delivery' ? 'entrega' : 'correção'}<ArrowRight className="size-4" /></Button></>}
        </div>
      </div>}
    </footer>
  </dialog>;
}
