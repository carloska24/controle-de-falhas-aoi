'use client';

import { CheckCircle2, Minus, Package, Plus } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import type { calculateDelivery, DeliveryMode } from '@/lib/deliveryDraft';
import DeliveryProgress from './DeliveryProgress';

type Row = ReturnType<typeof calculateDelivery>['rows'][number];
interface Props {
  row: Row;
  mode: DeliveryMode;
  canEdit: boolean;
  inputId: string;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onAdvance: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFill: () => void;
}

export default function DeliveryMaterialCard({ row, mode, canEdit, inputId, inputRef, onChange, onAdvance, onFill }: Props) {
  const complete = row.requested > 0 && row.before === row.requested;
  const limit = mode === 'delivery' ? row.requested - row.before : row.requested;
  const editable = canEdit && (!complete || mode === 'correction');
  const amount = row.error ? 0 : Number(row.input);
  const status = complete ? 'Concluído' : row.before > 0 ? 'Parcial' : 'Pendente';
  return <article aria-label={`Material ${row.pn}`}
    className={`relative min-w-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-800/95 via-slate-800/65 to-slate-900 p-4 shadow-lg shadow-black/10 sm:p-5 ${row.changed ? 'border-purple-400/55' : 'border-slate-600/45'}`}>
    <div aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${complete ? 'bg-gradient-to-b from-emerald-400 to-teal-600' : 'bg-gradient-to-b from-amber-400 to-orange-600'}`} />
    <div className="grid min-w-0 grid-cols-1 gap-4 pl-1 sm:grid-cols-[minmax(0,1fr)_182px] sm:gap-5">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-purple-400/25 bg-purple-400/10 px-2.5 py-1.5">
            <Package className="size-4 shrink-0 text-purple-300" /><h3 className="min-w-0 break-words font-mono text-lg font-bold text-purple-100">{row.pn}</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${complete ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-200'}`}>
            {complete && <CheckCircle2 className="size-3.5" />}{status}
          </span>
        </div>
        <p className="text-pretty text-base font-medium leading-relaxed text-slate-100">{row.description || 'Descrição não informada'}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <p><span className="mr-2 text-slate-400">Pedido</span><strong className="tabular-nums text-white">{row.requested}</strong></p>
          <p><span className="mr-2 text-slate-400">Saldo atual</span><strong className="tabular-nums text-amber-200">{row.requested - row.before} <span className="text-xs font-normal">un.</span></strong></p>
        </div>
        <DeliveryProgress label="Entrega registrada" accessibleLabel={`Entrega registrada de ${row.pn}`} value={row.before} total={row.requested} />
        {row.designators.length > 0 && <details className="text-xs text-slate-300"><summary className="cursor-pointer text-purple-200">Designadores ({row.designators.length})</summary><p className="mt-2 break-words leading-relaxed">{row.designators.join(', ')}</p></details>}
      </div>
      <div className={`min-w-0 rounded-xl border p-3 ${editable ? 'border-purple-400/20 bg-slate-950/55 shadow-inner shadow-black/20' : complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 bg-slate-950/35'}`}>
        {editable ? <>
          <label htmlFor={inputId} className="block text-center text-xs font-semibold text-slate-200">{mode === 'delivery' ? 'Entregar agora' : 'Novo total entregue'}</label>
          <div className={`mt-2 flex min-w-0 items-center justify-center rounded-lg border bg-slate-900/90 ${row.error ? 'border-red-400/70' : 'border-slate-500/60 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-400/15'}`}>
            <button type="button" aria-label={`Diminuir quantidade de ${row.pn}`} disabled={!!row.error || amount <= 0}
              onClick={() => onChange(String(amount - 1))} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-l-lg text-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"><Minus className="size-4" /></button>
            <input id={inputId} ref={inputRef} type="text" inputMode="numeric" autoComplete="off"
              aria-label={`${mode === 'delivery' ? 'Entregar agora' : 'Novo total entregue'} de ${row.pn}`}
              value={row.input} onFocus={event => event.target.select()} onChange={event => onChange(event.target.value)} onKeyDown={onAdvance}
              aria-invalid={!!row.error} aria-describedby={`${inputId}-${row.error ? 'error' : 'help'}`}
              className="min-w-0 flex-1 bg-transparent px-0 py-2 text-center text-2xl font-bold tabular-nums text-white outline-none" />
            <button type="button" aria-label={`Aumentar quantidade de ${row.pn}`} disabled={!!row.error || amount >= limit}
              onClick={() => onChange(String(amount + 1))} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-r-lg text-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"><Plus className="size-4" /></button>
          </div>
          <p id={`${inputId}-help`} className="mt-1.5 text-center text-xs text-slate-400">{mode === 'delivery' ? 'unidades nesta remessa' : 'unidades acumuladas'}</p>
          {row.error && <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs leading-relaxed text-red-300">{row.error}</p>}
          <button type="button" onClick={onFill} className="mt-2 min-h-9 w-full cursor-pointer rounded-lg border border-purple-400/20 bg-purple-400/10 px-2 text-xs font-semibold text-purple-200 transition-colors hover:border-purple-400/50 hover:bg-purple-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{mode === 'delivery' ? 'Preencher saldo' : 'Usar total pedido'}</button>
        </> : <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 text-center">
          {complete ? <CheckCircle2 className="size-7 text-emerald-300" /> : <Package className="size-7 text-slate-400" />}
          <p className={`text-sm font-semibold ${complete ? 'text-emerald-200' : 'text-slate-300'}`}>{complete ? 'Entrega concluída' : 'Somente consulta'}</p>
          <p className="text-xs text-slate-400">{row.before} de {row.requested} un. registradas</p>
        </div>}
      </div>
    </div>
    {canEdit && row.changed && !row.error && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-purple-400/15 pt-3 pl-1 text-xs">
      <span className="font-semibold text-purple-200">{row.delta >= 0 ? '+' : ''}{row.delta} un. {mode === 'delivery' ? 'nesta entrega' : 'no ajuste'}</span>
      <span className="text-slate-300">Após confirmar: <strong className="tabular-nums text-purple-200">{row.total} / {row.requested}</strong> · saldo {row.remaining} un.</span>
    </div>}
  </article>;
}
