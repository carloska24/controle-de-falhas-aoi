'use client';

import { useState, FormEvent, useTransition, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Save, Eraser, Pause, Flag } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { OM, Registro } from '@/types/index';

export interface RegisterData {
  om: string;
  qtdlote: number;
  serial: string;
  designador: string;
  tipodefeito: string;
  pn: string;
  descricao: string;
  obs: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
}

interface ProFormProps {
  activeOM: string | null;
  activeOMQtdLote: number | null;
  omState: {
    elapsed: number;
    isRunning: boolean;
    isPaused: boolean;
    omNumber: string | null;
  };
  onSubmit: (data: any) => Promise<void>;
  onStartOM: (omNumber: string, qtdLote: number) => Promise<void>;
  onPauseOM: () => Promise<void>;
  onResumeOM: () => Promise<void>;
  onFinishOM: () => Promise<void>;
  onNewOM: () => void;
  pausedOMs: OM[];
  finishedOMs: OM[];
  activeOMs?: OM[]; // OMs em andamento
  onSelectPausedOM: (omNumber: string | null) => Promise<void>;
  onSelectFinishedOM: (omNumber: string | null) => Promise<void>;
  onSelectActiveOM?: (omNumber: string | null) => Promise<void>;
  registros?: Registro[];
}

