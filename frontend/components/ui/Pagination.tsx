'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Button from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  showInfo?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 12,
  showInfo = true,
}: PaginationProps) {
  // Não renderizar se houver apenas uma página ou nenhuma página
  if (totalPages <= 1 || totalPages === 0) return null;

  // Validar e normalizar valores
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const safeTotalPages = Math.max(1, totalPages);
  const safeTotalItems = Math.max(0, totalItems || 0);

  // Handler seguro para mudança de página
  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, safeTotalPages));
    if (validPage !== safeCurrentPage) {
      onPageChange(validPage);
    }
  };

  const startItem = Math.max(1, (safeCurrentPage - 1) * itemsPerPage + 1);
  const endItem = Math.min(safeCurrentPage * itemsPerPage, safeTotalItems);

  const buildPageItems = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible + 2) {
      for (let p = 1; p <= safeTotalPages; p += 1) pages.push(p);
      return pages;
    }

    pages.push(1);
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(2, safeCurrentPage - half);
    let end = Math.min(safeTotalPages - 1, safeCurrentPage + half);

    if (safeCurrentPage <= 3) {
      start = 2;
      end = 6;
    } else if (safeCurrentPage >= safeTotalPages - 2) {
      start = safeTotalPages - 5;
      end = safeTotalPages - 1;
    }

    if (start > 2) pages.push('ellipsis');
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (end < safeTotalPages - 1) pages.push('ellipsis');
    pages.push(safeTotalPages);

    return pages;
  };

  const pageItems = buildPageItems();

  return (
    <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-[#314566]">
      {/* Informações */}
      {showInfo && safeTotalItems > 0 && (
        <div className="text-sm text-slate-400">
          Mostrando <span className="text-[#b5c6e3] font-semibold">{startItem}</span> a{' '}
          <span className="text-[#b5c6e3] font-semibold">{endItem}</span> de{' '}
          <span className="text-[#b5c6e3] font-semibold">{safeTotalItems}</span> resultado{safeTotalItems !== 1 ? 's' : ''}
        </div>
      )}

      {/* Controles de Navegação */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Primeira Página */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePageChange(1)}
          disabled={safeCurrentPage === 1}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Página Anterior */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="text-slate-400 hover:text-white hover:bg-[#1a2535] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>

        {/* Numeração de páginas */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0f1a2b]/50 border border-[#314566]/50">
          {pageItems.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-500">
                ...
              </span>
            ) : (
              <Button
                key={`page-${item}`}
                size="sm"
                variant={item === safeCurrentPage ? 'primary' : 'ghost'}
                onClick={() => handlePageChange(item)}
                className={
                  item === safeCurrentPage
                    ? 'min-w-[34px] h-8 px-2 text-xs'
                    : 'min-w-[34px] h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-[#1a2535]'
                }
                aria-label={`Ir para página ${item}`}
              >
                {item}
              </Button>
            )
          )}
        </div>

        {/* Próxima Página */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          className="text-slate-400 hover:text-white hover:bg-[#1a2535] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>

        {/* Última Página */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handlePageChange(safeTotalPages)}
          disabled={safeCurrentPage === safeTotalPages}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

