'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import type { Registro } from '@/types';
import { reviewMaterialRequest, type MaterialRequestResult } from '@/lib/materialRequest';
import Button from '@/components/ui/Button';

interface Props {
  registros: Registro[];
  ids: string[];
  onSubmit: (ids: string[]) => Promise<MaterialRequestResult>;
  onComplete: (ids: string[]) => void;
  onClose: () => void;
}

export default function MaterialRequestReview({ registros, ids, onSubmit, onComplete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = useId();
  const description = useId();
  const review = reviewMaterialRequest(registros, ids);
  const tooMany = review.eligible.length > 200;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    heading.current?.focus();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);

  async function confirm() {
    if (sending.current || !review.eligible.length || tooMany) return;
    sending.current = true;
    setBusy(true);
    setError('');
    const submitted = review.eligible.map(registro => registro.id);
    try {
      await onSubmit(submitted);
      onComplete(submitted);
    } catch (err) {
      const failure = err as Error & { details?: { invalidRecords?: { id: string; reason: string }[] } };
      const details = failure.details?.invalidRecords;
      const reason = Array.isArray(details) ? details.map(item => {
        const registro = registros.find(row => row.id === item.id);
        return `${registro?.designador || item.id}: ${item.reason}`;
      }).join(' ') : '';
      setError([failure.message || 'Não foi possível requisitar. Tente novamente.', reason].filter(Boolean).join(' '));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const orders = [...review.orders].sort((a, b) => a.om.localeCompare(b.om, 'pt-BR', { numeric: true }));

  return (
    <dialog ref={dialog} aria-labelledby={title} aria-describedby={description}
      onCancel={event => { event.preventDefault(); if (!sending.current) onClose(); }}
      onKeyDown={event => event.stopPropagation()}
      className="m-auto w-[calc(100%_-_1.5rem)] max-w-4xl max-h-[90dvh] overflow-hidden rounded-2xl border border-slate-600/70 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
      <div className="flex max-h-[90dvh] flex-col" aria-busy={busy}>
        <header className="shrink-0 border-b border-slate-700/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-300"><Package aria-hidden="true" className="size-4" />Almoxarifado</p>
              <h2 ref={heading} tabIndex={-1} id={title} className="text-balance text-xl font-semibold text-white outline-none sm:text-2xl">Requisitar componentes</h2>
              <p id={description} className="mt-2 text-pretty text-sm text-slate-400">Confira os códigos e as quantidades para enviar ao almoxarifado.</p>
            </div>
            <button type="button" aria-label="Fechar revisão da requisição" onClick={onClose} disabled={busy}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-300 disabled:cursor-not-allowed disabled:opacity-40"><X aria-hidden="true" className="size-5" /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {review.eligible.length > 0 ? <>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-slate-200">Materiais da requisição</h3>
              <p className="text-xs tabular-nums text-slate-400">{orders.length} {orders.length === 1 ? 'OM' : 'OMs'}<span aria-hidden="true" className="mx-2 text-slate-600">/</span>{review.uniquePNs} {review.uniquePNs === 1 ? 'PN distinto' : 'PNs distintos'}</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-700/80">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <caption className="sr-only">Componentes aptos para requisição, agrupados por ordem de manufatura</caption>
                <colgroup><col /><col className="w-20 sm:w-28" /></colgroup>
                <thead className="bg-slate-800/60 text-xs text-slate-400">
                  <tr><th scope="col" className="px-4 py-3 font-medium"><div className="sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"><span>Código / PN</span><span className="hidden sm:inline">Descrição</span></div></th><th scope="col" className="px-4 py-3 text-right font-medium">Qtd.</th></tr>
                </thead>
                {orders.map(order => <tbody key={order.om} aria-label={`OM ${order.om}`}>
                  <tr className="border-y border-slate-700/70 bg-slate-800/40">
                    <th scope="rowgroup" colSpan={2} className="px-4 py-2.5 font-normal">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2.5"><span aria-hidden="true" className="h-4 w-0.5 rounded-full bg-purple-400" /><span className="text-xs text-slate-400">OM</span><span className="break-all font-mono text-sm font-semibold text-purple-200">{order.om}</span></span>
                        <span className="text-xs tabular-nums text-slate-400">{order.materials.length} {order.materials.length === 1 ? 'item' : 'itens'}</span>
                      </div>
                    </th>
                  </tr>
                  {[...order.materials].sort((a, b) => a.pn.localeCompare(b.pn, 'pt-BR', { numeric: true })).map(material => <tr key={material.pn} className="border-b border-slate-800 last:border-b-0">
                    <th scope="row" className="px-4 py-4 font-normal">
                      <div className="space-y-1.5 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-4 sm:space-y-0">
                        <span className="block break-all font-mono font-semibold text-slate-100">{material.pn}</span>
                        <span className="block break-words text-xs leading-relaxed text-slate-400 sm:text-sm">{material.descriptions.length ? material.descriptions.join(' · ') : 'Descrição não informada'}</span>
                      </div>
                    </th>
                    <td className="px-4 py-4 text-right align-top sm:align-middle"><span className="text-lg font-semibold tabular-nums text-slate-100">{material.quantity}</span><span className="ml-1 text-xs text-slate-500">un.</span></td>
                  </tr>)}
                </tbody>)}
              </table>
            </div>
            <p className="mt-3 text-pretty text-xs leading-relaxed text-slate-400">Uma unidade por registro apto. Registros já requisitados não serão duplicados.</p>
          </> : <div className="py-8 text-center">
            <Package aria-hidden="true" className="mx-auto mb-3 size-7 text-slate-500" />
            <h3 className="font-medium text-slate-200">Nenhum material apto nesta seleção</h3>
            <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-slate-400">Selecione registros com PN e defeito Ausente, Danificado ou Incorreto.</p>
          </div>}
        </div>

        <footer className="shrink-0 border-t border-slate-700/70 bg-slate-800/30 px-5 py-4 sm:px-7">
          {tooMany && <p role="alert" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Envie no máximo 200 registros por vez. Volte e reduza a seleção.</p>}
          {error && <p role="alert" className="mb-4 max-h-28 overflow-y-auto break-words rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error} Sua seleção foi mantida.</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="flex items-baseline gap-3 text-sm"><span className="text-slate-400">{busy ? 'Enviando…' : 'Total a requisitar'}</span><span className="font-semibold tabular-nums text-white">{review.eligible.length}<span className="ml-1 font-normal text-slate-400">un.</span></span></p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={onClose} disabled={busy} className="min-h-11 flex-1 border-slate-600 bg-transparent sm:flex-none">Voltar à seleção</Button>
              <Button variant="success" onClick={confirm} disabled={!review.eligible.length || tooMany} isLoading={busy} className="min-h-11 flex-1 bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-400 sm:flex-none">Confirmar requisição</Button>
            </div>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
