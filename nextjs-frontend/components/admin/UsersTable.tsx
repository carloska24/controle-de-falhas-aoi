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
} from '@tanstack/react-table';
import {
  Edit2,
  Trash2,
  RotateCcw,
  MoreVertical,
  Search,
  Download,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  created_at?: string;
}

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  loading?: boolean;
}

const roleLabels: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  admin: { label: 'Administrador', variant: 'warning' },
  operator: { label: 'Operador AOI', variant: 'success' },
  reparo: { label: 'Operador Reparo', variant: 'warning' },
  qualidade: { label: 'Analista de Qualidade', variant: 'info' },
  almoxarifado: { label: 'Almoxarifado', variant: 'default' },
};

export default function UsersTable({
  users,
  onEdit,
  onDelete,
  onResetPassword,
  loading,
}: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });

  const handleExportCSV = () => {
    const headers = ['Nome Completo', 'Usuário', 'Função', 'Data de Criação'];
    const rows = users.map(user => [
      user.name,
      user.username,
      roleLabels[user.role]?.label || user.role,
      user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy HH:mm') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Nome Completo
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
              {row.original.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-white">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'username',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Usuário
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
          <span className="text-slate-300 font-mono text-sm">@{row.original.username}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            Função
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
          const role = roleLabels[row.original.role] || {
            label: row.original.role,
            variant: 'default' as const,
          };
          return <Badge variant={role.variant}>{role.label}</Badge>;
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Data de Criação',
        cell: ({ row }) => {
          if (!row.original.created_at) return '-';
          return (
            <span className="text-slate-400 text-sm">
              {format(new Date(row.original.created_at), "dd/MM/yyyy 'às' HH:mm")}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Ações',
        cell: ({ row }) => {
          const user = row.original;
          const isMenuOpen = actionMenu === user.id;

          return (
            <div className="relative flex items-center justify-center gap-2">
              {/* Botão de Editar Direto - Mais Visível */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onEdit(user)}
                className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all border border-blue-500/30"
                title="Editar usuário"
              >
                <Edit2 className="w-4 h-4" />
              </motion.button>

              {/* Menu de Mais Opções */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenu(isMenuOpen ? null : user.id);
                }}
                className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white border border-slate-600/50"
                title="Mais opções"
              >
                <MoreVertical className="w-5 h-5" />
              </motion.button>
            </div>
          );
        },
      },
    ],
    [actionMenu, onEdit, onDelete, onResetPassword]
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Encontrar usuário para o modal de ações
  const actionUser = actionMenu ? users.find(u => u.id === actionMenu) : null;

  return (
    <>
      {/* Modal de Ações do Usuário */}
      <Dialog
        open={!!actionMenu && !!actionUser}
        onClose={() => setActionMenu(null)}
        title={`Ações - ${actionUser?.name || ''}`}
        size="sm"
        icon={<MoreVertical className="w-5 h-5 text-purple-400" />}
      >
        {actionUser && (
          <div className="space-y-3">
            {/* Editar Usuário */}
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => {
                onEdit(actionUser);
                setActionMenu(null);
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 text-slate-300 hover:bg-blue-500/10 hover:text-blue-400 transition-all group rounded-lg border border-slate-700/50 hover:border-blue-500/30"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                <Edit2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">Editar Usuário</p>
                <p className="text-xs text-slate-500 group-hover:text-slate-400">Modificar dados do usuário</p>
              </div>
            </motion.button>

            {/* Redefinir Senha */}
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => {
                onResetPassword(actionUser.id);
                setActionMenu(null);
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400 transition-all group rounded-lg border border-slate-700/50 hover:border-amber-500/30"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30 group-hover:bg-amber-500/30 transition-colors">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">Redefinir Senha</p>
                <p className="text-xs text-slate-500 group-hover:text-slate-400">Definir nova senha</p>
              </div>
            </motion.button>

            {/* Divisor */}
            {actionUser.role !== 'admin' && (
              <div className="my-2 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            )}

            {/* Excluir Usuário - Apenas para não-admins */}
            {actionUser.role !== 'admin' && (
              <motion.button
                whileHover={{ x: 4 }}
                onClick={() => {
                  setDeleteDialog({ open: true, userId: actionUser.id });
                  setActionMenu(null);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group rounded-lg border border-slate-700/50 hover:border-red-500/30"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30 group-hover:bg-red-500/30 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-base">Excluir Usuário</p>
                  <p className="text-xs text-slate-500 group-hover:text-red-400/70">Remover permanentemente</p>
                </div>
              </motion.button>
            )}
          </div>
        )}
      </Dialog>

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Badge variant="info">{table.getFilteredRowModel().rows.length} usuários</Badge>
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
                        Carregando usuários...
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <UserPlus className="w-12 h-12 opacity-50" />
                        <p className="text-sm">Nenhum usuário encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-800/50 transition-colors"
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
                Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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

      {/* Dialog de Confirmação */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, userId: null })}
        title="Confirmar Exclusão"
        size="sm"
        icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
      >
        <div className="space-y-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold mb-2">Atenção!</p>
                <p className="text-slate-300 text-sm">
                  Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, userId: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteDialog.userId) {
                  onDelete(deleteDialog.userId);
                  setDeleteDialog({ open: false, userId: null });
                }
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Excluir Usuário
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

