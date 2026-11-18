'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { createActionConfirmation, type ActionConfirmationState } from '@/lib/actionConfirmation';

function ActionConfirmation({ state, onConfirm, onClose }: {
  state: ActionConfirmationState;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const title = useId();
  const description = useId();
  const { request, busy, error } = state;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    cancel.current?.focus();
    return () => { element?.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);

  useEffect(() => {
    if (busy) dialog.current?.focus();
    else if (error) cancel.current?.focus();
  }, [busy, error]);

  if (!request) return null;
  return (
    <dialog ref={dialog} tabIndex={-1} aria-labelledby={title} aria-describedby={description}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;
        const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!first) { event.preventDefault(); dialog.current?.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
      className="m-auto w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70">
      <div className="space-y-5 p-5 sm:p-6" aria-busy={busy}>
        <header>
          <h2 id={title} className="text-xl font-bold">{request.title}</h2>
          <p id={description} className="mt-2 text-sm text-slate-300">{request.description}</p>
        </header>
        {request.omNumber && <p className="break-all font-mono font-semibold">OM: {request.omNumber}</p>}
        {request.records && <div className="max-h-64 overflow-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm">
            <caption className="p-3 text-left font-semibold">{request.records.length} registro(s) afetado(s), incluindo seleções de outras páginas</caption>
            <thead className="bg-slate-800 text-slate-300"><tr><th scope="col" className="p-3">OM</th><th scope="col" className="p-3">Serial completo</th><th scope="col" className="p-3">Designador</th></tr></thead>
            <tbody>{request.records.map(record => <tr key={record.id} className="border-t border-slate-700">
              <td className="break-all p-3">{record.om}</td><td className="break-all p-3 font-mono">{record.serial || 'Não informado'}</td><td className="break-all p-3">{record.designador}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        {error && <div role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
          <p>{error}</p><p className="mt-2">Feche esta janela e atualize a lista antes de tentar novamente. O resultado não será presumido como sucesso.</p>
        </div>}
        <footer className="flex flex-wrap justify-end gap-3">
          <Button ref={cancel} variant="secondary" disabled={busy} onClick={onClose}>{error ? 'Fechar' : 'Voltar sem alterar'}</Button>
          <Button variant="danger" isLoading={busy} disabled={!!error} onClick={onConfirm}>{request.confirmLabel}</Button>
        </footer>
      </div>
    </dialog>
  );
}

export function useActionConfirmation() {
  const [state, setState] = useState<ActionConfirmationState>({ request: null, busy: false, error: '' });
  const [controller] = useState(createActionConfirmation);
  useEffect(() => controller.subscribe(setState), [controller]);
  return {
    requestConfirmation: controller.open,
    isConfirmationOpen: !!state.request,
    confirmationDialog: state.request ? <ActionConfirmation state={state} onConfirm={controller.confirm} onClose={controller.cancel} /> : null,
  };
}
