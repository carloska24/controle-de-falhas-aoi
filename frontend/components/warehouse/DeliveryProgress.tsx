interface Props {
  label: string;
  value: number;
  total: number;
  preview?: boolean;
  accessibleLabel?: string;
}

export default function DeliveryProgress({ label, value, total, preview = false, accessibleLabel }: Props) {
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round(value / total * 100))) : 0;
  const complete = total > 0 && value === total;
  const color = preview ? 'from-violet-500 to-fuchsia-400' : complete
    ? 'from-emerald-500 to-teal-300' : 'from-amber-500 to-orange-400';
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={preview ? 'font-medium text-purple-200' : 'text-slate-300'}>{label}</span>
      <span className="shrink-0 tabular-nums"><strong className={preview ? 'text-purple-200' : complete ? 'text-emerald-300' : 'text-amber-200'}>{value} / {total}</strong><span className="ml-2 text-slate-400">{percent}%</span></span>
    </div>
    <div role={total > 0 ? 'meter' : undefined} aria-label={total > 0 ? accessibleLabel || label : undefined}
      aria-valuemin={total > 0 ? 0 : undefined} aria-valuemax={total > 0 ? 100 : undefined}
      aria-valuenow={total > 0 ? percent : undefined}
      aria-valuetext={total > 0 ? `${value} de ${total} unidades ${preview ? 'após confirmar' : 'confirmadas'}` : undefined}
      className="h-2 overflow-hidden rounded-full bg-slate-950/75 ring-1 ring-white/5">
      <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${percent}%` }} />
    </div>
    {total === 0 && <p className="text-xs text-slate-400">Sem quantidade requisitada.</p>}
  </div>;
}
