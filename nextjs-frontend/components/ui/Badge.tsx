'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
    success:
      'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_12px_-3px_rgba(74,222,128,0.2)]',
    warning:
      'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_-3px_rgba(251,191,36,0.2)]',
    danger:
      'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_12px_-3px_rgba(248,113,113,0.2)]',
    info: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_-3px_rgba(34,211,238,0.2)]',
    secondary: 'bg-slate-800/50 text-slate-400 border border-slate-700/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
