'use client';

import { Fragment, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: ReactNode;
}

export default function Dialog({
  open,
  onClose,
  title,
  children,
  size = 'md',
  icon,
}: DialogProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay com blur melhorado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'relative w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/10 max-h-[90vh] flex flex-col pointer-events-auto',
                sizes[size]
              )}
            >
              {/* Header melhorado */}
              {title && (
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {icon && (
                      <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                        {icon}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-all p-2 rounded-lg hover:bg-slate-700/50 hover:border border-slate-600/50"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Content com scroll suave */}
              <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

