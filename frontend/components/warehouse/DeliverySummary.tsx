import { ArrowRight, CheckCircle2, Package, ShieldCheck, Truck } from 'lucide-react';
import type { calculateDelivery, DeliveryMode } from '@/lib/deliveryDraft';
import DeliveryProgress from './DeliveryProgress';

type Summary = ReturnType<typeof calculateDelivery>;
interface Props { summary: Summary; mode: DeliveryMode; canEdit: boolean; actorName: string; review: boolean; }

export default function DeliverySummary({ summary, mode, canEdit, actorName, review }: Props) {
  const changes = summary.changedCount;
  return <aside aria-label="Resumo da conferência" className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:self-start">
    <div className="overflow-hidden rounded-2xl border border-purple-400/25 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-900 shadow-xl shadow-black/15">
      <div className="border-b border-purple-400/15 bg-gradient-to-r from-purple-500/15 to-transparent p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-purple-200"><Truck className="size-4" />{!canEdit ? 'Resumo da requisição' : mode === 'correction' ? 'Resumo da correção' : 'Sua remessa'}</div>
        <div className="mt-4 flex items-baseline gap-2"><strong className="text-4xl font-bold tabular-nums text-white">{!canEdit ? summary.before : mode === 'delivery' ? summary.added : changes}</strong><span className="text-sm text-slate-300">{!canEdit || mode === 'delivery' ? 'unidades' : changes === 1 ? 'material' : 'materiais'}</span></div>
        <p className="mt-1 text-xs text-slate-300">{!canEdit ? 'Confirmadas no sistema' : mode === 'correction' ? 'Com alteração de quantidade' : `${changes} ${changes === 1 ? 'material selecionado' : 'materiais selecionados'}`}</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-400">Requisitado</span><strong className="tabular-nums text-slate-200">{summary.requested} un.</strong></div>
          <div className="flex justify-between gap-3"><span className="text-slate-400">Já entregue</span><strong className="tabular-nums text-emerald-300">{summary.before} un.</strong></div>
          {canEdit && <div className="flex justify-between gap-3"><span className="text-slate-400">{mode === 'delivery' ? '+ Nesta remessa' : 'Ajuste líquido'}</span><strong className="tabular-nums text-purple-200">{summary.invalid ? '—' : `${summary.added - summary.reduced >= 0 ? '+' : ''}${summary.added - summary.reduced} un.`}</strong></div>}
        </div>
        <div className="border-t border-slate-700/70 pt-4">
          {summary.total === null ? <p className="text-sm text-amber-200">Corrija os campos indicados para calcular a previsão.</p>
            : canEdit && changes > 0 ? <><DeliveryProgress preview label="Após confirmar" value={summary.total} total={summary.requested} /><p className="mt-3 text-xs text-slate-400">Previsão da edição · ainda não gravada</p></>
              : <p className="flex items-center gap-2 text-sm text-slate-300"><Package className="size-4 text-amber-300" /><strong className="tabular-nums text-amber-200">{summary.requested - summary.before} un.</strong> em aberto</p>}
        </div>
        {canEdit && changes > 0 && !summary.invalid && <div className="flex items-center justify-between gap-2 rounded-xl border border-purple-400/20 bg-purple-400/5 px-3 py-3 text-sm">
          <span className="text-purple-200">Saldo após confirmar</span><strong className="shrink-0 tabular-nums text-white">{summary.remaining} un.</strong>
        </div>}
      </div>
    </div>
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-200"><ShieldCheck className="size-4 text-emerald-300" />{canEdit ? 'Conferência rastreável' : 'Seu acesso'}</p>
      <p className="mt-2 break-words text-sm text-slate-300">{!canEdit && 'Consulta por '}{actorName}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{canEdit ? 'Responsável, data e quantidades registrados somente após a confirmação.' : 'Entregas e correções disponíveis no histórico da requisição.'}</p>
    </div>
    {canEdit && <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-400">{review ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-purple-300" /> : <ArrowRight className="mt-0.5 size-4 shrink-0 text-purple-300" />}<span>{review ? 'Confira os componentes físicos antes de confirmar.' : 'Preencha os materiais e revise a remessa antes de registrar a entrega.'}</span></p>}
  </aside>;
}
