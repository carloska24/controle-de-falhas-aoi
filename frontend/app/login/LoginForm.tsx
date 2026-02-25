'use client';

import { useState, FormEvent, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAutenticado } from '@/lib/api';
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, CheckCircle2, User, Lock } from 'lucide-react';
import Logo from './Logo';

interface FormErrors {
  username?: string;
  password?: string;
  general?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [touched, setTouched] = useState({ username: false, password: false });

  const validateField = (field: 'username' | 'password', value: string): string | undefined => {
    // Validação removida - não mostra mais mensagens de obrigatório
    return undefined;
  };

  const handleChange = (field: 'username' | 'password', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo quando começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Marcar como touched
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }
  };

  const handleBlur = (field: 'username' | 'password') => {
    setFocused(null);
    setTouched(prev => ({ ...prev, [field]: true }));
    // Validação removida - não mostra mais mensagens
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Validação silenciosa - apenas verifica se os campos estão preenchidos
    if (!formData.username.trim() || !formData.password.trim()) {
      return; // Não mostra mensagem, apenas bloqueia o submit
    }

    startTransition(async () => {
      try {
        const data = await fetchAutenticado('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(formData),
        });

        if (data?.user) {
          // Salva o usuário no localStorage
          localStorage.setItem('user', JSON.stringify(data.user));

          // Redireciona diretamente - o cookie foi definido pelo servidor
          // Se houver problema, a página de destino vai detectar e tratar
          // Se for Lider SMD, vai para conferência
          const redirectPath =
            data.user.role === 'admin'
              ? '/admin'
              : data.user.role === 'lider_smt'
              ? '/smt/conferencia'
              : '/operador';

          // Usa window.location para garantir que o cookie seja enviado
          // Isso força uma navegação completa e garante que os cookies sejam incluídos
          window.location.href = redirectPath;
        }
      } catch (err: any) {
        setErrors({
          general:
            err.message ||
            'Usuário ou senha inválidos. Verifique suas credenciais e tente novamente.',
        });
      }
    });
  };

  const isFormValid = formData.username.trim() && formData.password.trim();
  const isLoading = isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <div className="bg-slate-900/85 backdrop-blur-xl rounded-2xl p-8 md:p-10 shadow-2xl border border-slate-800/50 relative overflow-hidden">
        {/* Efeito de brilho sutil no card */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

        {/* Header com Logo SVG */}
        <motion.header
          className="text-center mb-8 relative z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Logo />
          <motion.h1
            className="text-2xl md:text-3xl font-bold text-white mb-2 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.5 }}
          >
            Controle de Falhas AOI
          </motion.h1>
          <motion.p
            className="text-sm md:text-base text-green-500 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            CADService Produtos Eletrônicos
          </motion.p>
        </motion.header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10" noValidate>
          {/* Erro Geral */}
          <AnimatePresence>
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{errors.general}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Campo Username */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.2, duration: 0.4 }}
          >
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2"
            >
              <User className="w-4 h-4 text-green-500" />
              Nome de Usuário
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={e => handleChange('username', e.target.value)}
                onFocus={() => setFocused('username')}
                onBlur={() => handleBlur('username')}
                placeholder="Digite seu usuário"
                disabled={isLoading}
                autoComplete="username"
                autoFocus
                spellCheck={false}
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
                className={`w-full px-4 py-3.5 rounded-lg bg-slate-950/80 border-2 text-white placeholder-slate-500 
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  backdrop-blur-sm
                  ${
                    errors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                      : focused === 'username'
                      ? 'border-green-500 ring-4 ring-green-500/20 bg-slate-900/80'
                      : 'border-slate-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/20'
                  }`}
              />
              <AnimatePresence>
                {touched.username && !errors.username && formData.username && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {errors.username && (
                <motion.p
                  id="username-error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-1.5 text-sm text-red-400 flex items-center gap-1"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.username}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Campo Password */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.4, duration: 0.4 }}
          >
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-green-500" />
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => handleBlur('password')}
                placeholder="Digite sua senha"
                disabled={isLoading}
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={`w-full px-4 py-3.5 pr-14 rounded-lg bg-slate-950/80 border-2 text-white placeholder-slate-500 
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  backdrop-blur-sm
                  ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                      : focused === 'password'
                      ? 'border-green-500 ring-4 ring-green-500/20 bg-slate-900/80'
                      : 'border-slate-700 focus:border-green-500 focus:ring-4 focus:ring-green-500/20'
                  }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <AnimatePresence>
                  {touched.password && !errors.password && formData.password && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500" aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>
            <AnimatePresence>
              {errors.password && (
                <motion.p
                  id="password-error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-1.5 text-sm text-red-400 flex items-center gap-1"
                >
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Botão Submit */}
          <motion.button
            type="submit"
            disabled={isLoading || !isFormValid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.4 }}
            whileHover={
              !isLoading && isFormValid
                ? {
                    scale: 1.02,
                    boxShadow: '0 20px 40px rgba(34, 197, 94, 0.3)',
                  }
                : {}
            }
            whileTap={!isLoading && isFormValid ? { scale: 0.98 } : {}}
            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-base
              shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/40 
              transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed 
              flex items-center justify-center gap-2 relative overflow-hidden group"
          >
            {/* Efeito de brilho animado */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: isFormValid && !isLoading ? '100%' : '-100%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10">Entrando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Entrar</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <motion.footer
          className="mt-8 pt-6 border-t border-slate-800/50 text-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8, duration: 0.5 }}
        >
          <p className="text-xs text-slate-500 mb-2">Desenvolvido por:</p>
          <div className="logo-text-external">
            <span className="dev-part">Dev</span>
            <span className="pratica-part">NaPratica</span>
          </div>
        </motion.footer>
      </div>
    </motion.div>
  );
}
