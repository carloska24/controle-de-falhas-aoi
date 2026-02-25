'use client';

import { AlertTriangle, X } from 'lucide-react';
import Dialog from './Dialog';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const iconColors = {
    danger: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'warning' as const,
    info: 'primary' as const,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      icon={<AlertTriangle className={`w-5 h-5 ${iconColors[variant]}`} />}
    >
      <div className="space-y-6">
        <p className="text-slate-300 leading-relaxed">{message}</p>
        
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processando...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

