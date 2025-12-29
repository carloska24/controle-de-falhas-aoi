'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Save, Brush, PlayCircle, Sparkles } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>;
  onClear: () => void;
  onStartOM: () => void;
  onNewOM: () => void;
  isOMRunning: boolean;
  isOMLocked: boolean;
}

export interface RegisterData {
  om: string;
  qtdlote: number;
  serial: string;
  designador: string;
  tipodefeito: string;
  pn: string;
  descricao: string;
  obs: string;
}

const TIPOS_DEFEITO = [
  { label: '— Selecione —', value: '' },
  {
    label: 'Falhas Relacionadas à Soldagem',
    options: [
      { value: 'Curto', label: 'Curto' },
      { value: 'Solda Fria', label: 'Solda Fria' },
      { value: 'Excesso de Solda', label: 'Excesso de Solda' },
      { value: 'Insuficiência de Solda', label: 'Insuficiência de Solda' },
      { value: 'Tombstone', label: 'Tombstone' },
      { value: 'Bilboard', label: 'Bilboard' },
      { value: 'Solder Ball', label: 'Solder Ball' },
      { value: 'Terminal Levantado', label: 'Terminal Levantado' },
    ],
  },
  {
    label: 'Falhas de Posicionamento',
    options: [
      { value: 'Ausente', label: 'Ausente' },
      { value: 'Danificado', label: 'Danificado' },
      { value: 'Deslocado', label: 'Deslocado' },
      { value: 'Incorreto', label: 'Incorreto' },
      { value: 'Valor Incorreto', label: 'Valor Incorreto' },
      { value: 'Invertido', label: 'Invertido' },
      { value: 'Polaridade Incorreta', label: 'Polaridade Incorreta' },
      { value: 'Levantado', label: 'Levantado' },
    ],
  },
];

export default function RegisterForm({
  onSubmit,
  onClear,
  onStartOM,
  onNewOM,
  isOMRunning,
  isOMLocked,
}: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterData>({
    om: '',
    qtdlote: 0,
    serial: '',
    designador: '',
    tipodefeito: '',
    pn: '',
    descricao: '',
    obs: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      // Limpa apenas alguns campos após sucesso, mantém OM e qtdlote se estiver travado
      if (!isOMLocked) {
        setFormData({
          ...formData,
          serial: '',
          designador: '',
          tipodefeito: '',
          pn: '',
          descricao: '',
          obs: '',
        });
      } else {
        setFormData({
          ...formData,
          serial: '',
          designador: '',
          tipodefeito: '',
          pn: '',
          descricao: '',
          obs: '',
        });
      }
    } catch (error) {
      console.error('Erro ao registrar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (isOMLocked) {
      setFormData({
        ...formData,
        serial: '',
        designador: '',
        tipodefeito: '',
        pn: '',
        descricao: '',
        obs: '',
      });
    } else {
      setFormData({
        om: '',
        qtdlote: 0,
        serial: '',
        designador: '',
        tipodefeito: '',
        pn: '',
        descricao: '',
        obs: '',
      });
    }
    onClear();
  };

  // Flatten options para o Select
  const defectOptions = [
    { value: '', label: '— Selecione —' },
    ...TIPOS_DEFEITO.flatMap(group => (group.options ? group.options : [])),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl p-6"
    >
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-sky-400">📋</span>
        <span>Formulário de Registro</span>
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="OM (Ordem de Montagem) *"
            value={formData.om}
            onChange={e => setFormData({ ...formData, om: e.target.value })}
            disabled={isOMLocked}
            required
            placeholder="Ex: OM001"
          />

          <Input
            label="Qtd de Placas do Lote *"
            type="number"
            min="1"
            value={formData.qtdlote || ''}
            onChange={e => setFormData({ ...formData, qtdlote: parseInt(e.target.value) || 0 })}
            disabled={isOMLocked}
            required
            placeholder="Ex: 100"
          />

          <Input
            label="Serial Number da Placa"
            value={formData.serial}
            onChange={e => setFormData({ ...formData, serial: e.target.value })}
            placeholder="Ex: SN12345"
          />

          <Input
            label="Designador *"
            value={formData.designador}
            onChange={e => setFormData({ ...formData, designador: e.target.value })}
            required
            placeholder="Ex: R1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Tipo de Defeito *"
            value={formData.tipodefeito}
            onChange={e => setFormData({ ...formData, tipodefeito: e.target.value })}
            options={defectOptions}
            required
          />

          <Input
            label="Cod. Alt (Código Alternativo)"
            value={formData.pn}
            onChange={e => setFormData({ ...formData, pn: e.target.value })}
            placeholder="Ex: ALT123"
          />

          <Input
            label="Descrição do Componente"
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Ex: Resistor 10kΩ"
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
            <textarea
              value={formData.obs}
              onChange={e => setFormData({ ...formData, obs: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={loading}>
              <Save className="w-4 h-4" />
              Gravar
            </Button>

            <Button type="button" variant="ghost" onClick={handleClear}>
              <Brush className="w-4 h-4" />
              Limpar
            </Button>

            {!isOMRunning && (
              <Button
                type="button"
                variant="primary"
                onClick={onStartOM}
                disabled={!formData.om || !formData.qtdlote}
              >
                <PlayCircle className="w-4 h-4" />
                Iniciar
              </Button>
            )}

            {isOMRunning && (
              <Button type="button" variant="secondary" onClick={onNewOM}>
                <Sparkles className="w-4 h-4" />
                Nova OM
              </Button>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}
