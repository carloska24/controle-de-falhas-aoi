'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table';
import { Trash2, FileText, Wand2, ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Registro } from '@/types/index';
import Button from '@/components/ui/Button';
import { format } from 'date-fns';
import Badge from '@/components/ui/Badge';

interface RegistrosTableProps {
  registros: Registro[];
  onDelete: (ids: string[]) => Promise<void>;
  onGenerateRequest: (ids: string[]) => Promise<void>;
  onAddDemo: () => Promise<void>;
  loading?: boolean;
}

export default function RegistrosTable({
  registros,
  onDelete,
  onGenerateRequest,
  onAddDemo,
  loading,
}: RegistrosTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key]);
  }, [rowSelection]);

  const columns = useMemo<ColumnDef<Registro>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
          />
        ),
      },
      {
        accessorKey: 'om',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            OM
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-green-400">{row.original.om}</span>
        ),
      },
      {
        accessorKey: 'pn',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Cod. Alt
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-300">{row.original.pn || '—'}</span>
        ),
      },
      {
        accessorKey: 'serial',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Serial
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-300 font-mono text-sm">
            {row.original.serial || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'designador',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Designador
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-white">{row.original.designador}</span>
        ),
      },
      {
        accessorKey: 'tipodefeito',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Defeito
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="warning">{row.original.tipodefeito}</Badge>
        ),
      },
      {
        accessorKey: 'descricao',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Descrição
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-400 text-sm">{row.original.descricao || '—'}</span>
        ),
      },
      {
        accessorKey: 'createdat',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Data/Hora
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          try {
            return (
              <span className="text-slate-400 text-sm">
                {format(new Date(row.original.createdat), "dd/MM/yyyy HH:mm")}
              </span>
            );
          } catch {
            return <span className="text-slate-400 text-sm">—</span>;
          }
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: registros,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    await onDelete(selectedIds);
    setRowSelection({});
  };

  const handleGenerateRequest = async () => {
    if (selectedIds.length === 0) return;
    await onGenerateRequest(selectedIds);
    setRowSelection({});
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Excluir ({selectedIds.length})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateRequest}
            disabled={selectedIds.length === 0}
          >
            <FileText className="w-4 h-4" />
            Requisitar ({selectedIds.length})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onAddDemo}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
          >
            <Wand2 className="w-4 h-4" />
            DEMO
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar registros..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      Carregando registros...
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <p className="text-sm">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onDoubleClick={() => {
                      // TODO: Editar registro (double click)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-900/30">
            <div className="text-sm text-slate-400">
              Página {table.getState().pagination.pageIndex + 1} de{' '}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

