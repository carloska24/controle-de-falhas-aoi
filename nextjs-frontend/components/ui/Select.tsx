'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  icon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, icon, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <select
          ref={ref}
            className={cn(
              'w-full py-3 rounded-lg border text-white',
              'focus:outline-none focus:ring-2 transition-all',
              icon ? 'pl-10' : 'pl-4',
              'pr-4',
              // Background padrão apenas se não for fornecido
              !className?.includes('bg-') && 'bg-slate-800/50',
              error
                ? 'border-red-500 focus:ring-red-500/20'
                : 'border-slate-700 focus:border-green-500 focus:ring-green-500/20',
              // className por último para ter prioridade máxima
              className
            )}
            style={{
              ...(className?.includes('!bg-') || className?.includes('bg-[#0f1a2b]')
                ? { backgroundColor: '#0f1a2b' }
                : {}),
              ...props.style,
            } as React.CSSProperties}
            {...props}
          >
            {options && Array.isArray(options) ? (
              options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ) : (
              children
            )}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;