export default function ProForm({
  activeOM,
  activeOMQtdLote,
  omState,
  onSubmit,
  onStartOM,
  onPauseOM,
  onResumeOM,
  onFinishOM,
  onNewOM,
  pausedOMs,
  finishedOMs,
  activeOMs = [],
  onSelectPausedOM,
  onSelectFinishedOM,
  onSelectActiveOM,
  registros = [],
}: ProFormProps) {
  const [formData, setFormData] = useState({
    om: '',
    qtdlote: '',
    serial: '',
    designador: '',
    tipodefeito: '',
    prioridade: 'media',
    pn: '',
    descricao: '',
    obs: '',
  });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterData, string>>>({});

  // Validação simples
  const validateField = (field: keyof RegisterData, value: any): string | null => {
    switch (field) {
      case 'om':
        if (!value || value.trim() === '') return 'OM é obrigatória';
        return null;
      case 'serial':
        if (!value || value.trim() === '') return 'Serial é obrigatório';
        return null;
      case 'designador':
        if (!value || value.trim() === '') return 'Designador é obrigatório';
        return null;
      case 'tipodefeito':
        if (!value || value.trim() === '') return 'Tipo de defeito é obrigatório';
        return null;
      case 'qtdlote':
        const parsed = parseInt(value);
        if (!value || isNaN(parsed) || parsed <= 0) return 'Quantidade deve ser maior que 0';
        return null;
      case 'pn':
        if (!value || value.trim() === '') return 'Cod. Alt é obrigatório';
        return null;
      default:
        return null;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Bloquear se OM não estiver running
    if (!omState.isRunning || !activeOM) {
      setErrors({ om: 'OM deve estar em andamento para lançar registros' });
      return;
    }

    // Validação completa
    const newErrors: Partial<Record<keyof RegisterData, string>> = {};
    (
      ['om', 'serial', 'designador', 'tipodefeito', 'qtdlote', 'pn'] as Array<keyof RegisterData>
    ).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    // Captura snapshot dos dados antes do startTransition
    const submitData = {
      ...formData,
      qtdlote: parseInt(formData.qtdlote) || 0,
    };

    startTransition(async () => {
      try {
        await onSubmit(submitData);
        // Feedback visual de sucesso
        if (!activeOM) {
          setFormData({
            om: '',
            qtdlote: '',
            serial: '',
            designador: '',
            tipodefeito: '',
            prioridade: 'media',
            pn: '',
            descricao: '',
            obs: '',
          });
        } else {
          setFormData(prev => ({
            ...prev,
            serial: '',
            designador: '',
            tipodefeito: '',
            pn: '',
            descricao: '',
            obs: '',
          }));
        }
      } catch (error) {
        console.error('Erro ao registrar:', error);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleClear = () => {
    if (activeOM) {
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
        qtdlote: '',
        serial: '',
        designador: '',
        tipodefeito: '',
        prioridade: 'media',
        pn: '',
        descricao: '',
        obs: '',
      });
    }
  };

  // Sincronizar formData quando activeOM mudar
  useEffect(() => {
    if (activeOM) {
      setFormData(prev => ({
        ...prev,
        om: activeOM,
        ...(activeOMQtdLote ? { qtdlote: activeOMQtdLote.toString() } : {}),
      }));
    }
  }, [activeOM, activeOMQtdLote]);

  // Listener para atalho Alt+S
  useEffect(() => {
    const handleStartOMKeyboard = () => {
      if (!omState.isRunning && !activeOM && formData.om && formData.qtdlote) {
        const qtd =
          typeof formData.qtdlote === 'string' ? parseInt(formData.qtdlote) : formData.qtdlote;
        if (qtd > 0) {
          onStartOM(formData.om, qtd);
        }
      }
    };

    window.addEventListener('startOMKeyboard', handleStartOMKeyboard);
    return () => window.removeEventListener('startOMKeyboard', handleStartOMKeyboard);
  }, [formData.om, formData.qtdlote, omState.isRunning, activeOM, onStartOM]);

  const isFocus = activeOM && (omState.isRunning || omState.isPaused);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-b from-[#16243a] to-[#112137] border border-[#314566] rounded-2xl p-6 shadow-2xl"
    >
      {/* Header do Form */}
      <div
        className={`flex items-center justify-between gap-4 mb-4 ${
          isFocus
            ? 'border border-[#2e3f69] rounded-xl p-3 bg-gradient-to-b from-purple-500/8 to-green-500/4 shadow-[0_0_0_3px_rgba(124,58,237,.08)]'
            : ''
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-visible"
            animate={
              isFocus
                ? {
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }
                : {
                    scale: [1, 1.05, 1],
                  }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: isFocus
                ? 'radial-gradient(140% 140% at 30% 10%, rgba(124,58,237,.4), rgba(34,197,94,.2))'
                : 'radial-gradient(140% 140% at 30% 10%, rgba(124,58,237,.28), rgba(34,197,94,.12))',
              border: '1px solid #2a3650',
              boxShadow: isFocus
                ? '0 0 20px rgba(124,58,237,.4), 0 0 40px rgba(34,197,94,.2)'
                : '0 0 10px rgba(124,58,237,.2)',
            }}
          >
            <motion.svg
              className="w-8 h-8"
              viewBox="0 0 62 62"
              xmlns="http://www.w3.org/2000/svg"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <defs>
                <linearGradient
                  id={`iconGradient-${activeOM || 'default'}`}
                  gradientUnits="userSpaceOnUse"
                  x1="31"
                  x2="31"
                  y1="62"
                  y2="0"
                >
                  <stop offset="0" stopColor="#9f2fff">
                    <animate
                      attributeName="stop-color"
                      values="#9f2fff;#0bb1d3;#9f2fff"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="1" stopColor="#0bb1d3">
                    <animate
                      attributeName="stop-color"
                      values="#0bb1d3;#9f2fff;#0bb1d3"
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
                <filter id={`glow-${activeOM || 'default'}`}>
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g filter={`url(#glow-${activeOM || 'default'})`}>
                <path
                  d="m45 36c1.654 0 3-1.346 3-3s-1.346-3-3-3-3 1.346-3 3 1.346 3 3 3zm0-4c.552 0 1 .449 1 1s-.448 1-1 1-1-.449-1-1 .448-1 1-1zm3.81-19.555.247-4.445h-7.105c-3.216-3.778-7.954-6-12.952-6h-1c0-1.103-.897-2-2-2h-2c-1.103 0-2 .897-2 2h-1c-9.036 0-16.427 7.092-16.949 16h-2.051c-1.103 0-2 .897-2 2v2c0 1.103.897 2 2 2h1.026c-.635.838-1.026 1.87-1.026 3 0 2.757 2.243 5 5 5h1v3c0 6.149 3.722 11.44 9.03 13.753-4.107 1.597-7.03 5.583-7.03 10.247v3h30v-3c0-4.667-2.926-8.654-7.037-10.249 2.088-.904 3.952-2.282 5.466-4.074 1.132.476 2.33.82 3.57 1.042v14.281c0 1.103.897 2 2 2h2c1.103 0 2-.897 2-2v-14.281c7.946-1.423 14-8.37 14-16.719.001-7.983-5.498-14.799-13.189-16.555zm-12.81 2.133c-.438.273-.861.565-1.271.875.326-.758.758-1.46 1.271-2.095zm2-3.054c.916-.615 1.951-1.067 3.066-1.311l.124 2.232c-1.112.254-2.18.607-3.19 1.062zm4.054 16.476h5.893l.524-9.433c4.423 1.475 7.529 5.684 7.529 10.433 0 6.065-4.935 11-11 11s-11-4.935-11-11c0-4.749 3.106-8.958 7.53-10.433zm4.889-18-.89 16h-2.107l-.89-16zm-17.943-6c4.047 0 7.89 1.665 10.691 4.513-4.155 1.313-7.215 5.028-7.632 9.449-.011.013-.024.025-.035.038h-4.024v-14zm-3-2v16h-2v-16zm-5 2h1v14h-4.046c-.407-4.414-3.478-8.168-7.659-9.488 2.724-2.78 6.514-4.512 10.705-4.512zm-9 7.525v6.475h-2v-7.482c.713.254 1.384.592 2 1.007zm2 1.849c1.05 1.306 1.742 2.9 1.937 4.626h-1.937zm-6-1.825v6.451h-1.949c.155-2.337.841-4.527 1.949-6.451zm-6 8.451h28.58c-.399.641-.76 1.307-1.072 2h-27.508zm5 10c-1.654 0-3-1.346-3-3s1.346-3 3-3h1v2.132l-1.445-.964-1.109 1.664 2.554 1.703v1.465zm15 22.974v3.026h-6v-4.478c1.2-.805 2.602-1.328 4.114-1.477.255 1.193.945 2.217 1.886 2.929zm-6 5.026h6v2h-6zm8-4.101c.323.066.658.101 1 .101s.677-.035 1-.101v6.101h-2zm4 4.101h6v2h-6zm6-2h-6v-3.026c.941-.712 1.631-1.736 1.886-2.93 1.512.148 2.914.672 4.114 1.477zm-9-4c-1.317 0-2.427-.859-2.829-2.042.276.015.549.042.829.042h4c.28 0 .553-.032.831-.047-.401 1.185-1.512 2.047-2.831 2.047zm-13 7c0-2.137.752-4.099 2-5.644v6.644h-2zm26 0v1h-2v-6.644c1.248 1.545 2 3.507 2 5.644zm-11-11h-4c-7.168 0-13-5.832-13-13v-11h18.76c-.486 1.587-.76 3.263-.76 5 0 6.314 3.468 11.824 8.591 14.755-2.461 2.704-5.889 4.245-9.591 4.245zm19 12h-2v-14.051c.333.02.662.051 1 .051s.667-.031 1-.051zm-1-16c-8.271 0-15-6.729-15-15 0-6.929 4.691-12.866 11.302-14.533l.113 2.043c-5.502 1.58-9.415 6.696-9.415 12.49 0 7.168 5.832 13 13 13s13-5.832 13-13c0-5.794-3.913-10.91-9.416-12.49l.113-2.043c6.612 1.667 11.303 7.604 11.303 14.533 0 8.271-6.729 15-15 15zm-23-14c0-2.206-1.794-4-4-4s-4 1.794-4 4 1.794 4 4 4 4-1.794 4-4zm-4 2c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2zm8 4h-2v-6h2zm3.168 3.445 1.664 1.109-.336.504c-1.228 1.842-3.283 2.942-5.496 2.942s-4.268-1.1-5.496-2.941l-.336-.504 1.664-1.109.336.504c.856 1.283 2.289 2.05 3.832 2.05s2.976-.767 3.832-2.051zm-21.168 18.555h-8v-2h8zm2-4h-10v-2h10zm0-4h-10v-2h10zm-2-4h-8v-2h8z"
                  fill={`url(#iconGradient-${activeOM || 'default'})`}
                >
                  <animate
                    attributeName="opacity"
                    values="0.8;1;0.8"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            </motion.svg>
          </motion.div>
          <div className="flex-1">
            <h2 className="text-xl font-black tracking-wide text-[#cfe0ff]">
              Lançamento de Falhas
            </h2>
            <p className="text-xs text-[#8fa3c6] mt-1">
              Cadastre de forma rápida, bonita e consistente com o fluxo da OM.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge PRO - Cores exatas do index-pro.html */}
          <div
            className="px-2.5 py-1.5 rounded-full border font-bold text-xs uppercase tracking-wide"
            style={{
              padding: '6px 10px',
              borderRadius: '999px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              fontSize: '11px',
              ...(isFocus && omState.isRunning
                ? {
                    background: '#0e1e18',
                    borderColor: '#1e3a2e',
                    color: '#7ef2bf',
                  }
                : isFocus && omState.isPaused
                ? {
                    background: '#1a1506',
                    borderColor: '#574018',
                    color: '#ffd166',
                  }
                : {
                    background: '#101828',
                    borderColor: '#273650',
                    color: '#b2c6eb',
                  }),
            }}
          >
            {isFocus && omState.isRunning
              ? 'OM ATIVA'
              : isFocus && omState.isPaused
              ? 'OM ATIVA (Pausada)'
              : 'UX PRO'}
          </div>
          {!omState.isRunning && !activeOM && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (formData.om && formData.qtdlote) {
                  onStartOM(formData.om, parseInt(formData.qtdlote));
                }
              }}
              disabled={!formData.om || !formData.qtdlote}
            >
              <Play className="w-4 h-4" />
              Iniciar
            </Button>
          )}
          {activeOM && !omState.isRunning && (
            <Button size="sm" variant="primary" onClick={onNewOM}>
              <Plus className="w-4 h-4" />
              Nova OM
            </Button>
          )}
        </div>
      </div>

      {/* Mensagens de erro */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-400 mb-2">
                Preencha todos os campos obrigatórios
              </h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-300">
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3">
        <div className="col-span-3 max-w-[280px]">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            OM <span className="text-red-500">*</span>
          </label>
          <div>
            <Input
              id="om"
              value={formData.om}
              onChange={e => setFormData({ ...formData, om: e.target.value })}
              placeholder="OM-12345"
              disabled={!!activeOM}
              className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
            />
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Qtd do Lote <span className="text-red-500">*</span>
          </label>
          <Input
            id="qtdlote"
            type="number"
            min="1"
            value={formData.qtdlote}
            onChange={e => setFormData({ ...formData, qtdlote: e.target.value })}
            placeholder="150"
            disabled={!!activeOM}
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          />
        </div>

        <div className="col-span-3">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Serial <span className="text-red-500">*</span>
          </label>
          <Input
            id="serial"
            value={formData.serial}
            onChange={e => setFormData({ ...formData, serial: e.target.value })}
            placeholder="SN-..."
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          />
        </div>

        <div className="col-span-4">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Designador <span className="text-red-500">*</span>
          </label>
          <Input
            id="designador"
            value={formData.designador}
            onChange={e => setFormData({ ...formData, designador: e.target.value })}
            placeholder="U12, R3"
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          />
        </div>

        <div className="col-span-3">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Tipo de Defeito <span className="text-red-500">*</span>
          </label>
          <Select
            id="tipodefeito"
            value={formData.tipodefeito}
            onChange={e => setFormData({ ...formData, tipodefeito: e.target.value })}
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          >
            <option value="">— Selecione —</option>
            <optgroup label="Falhas Relacionadas à Soldagem">
              <option value="Curto">Curto</option>
              <option value="Solda Fria">Solda Fria</option>
              <option value="Excesso de Solda">Excesso de Solda</option>
              <option value="Insuficiência de Solda">Insuficiência de Solda</option>
              <option value="Tombstone">Tombstone</option>
              <option value="Bilboard">Bilboard</option>
              <option value="Solder Ball">Solder Ball</option>
              <option value="Terminal Levantado">Terminal Levantado</option>
            </optgroup>
            <optgroup label="Falhas de Posicionamento">
              <option value="Ausente">Ausente</option>
              <option value="Danificado">Danificado</option>
              <option value="Deslocado">Deslocado</option>
              <option value="Incorreto">Incorreto</option>
              <option value="Invertido">Invertido</option>
              <option value="Polaridade Incorreta">Polaridade Incorreta</option>
              <option value="Levantado">Levantado</option>
            </optgroup>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Prioridade <span className="text-red-500">*</span>
          </label>
          <Select
            id="prioridade"
            value={formData.prioridade}
            onChange={e =>
              setFormData({ ...formData, prioridade: e.target.value as RegisterData['prioridade'] })
            }
            className={`!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff] transition-all ${
              formData.prioridade === 'urgente'
                ? 'border-red-500/50 ring-1 ring-red-500/20'
                : formData.prioridade === 'alta'
                ? 'border-orange-500/50'
                : formData.prioridade === 'media'
                ? 'border-yellow-500/50'
                : 'border-blue-500/50'
            }`}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
        </div>

        <div className="col-span-3">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Cod. Alt <span className="text-red-500">*</span>
          </label>
          <Input
            id="pn"
            value={formData.pn}
            onChange={e => setFormData({ ...formData, pn: e.target.value })}
            placeholder="PN-200-0123"
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          />
        </div>

        <div className="col-span-4">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Descrição
          </label>
          <Input
            id="descricao"
            value={formData.descricao}
            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Resistor 10k 1%"
            className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff]"
          />
        </div>

        <div className="col-span-12">
          <label className="text-xs font-extrabold tracking-wide text-[#9fb0cf] mb-1.5 block">
            Observações
          </label>
          <textarea
            id="obs"
            value={formData.obs}
            onChange={e => setFormData({ ...formData, obs: e.target.value })}
            placeholder="Observações relevantes"
            rows={3}
            className="w-full !bg-[#0f1a2b] border border-[#2a3d5c] text-[#eaf0ff] rounded-lg p-3 outline-none transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
            style={{ backgroundColor: '#0f1a2b' }}
          />
        </div>

        {/* Filtros de OM */}
        {((Array.isArray(pausedOMs) && pausedOMs.length > 0) ||
          (Array.isArray(finishedOMs) && finishedOMs.length > 0) ||
          (Array.isArray(activeOMs) && activeOMs.length > 0)) && (
          <div className="col-span-12 flex items-center gap-2 flex-wrap">
            {/* OMs Ativas (em andamento) */}
            {Array.isArray(activeOMs) &&
              activeOMs.length > 0 &&
              !omState.isRunning &&
              onSelectActiveOM && (
                <Select
                  value={activeOM && activeOMs.some(om => om.omNumber === activeOM) ? activeOM : ''}
                  onChange={e => onSelectActiveOM(e.target.value || null)}
                  className="!bg-[#0e1e18] border-[#194b3b] text-[#1cff9d] text-xs font-semibold"
                >
                  <option value="">🟢 Retomar OM Ativa</option>
                  {activeOMs.map(om => (
                    <option key={om.omNumber} value={om.omNumber}>
                      {om.omNumber} ({om.qtdlote || '?'} placas)
                    </option>
                  ))}
                </Select>
              )}
            {Array.isArray(pausedOMs) && pausedOMs.length > 0 && !omState.isRunning && (
              <Select
                value={activeOM && pausedOMs.some(om => om.omNumber === activeOM) ? activeOM : ''}
                onChange={e => onSelectPausedOM(e.target.value || null)}
                className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff] text-xs"
              >
                <option value="">Filtrar OM Pausada</option>
                {pausedOMs.map(om => (
                  <option key={om.omNumber} value={om.omNumber}>
                    {om.omNumber} ({om.qtdlote || '?'} placas)
                  </option>
                ))}
              </Select>
            )}
            {Array.isArray(finishedOMs) && finishedOMs.length > 0 && !omState.isRunning && (
              <Select
                value={activeOM && finishedOMs.some(om => om.omNumber === activeOM) ? activeOM : ''}
                onChange={e => onSelectFinishedOM(e.target.value || null)}
                className="!bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff] text-xs"
              >
                <option value="">Filtrar OM Finalizada</option>
                {finishedOMs.map(om => (
                  <option key={om.omNumber} value={om.omNumber}>
                    {om.omNumber} ({om.qtdlote || '?'} placas)
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="col-span-12 flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={loading || isPending}
              disabled={loading || isPending}
            >
              <Save className="w-4 h-4" />
              Gravar
            </Button>
            <Button type="button" variant="ghost" onClick={handleClear}>
              <Eraser className="w-4 h-4" />
              Limpar
            </Button>
          </div>
        </div>
      </form>
    </motion.section>
  );
}
