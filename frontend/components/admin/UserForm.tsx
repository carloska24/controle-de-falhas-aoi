'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Save, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { User, Lock } from 'lucide-react';

interface UserFormProps {
  onSubmit: (data: {
    name: string;
    username: string;
    password: string;
    role: string;
  }) => Promise<void>;
  onCancel?: () => void;
  initialData?: {
    name: string;
    username: string;
    role: string;
  };
  mode?: 'create' | 'edit';
  loading?: boolean;
}

const roleOptions = [
  { value: 'operator', label: 'Operador AOI' },
  { value: 'reparo', label: 'Operador Reparo' },
  { value: 'qualidade', label: 'Analista de Qualidade' },
  { value: 'almoxarifado', label: 'Almoxarifado' },
  { value: 'lider_smt', label: 'Líder SMD' },
  { value: 'admin', label: 'Administrador' },
];

export default function UserForm({
  onSubmit,
  onCancel,
  initialData,
  mode = 'create',
  loading,
}: UserFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    username: initialData?.username || '',
    password: '',
    role: initialData?.role || 'operator',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Usuário é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Usuário deve ter pelo menos 3 caracteres';
    }

    if (mode === 'create' && !formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      if (mode === 'create') {
        setFormData({
          name: '',
          username: '',
          password: '',
          role: 'operator',
        });
      }
      setErrors({});
    } catch (error: any) {
      setErrors({ submit: error.message || 'Erro ao salvar usuário' });
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {errors.submit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
        >
          <div className="flex items-center gap-2">
            <X className="w-5 h-5" />
            <p className="font-semibold">{errors.submit}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Nome Completo"
          value={formData.name}
          onChange={e => {
            setFormData({ ...formData, name: e.target.value });
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
          icon={<User className="w-5 h-5" />}
          placeholder="Ex: João Silva"
          required
        />

        <Input
          label="Nome de Usuário"
          value={formData.username}
          onChange={e => {
            setFormData({ ...formData, username: e.target.value.toLowerCase() });
            if (errors.username) setErrors({ ...errors, username: '' });
          }}
          error={errors.username}
          icon={<User className="w-5 h-5" />}
          placeholder="Ex: joao.silva"
          required
        />
      </div>

      {mode === 'create' && (
        <Input
          label="Senha Provisória"
          type="password"
          value={formData.password}
          onChange={e => {
            setFormData({ ...formData, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          error={errors.password}
          icon={<Lock className="w-5 h-5" />}
          showPasswordToggle
          placeholder="Mínimo 6 caracteres"
          required
        />
      )}

      <Select
        label="Função do Usuário"
        value={formData.role}
        onChange={e => setFormData({ ...formData, role: e.target.value })}
        options={roleOptions}
      />

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-700/50 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent -mx-6 px-6 -mb-6 pb-6">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          isLoading={loading}
          variant={mode === 'create' ? 'primary' : 'success'}
        >
          {mode === 'create' ? (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar Usuário
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </motion.form>
  );
}
