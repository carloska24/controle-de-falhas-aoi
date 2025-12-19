'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, ArrowRight, Users, Shield, TrendingUp, Lock, Eye, EyeOff } from 'lucide-react';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import UsersTable from '@/components/admin/UsersTable';
import UserForm from '@/components/admin/UserForm';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Badge from '@/components/ui/Badge';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  created_at?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{
    open: boolean;
    userId: string | null;
    newPassword: string;
    showPassword: boolean;
  }>({
    open: false,
    userId: null,
    newPassword: '',
    showPassword: false,
  });
  const [isPending, startTransition] = useTransition();
  const [stats, setStats] = useState({ total: 0, admins: 0, operators: 0 });
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);

  // Handler para navegação
  const handleNavigateToIndex = useCallback(() => {
    setIsNavigatingAway(true);
    // Usa window.location para garantir navegação mesmo em produção
    window.location.href = '/operador';
  }, []);

  useEffect(() => {
    // Não executa checkAuth se estiver navegando
    if (isNavigatingAway) return;

    let mounted = true;

    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          if (mounted && !isNavigatingAway) {
            router.push('/login');
          }
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
          if (mounted && !isNavigatingAway) {
            router.push('/login');
          }
          return;
        }

        // Verifica autenticação no backend antes de carregar dados
        try {
          const meResponse = await fetchAutenticado('/api/auth/me');
          if (mounted && !isNavigatingAway && meResponse?.user) {
            setUser(meResponse.user);
            await loadUsers();
          } else if (mounted && !isNavigatingAway) {
            throw new Error('Usuário não autenticado');
          }
        } catch (authError) {
          console.error('Erro ao verificar autenticação:', authError);
          if (mounted && !isNavigatingAway) {
            localStorage.clear();
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (mounted && !isNavigatingAway) {
          localStorage.clear();
          router.push('/login');
        }
      } finally {
        if (mounted && !isNavigatingAway) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavigatingAway]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAutenticado('/api/users');
      const usersList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      startTransition(() => {
        setUsers(usersList);
        // Atualiza estatísticas contando todas as funções
        setStats({
          total: usersList.length,
          admins: usersList.filter((u: User) => u.role === 'admin').length,
          operators: usersList.filter(
            (u: User) =>
              u.role === 'operator' ||
              u.role === 'reparo' ||
              u.role === 'qualidade' ||
              u.role === 'almoxarifado'
          ).length,
        });
      });
    } catch (error: any) {
      showToast(error.message || 'Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: {
    name: string;
    username: string;
    password: string;
    role: string;
  }) => {
    setFormLoading(true);

    // ATUALIZAÇÃO OTIMISTA - mostra antes da resposta
    const tempUser: User = {
      id: `temp-${Date.now()}`,
      name: formData.name,
      username: formData.username,
      role: formData.role,
    };

    startTransition(() => {
      setUsers([...users, tempUser]);
      setStats({
        total: stats.total + 1,
        admins: formData.role === 'admin' ? stats.admins + 1 : stats.admins,
        operators:
          formData.role === 'operator' ||
          formData.role === 'reparo' ||
          formData.role === 'qualidade' ||
          formData.role === 'almoxarifado'
            ? stats.operators + 1
            : stats.operators,
      });
    });

    try {
      const response = await fetchAutenticado('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      showToast('Usuário cadastrado com sucesso!', 'success');
      setFormOpen(false);

      // Substitui o temporário pelo real
      await loadUsers();
    } catch (error: any) {
      // Reverte a atualização otimista em caso de erro
      setUsers(users.filter(u => u.id !== tempUser.id));
      setStats({
        total: stats.total - 1,
        admins: formData.role === 'admin' ? stats.admins - 1 : stats.admins,
        operators: formData.role === 'operator' ? stats.operators - 1 : stats.operators,
      });
      showToast(error.message || 'Erro ao cadastrar usuário', 'error');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async (formData: {
    name: string;
    username: string;
    password: string;
    role: string;
  }) => {
    if (!editingUser) return;

    setFormLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      await fetchAutenticado(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Usuário atualizado com sucesso!', 'success');
      setEditingUser(null);
      await loadUsers();
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar usuário', 'error');
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);

    // ATUALIZAÇÃO OTIMISTA - remove imediatamente
    startTransition(() => {
      setUsers(users.filter(u => u.id !== userId));
      if (userToDelete) {
        setStats({
          total: stats.total - 1,
          admins: userToDelete.role === 'admin' ? stats.admins - 1 : stats.admins,
          operators:
            userToDelete.role === 'operator' ||
            userToDelete.role === 'reparo' ||
            userToDelete.role === 'qualidade' ||
            userToDelete.role === 'almoxarifado'
              ? stats.operators - 1
              : stats.operators,
        });
      }
    });

    try {
      await fetchAutenticado(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      showToast('Usuário excluído com sucesso!', 'success');
    } catch (error: any) {
      // Reverte em caso de erro
      if (userToDelete) {
        setUsers([...users, userToDelete]);
        setStats({
          total: stats.total + 1,
          admins: userToDelete.role === 'admin' ? stats.admins + 1 : stats.admins,
          operators:
            userToDelete.role === 'operator' ||
            userToDelete.role === 'reparo' ||
            userToDelete.role === 'qualidade' ||
            userToDelete.role === 'almoxarifado'
              ? stats.operators + 1
              : stats.operators,
        });
      }
      showToast(error.message || 'Erro ao excluir usuário', 'error');
    }
  };

  const handleResetPassword = (userId: string) => {
    setResetPasswordDialog({ open: true, userId, newPassword: '', showPassword: false });
  };

  const confirmResetPassword = async () => {
    if (!resetPasswordDialog.userId) return;

    const newPassword = resetPasswordDialog.newPassword.trim();
    if (!newPassword || newPassword.length < 6) {
      showToast('Senha deve ter pelo menos 6 caracteres', 'warning');
      return;
    }

    try {
      await fetchAutenticado(`/api/users/${resetPasswordDialog.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
      showToast('Senha redefinida com sucesso!', 'success');
      setResetPasswordDialog({ open: false, userId: null, newPassword: '', showPassword: false });
    } catch (error: any) {
      showToast(error.message || 'Erro ao redefinir senha', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.role === 'admin') {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/logout`,
          { method: 'POST', credentials: 'include' }
        );
      }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignora erros
    }
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header Moderno */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20"
              >
                <Shield className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                <p className="text-sm text-slate-400">Gerenciamento de Usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNavigateToIndex}
                className="group relative p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                title="Ir para Registro de Falhas"
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavigateToIndex();
                  }
                }}
              >
                <ArrowRight className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-300" />
              </motion.div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">Administrador</p>
              </div>
              <Button variant="danger" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Cards de Estatísticas - ATUALIZAÇÃO OTIMISTA */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 via-green-900/20 to-slate-900 rounded-xl p-6 border border-green-500/20 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Usuários
              </p>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <Users className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-4xl font-black text-green-400">{loading ? '...' : stats.total}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 via-red-900/20 to-slate-900 rounded-xl p-6 border border-red-500/20 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Administradores
              </p>
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <Shield className="w-5 h-5 text-red-500" />
              </div>
            </div>
            <p className="text-4xl font-black text-red-400">{loading ? '...' : stats.admins}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 via-blue-900/20 to-slate-900 rounded-xl p-6 border border-blue-500/20 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Operadores
              </p>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-4xl font-black text-blue-400">{loading ? '...' : stats.operators}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-green-500/10 via-emerald-600/10 to-green-500/5 rounded-xl p-6 border border-green-500/30 shadow-xl hover:shadow-green-500/20 transition-all"
          >
            <Button
              onClick={() => {
                setEditingUser(null);
                setFormOpen(true);
              }}
              variant="success"
              className="w-full h-full py-6 text-base font-semibold"
            >
              <Users className="w-5 h-5 mr-2" />
              Novo Usuário
            </Button>
          </motion.div>
        </div>

        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl p-6 md:p-8"
        >
          {/* Título da Seção */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Usuários Cadastrados</h2>
                <p className="text-sm text-slate-400">Gerencie usuários do sistema</p>
              </div>
            </div>
          </div>

          {/* Tabela Avançada */}
          <UsersTable
            users={users}
            loading={loading}
            onEdit={user => {
              setEditingUser(user);
              setFormOpen(true);
            }}
            onDelete={handleDeleteUser}
            onResetPassword={handleResetPassword}
          />
        </motion.div>
      </div>

      {/* Dialog de Formulário */}
      <Dialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
        size="lg"
        icon={<Users className="w-5 h-5 text-purple-400" />}
      >
        <UserForm
          mode={editingUser ? 'edit' : 'create'}
          initialData={editingUser || undefined}
          onSubmit={editingUser ? handleEditUser : handleCreateUser}
          onCancel={() => {
            setFormOpen(false);
            setEditingUser(null);
          }}
          loading={formLoading}
        />
      </Dialog>

      {/* Dialog de Redefinição de Senha */}
      <Dialog
        open={resetPasswordDialog.open}
        onClose={() =>
          setResetPasswordDialog({
            open: false,
            userId: null,
            newPassword: '',
            showPassword: false,
          })
        }
        title="Redefinir Senha"
        size="sm"
        icon={<Lock className="w-5 h-5 text-purple-400" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nova Senha</label>
            <div className="relative">
              <input
                type={resetPasswordDialog.showPassword ? 'text' : 'password'}
                value={resetPasswordDialog.newPassword}
                onChange={e =>
                  setResetPasswordDialog({ ...resetPasswordDialog, newPassword: e.target.value })
                }
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() =>
                  setResetPasswordDialog({
                    ...resetPasswordDialog,
                    showPassword: !resetPasswordDialog.showPassword,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {resetPasswordDialog.showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Mínimo de 6 caracteres</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/50">
            <Button
              variant="outline"
              onClick={() =>
                setResetPasswordDialog({
                  open: false,
                  userId: null,
                  newPassword: '',
                  showPassword: false,
                })
              }
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmResetPassword}>
              <Lock className="w-4 h-4 mr-2" />
              Redefinir Senha
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
