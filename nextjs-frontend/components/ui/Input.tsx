'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, showPasswordToggle, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password' && showPasswordToggle;
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full rounded-lg border text-white placeholder-slate-500',
              'focus:outline-none focus:ring-2 transition-all',
              icon ? 'pl-10' : 'pl-4',
              showPasswordToggle ? 'pr-12' : 'pr-4',
              'py-3',
              // Background padrão apenas se não for fornecido
              !className?.includes('bg-') && 'bg-[#0f1a2b]',
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-800 focus:border-purple-500 focus:ring-purple-500/20',
              // className por último para ter prioridade máxima
              className
            )}
            style={
              {
                ...(className?.includes('!bg-') || className?.includes('bg-[#0f1a2b]')
                  ? { backgroundColor: '#0f1a2b' }
                  : {}),
                ...props.style,
              } as React.CSSProperties
            }
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
