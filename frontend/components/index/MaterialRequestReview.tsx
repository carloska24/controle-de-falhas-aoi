'use client';

import { useEffect, useId, useRef, useState } from 'react';
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

  return (
    <dialog ref={dialog} aria-labelledby={title} aria-describedby={description}
      onCancel={event => { event.preventDefault(); if (!sending.current) onClose(); }}
      onKeyDown={event => event.stopPropagation()}
      className="m-auto w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
      <div className="space-y-5 p-5 sm:p-6" aria-busy={busy}>
        <header>
          <p className="mb-1 text-xs font-semibold uppercase text-emerald-400">Almoxarifado</p>
          <h2 id={title} className="text-xl font-bold">Revisar requisição de materiais</h2>
          <p id={description} className="mt-2 text-sm text-slate-300">Confira os registros antes de enviar. Materiais já solicitados não serão duplicados.</p>
        </header>
        <div className="grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
          <div className="rounded-lg border border-slate-700 p-3"><strong className="block text-2xl">{ids.length}</strong>Selecionados</div>
          <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-3"><strong className="block text-2xl text-emerald-300">{review.eligible.length}</strong>Aptos para envio</div>
          <div className="rounded-lg border border-slate-700 p-3"><strong className="block text-2xl">{review.excluded.length}</strong>Não serão enviados</div>
        </div>
        {review.groups.length > 0 && <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm">
            <caption className="p-3 text-left font-semibold">Materiais aptos · quantidade por registro</caption>
            <thead className="bg-slate-800 text-slate-300"><tr><th scope="col" className="p-3">OM</th><th scope="col" className="p-3">PN</th><th scope="col" className="p-3 text-right">Qtd.</th></tr></thead>
            <tbody>{review.groups.map(group => <tr key={JSON.stringify([group.om, group.pn])} className="border-t border-slate-700"><td className="p-3 break-all">{group.om}</td><td className="p-3 break-all font-mono">{group.pn}</td><td className="p-3 text-right tabular-nums">{group.quantity}</td></tr>)}</tbody>
          </table>
        </div>}
        {review.excluded.length > 0 && <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm">
          <h3 className="font-semibold text-amber-200">Estes registros continuarão selecionados</h3>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-slate-200">{review.excluded.map(item => <li key={item.id} className="break-words"><strong>{item.registro?.designador || item.id}</strong> · {item.registro?.tipodefeito || 'Indisponível'} — {item.reason}</li>)}</ul>
        </div>}
        {!review.eligible.length && <p className="text-sm text-amber-200">Nenhum registro está apto. Confira os motivos acima antes de tentar novamente.</p>}
        {tooMany && <p role="alert" className="text-sm text-amber-200">Envie no máximo 200 registros por vez. Cancele e reduza a seleção.</p>}
        {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">{error} Sua seleção foi mantida.</p>}
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-700 pt-4">
          <Button autoFocus variant="secondary" onClick={onClose} disabled={busy}>Voltar à seleção</Button>
          <Button variant="success" onClick={confirm} disabled={!review.eligible.length || tooMany} isLoading={busy}>Confirmar envio de {review.eligible.length} registro(s)</Button>
        </footer>
      </div>
    </dialog>
  );
}
