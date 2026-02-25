'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary para capturar erros de renderização React
 * Exibe uma UI amigável quando ocorre um erro
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do erro para debugging
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
    
    // Callback opcional para logging externo
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usar ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 rounded-xl border border-red-500/30">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            {/* Ícone de erro */}
            <div className="relative p-4 bg-red-500/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            {/* Mensagem de erro */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">
                Oops! Algo deu errado
              </h2>
              <p className="text-sm text-slate-400">
                Ocorreu um erro inesperado. Tente recarregar a página ou entre em contato com o suporte.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-900/50 rounded text-xs text-red-400 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
            </div>

            {/* Botão de ação */}
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

