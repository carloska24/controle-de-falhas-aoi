'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, ArrowRight, Settings, Save, Info } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { fetchAutenticado } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Registro } from '@/types/index';
import Button from '@/components/ui/Button';
import DemoBadge from '@/components/ui/DemoBadge';
// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  RadialLinearScale
);

// Definições de defeitos (LISTA CORRETA - Alinhada com RegisterForm)
const DEFEITOS_SOLDAGEM = [
  'Curto',
  'Solda Fria',
  'Excesso de Solda',
  'Insuficiência de Solda',
  'Tombstone',
  'Bilboard',
  'Solder Ball',
  'Terminal Levantado',
];
const DEFEITOS_POSICIONAMENTO = [
  'Ausente',
  'Danificado',
  'Deslocado',
  'Incorreto',
  'Valor Incorreto',
  'Invertido',
  'Polaridade Incorreta',
  'Levantado',
];
const DEFEITOS_VALIDOS = new Set([...DEFEITOS_SOLDAGEM, ...DEFEITOS_POSICIONAMENTO]);

// Função para calcular DPMO e nível Sigma
// Baseado em faixas aproximadas de Six Sigma
function calcularDPMOeSigma(
  numeroFalhas: number,
  unidadesInspecionadas: number,
  oportunidadesPorUnidade: number
): { dpmo: number; sigma: number; nivelSigma: string } {
  // Calcular DPMO
  const dpmo =
    unidadesInspecionadas > 0 && oportunidadesPorUnidade > 0 && numeroFalhas > 0
      ? (numeroFalhas * 1000000) / (unidadesInspecionadas * oportunidadesPorUnidade)
      : 0;

  // Estimar nível Sigma baseado em faixas aproximadas
  // Tabela de referência Six Sigma (aproximada)
  let sigma = 0;
  let nivelSigma = '—';

  if (dpmo === 0) {
    sigma = 6;
    nivelSigma = '6σ';
  } else if (dpmo <= 3.4) {
    sigma = 6;
    nivelSigma = '6σ';
  } else if (dpmo <= 233) {
    sigma = 5;
    nivelSigma = '5σ';
  } else if (dpmo <= 6210) {
    sigma = 4;
    nivelSigma = '4σ';
  } else if (dpmo <= 66807) {
    sigma = 3;
    nivelSigma = '3σ';
  } else if (dpmo <= 308537) {
    sigma = 2;
    nivelSigma = '2σ';
  } else {
    sigma = 1;
    nivelSigma = '1σ';
  }

  return {
    dpmo: Math.round(dpmo * 100) / 100, // Arredondar para 2 casas decimais
    sigma,
    nivelSigma,
  };
}

export default function QualidadePage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Data
  const [allData, setAllData] = useState<Registro[]>([]);
  const [filteredData, setFilteredData] = useState<Registro[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [omFilter, setOmFilter] = useState('all');

  // DPMO Configuration (IPC Standard)
  const [showDPMOConfig, setShowDPMOConfig] = useState(false);
  const [dpmoConfig, setDpmoConfig] = useState({
    componentesPorPlaca: 0,
    padsSMDPorPlaca: 0,
  });
  const [dpmoConfigSaved, setDpmoConfigSaved] = useState(false);

  // Load DPMO config from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dpmo_config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setDpmoConfig({
            componentesPorPlaca: parsed.componentesPorPlaca || 0,
            padsSMDPorPlaca: parsed.padsSMDPorPlaca || 0,
          });
          setDpmoConfigSaved(true);
        } catch (e) {
          console.error('Erro ao carregar configuração DPMO:', e);
        }
      }
    }
  }, []);

  // Save DPMO config
  const handleSaveDPMOConfig = () => {
    if (dpmoConfig.componentesPorPlaca <= 0 && dpmoConfig.padsSMDPorPlaca <= 0) {
      showToast('Por favor, insira pelo menos um valor válido (componentes ou pads SMD)', 'error');
      return;
    }

    // Criar novo objeto para forçar atualização do React
    const newConfig = {
      componentesPorPlaca: dpmoConfig.componentesPorPlaca || 0,
      padsSMDPorPlaca: dpmoConfig.padsSMDPorPlaca || 0,
    };

    localStorage.setItem('dpmo_config', JSON.stringify(newConfig));

    // Atualizar estado com novo objeto para forçar recálculo
    setDpmoConfig(newConfig);
    setDpmoConfigSaved(true);
    setShowDPMOConfig(false);
    showToast(
      'Configuração DPMO salva com sucesso! O cálculo será atualizado automaticamente.',
      'success'
    );
  };

  // Check URL for demo mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsDemoMode(urlParams.get('demo') === 'true');
    }
  }, []);

  // Check auth
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      if (!['admin'].includes(parsedUser.role)) {
        router.push('/operador');
        return;
      }

      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setLoading(false);
      router.push('/login');
    }
  };

  // Load data
  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await fetchAutenticado('/api/registros');
      const registrosList = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Se estiver em modo demo, incluir todos os dados; caso contrário, filtrar DEMO
      if (isDemoMode && user?.role === 'admin') {
        setAllData(registrosList);
      } else {
        setAllData(registrosList.filter((r: Registro) => !r.om?.startsWith('DEMO-')));
      }
      setIsDataLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar registros:', error);
      showToast(error.message || 'Erro ao carregar registros', 'error');
      setIsDataLoading(false);
    }
  }, [showToast, isDemoMode, user?.role]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allData];

    // Filtro por período
    if (dateRange === 'custom') {
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        filtered = filtered.filter(d => new Date(d.createdat) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        filtered = filtered.filter(d => new Date(d.createdat) <= end);
      }
    } else if (dateRange !== 'all') {
      const dias = parseInt(dateRange, 10);
      if (!isNaN(dias)) {
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);
        filtered = filtered.filter(d => new Date(d.createdat) >= dataLimite);
      }
    }

    // Filtro por OM
    if (omFilter !== 'all') {
      filtered = filtered.filter(d => d.om === omFilter);
    }

    setFilteredData(filtered);
  }, [allData, dateRange, startDate, endDate, omFilter]);

  // Remover duplicatas por ID (garantir que cada registro seja contado apenas uma vez)
  const uniqueFilteredData = useMemo(() => {
    return filteredData.filter(
      (item, index, self) => index === self.findIndex(t => t.id === item.id)
    );
  }, [filteredData]);

  // KPIs Avançados - Métricas de Qualidade
  const kpis = useMemo(() => {
    const totalFalhas = uniqueFilteredData.length;

    // Contagem de defeitos por tipo
    const contagemDefeitos = uniqueFilteredData.reduce((acc, item) => {
      const tipo = item.tipodefeito || '';
      if (!DEFEITOS_VALIDOS.has(tipo)) return acc;
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const principalDefeito = Object.entries(contagemDefeitos).sort((a, b) => b[1] - a[1])[0];
    const falhasSoldagem = uniqueFilteredData.filter(d =>
      DEFEITOS_SOLDAGEM.includes(d.tipodefeito)
    ).length;
    const falhasPosicionamento = uniqueFilteredData.filter(d =>
      DEFEITOS_POSICIONAMENTO.includes(d.tipodefeito)
    ).length;

    // Calcular DPMO (Defeitos por Milhão de Oportunidades) - Norma IPC
    // Fórmula: DPMO = (Defeitos / (Unidades Inspecionadas × Oportunidades por Unidade)) × 1.000.000
    // Oportunidades por Placa = Componentes + Pads SMD (somar ambos)
    // Total de Oportunidades = Total de Placas × Oportunidades por Placa
    //
    // Segundo IPC-A-610 e IPC-7912:
    // Oportunidades = Componentes montados + Pads SMD (juntas soldadas)
    // Exemplo: 100 componentes + 1900 pads SMD = 2000 oportunidades por placa

    // IMPORTANTE: Agrupar placas por OM para evitar duplicação
    // Se houver múltiplos registros da mesma OM, usar apenas o qtdlote da OM (maior valor)
    // Se houver OMs diferentes, somar os qtdlotes de cada OM
    const qtdPlacasPorOM = new Map<string, number>();

    uniqueFilteredData.forEach(item => {
      const om = item.om;
      const qtdlote = item.qtdlote || 1;

      // Armazenar quantidade de placas por OM (pegamos o maior valor se houver duplicatas)
      // Isso garante que cada OM seja contada apenas uma vez (mesma OM = mesmo lote)
      if (!qtdPlacasPorOM.has(om) || qtdPlacasPorOM.get(om)! < qtdlote) {
        qtdPlacasPorOM.set(om, qtdlote);
      }
    });

    // Calcular total de unidades inspecionadas (placas) - usando agrupamento por OM
    // Somar as placas de cada OM única (evita duplicação quando há múltiplos registros da mesma OM)
    // Se há 3 OMs diferentes, cada uma com 150 placas = 450 placas totais
    // Se há 1 OM com 150 placas = 150 placas totais
    const totalInspecionadas = Array.from(qtdPlacasPorOM.values()).reduce(
      (sum, qtd) => sum + qtd,
      0
    );

    // Calcular Yield (Taxa de Aceitação)
    const yieldPercent =
      totalInspecionadas > 0
        ? (((totalInspecionadas - totalFalhas) / totalInspecionadas) * 100).toFixed(2)
        : '0.00';

    // Calcular oportunidades usando configuração do usuário (IPC Standard)
    // DPMO = (Defeitos / (Unidades × Oportunidades por Unidade)) × 1.000.000
    // Oportunidades = Componentes + Pads SMD (somar ambos, não usar o maior)
    let oportunidadesPorPlaca = 0;

    if (dpmoConfig.componentesPorPlaca > 0 || dpmoConfig.padsSMDPorPlaca > 0) {
      // SOMAR componentes + pads SMD (conforme exemplo: 100 componentes + 1900 pads = 2000 oportunidades)
      oportunidadesPorPlaca =
        (dpmoConfig.componentesPorPlaca || 0) + (dpmoConfig.padsSMDPorPlaca || 0);
    } else {
      // Fallback: usar designadores únicos como proxy (estimativa)
      const designadoresUnicos = new Set(
        uniqueFilteredData.map(item => item.designador).filter(Boolean)
      ).size;
      oportunidadesPorPlaca =
        designadoresUnicos > 0
          ? Math.max(designadoresUnicos, 50) // Mínimo 50 para evitar subestimativa
          : 50; // Valor padrão se não houver designadores
    }

    // Calcular DPMO e nível Sigma
    const {
      dpmo: dpmoValue,
      sigma,
      nivelSigma,
    } = calcularDPMOeSigma(totalFalhas, totalInspecionadas, oportunidadesPorPlaca);
    const dpmo = dpmoValue.toFixed(2);

    // Análise de tendência (comparar últimos 7 dias com 7 dias anteriores)
    const agora = new Date();
    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
    const quatorzeDiasAtras = new Date(agora.getTime() - 14 * 24 * 60 * 60 * 1000);

    const ultimos7Dias = uniqueFilteredData.filter(
      d => new Date(d.createdat) >= seteDiasAtras
    ).length;
    const anteriores7Dias = uniqueFilteredData.filter(d => {
      const data = new Date(d.createdat);
      return data >= quatorzeDiasAtras && data < seteDiasAtras;
    }).length;

    const variacao =
      anteriores7Dias > 0
        ? (((ultimos7Dias - anteriores7Dias) / anteriores7Dias) * 100).toFixed(1)
        : '0.0';

    // Taxa de defeitos críticos (prioridade alta/urgente)
    const defeitosCriticos = uniqueFilteredData.filter(
      d => d.prioridade === 'alta' || d.prioridade === 'urgente'
    ).length;

    const taxaCriticos =
      totalFalhas > 0 ? ((defeitosCriticos / totalFalhas) * 100).toFixed(1) : '0.0';

    return {
      totalFalhas,
      principalDefeito: principalDefeito ? `${principalDefeito[0]} (${principalDefeito[1]})` : '—',
      falhasSoldagem,
      falhasPosicionamento,
      contagemDefeitos,
      totalInspecionadas,
      yieldPercent,
      dpmo,
      sigma,
      nivelSigma,
      variacao,
      defeitosCriticos,
      taxaCriticos,
      ultimos7Dias,
    };
  }, [uniqueFilteredData, dpmoConfig]);

  // Unique OMs
  const uniqueOms = useMemo(() => {
    const oms = Array.from(new Set(allData.map(r => r.om)));
    return ['all', ...oms];
  }, [allData]);

  const handleLogout = async () => {
    try {
      // Se for admin, limpar dados demo antes do logout
      if (user?.role === 'admin') {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/logout`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );
      }
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // Ignora erros na limpeza
    }
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  };

  // Gráfico: Defeitos por Tipo
  const defeitosPorTipoData = useMemo(() => {
    const sortedData = Object.entries(kpis.contagemDefeitos)
      .filter(([label, count]) => label && DEFEITOS_VALIDOS.has(label) && count > 0)
      .sort((a, b) => b[1] - a[1]);

    const colors = [
      '#22c55e',
      '#3b82f6',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#f97316',
      '#65a30d',
      '#14b8a6',
      '#f59e0b',
      '#eab308',
      '#84cc16',
    ];

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Quantidade de Falhas',
          data: sortedData.map(item => item[1]),
          backgroundColor: sortedData.map((_, i) => colors[i % colors.length] + 'CC'),
          borderColor: sortedData.map((_, i) => colors[i % colors.length]),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  }, [kpis.contagemDefeitos]);

  // Gráfico: Categorias
  const categoriasData = useMemo(
    () => ({
      labels: ['Falhas de Soldagem', 'Falhas de Posicionamento'],
      datasets: [
        {
          data: [kpis.falhasSoldagem, kpis.falhasPosicionamento],
          backgroundColor: [
            'rgba(245, 158, 11, 0.8)', // Orange com alpha
            'rgba(59, 130, 246, 0.8)', // Blue com alpha
          ],
          borderColor: ['#f59e0b', '#3b82f6'],
          borderWidth: 2,
        },
      ],
    }),
    [kpis.falhasSoldagem, kpis.falhasPosicionamento]
  );

  // Gráfico: Tendência
  const tendenciaData = useMemo(() => {
    const falhasPorDia = uniqueFilteredData.reduce((acc, item) => {
      // Normalizar data para YYYY-MM-DD (evitar problemas de timezone)
      const dataObj = new Date(item.createdat);
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const data = `${ano}-${mes}-${dia}`;
      acc[data] = (acc[data] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedData = Object.entries(falhasPorDia).sort((a, b) => {
      const dateA = new Date(a[0] + 'T00:00:00');
      const dateB = new Date(b[0] + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });

    return {
      labels: sortedData.map(item => item[0]),
      datasets: [
        {
          label: 'Falhas por Dia',
          data: sortedData.map(item => item[1]),
          borderColor: '#ef4444',
          borderWidth: 3,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [uniqueFilteredData]);

  // Gráfico: Análise por OM
  const analisePorOMData = useMemo(() => {
    const falhasPorOM = uniqueFilteredData.reduce((acc, item) => {
      acc[item.om] = (acc[item.om] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(falhasPorOM)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      labels: sorted.map(item => item[0]),
      datasets: [
        {
          label: 'Falhas',
          data: sorted.map(item => item[1]),
          backgroundColor: [
            'rgba(239, 68, 68, 0.6)',
            'rgba(245, 158, 11, 0.6)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(139, 92, 246, 0.6)',
            'rgba(236, 72, 153, 0.6)',
            'rgba(20, 184, 166, 0.6)',
            'rgba(249, 115, 22, 0.6)',
            'rgba(101, 163, 13, 0.6)',
          ],
          borderColor: [
            '#ef4444',
            '#f59e0b',
            '#3b82f6',
            '#8b5cf6',
            '#ec4899',
            '#14b8a6',
            '#f97316',
            '#65a30d',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [uniqueFilteredData]);

  // Gráfico: Nível Sigma
  const sigmaData = useMemo(() => {
    // Ordem decrescente para gráfico horizontal: 6σ no topo, 1σ embaixo
    const niveisSigma = [6, 5, 4, 3, 2, 1];
    const sigmaAtual = kpis.sigma || 0;

    return {
      labels: niveisSigma.map(n => `${n}σ`),
      datasets: [
        {
          label: 'Nível Sigma',
          data: niveisSigma.map(n => (n === sigmaAtual ? 100 : 5)), // Nível atual = 100, outros = 5 (pequeno)
          backgroundColor: niveisSigma.map(n => {
            if (n === sigmaAtual) {
              // Cor baseada no nível (quanto maior, melhor - verde para alto, vermelho para baixo)
              if (n >= 4) return 'rgba(34, 197, 94, 0.9)'; // Verde para 4σ+
              if (n >= 3) return 'rgba(59, 130, 246, 0.9)'; // Azul para 3σ
              return 'rgba(239, 68, 68, 0.9)'; // Vermelho para <3σ
            }
            return 'rgba(148, 163, 184, 0.3)'; // Cinza para níveis não atingidos
          }),
          borderColor: niveisSigma.map(n => {
            if (n === sigmaAtual) {
              if (n >= 4) return '#22c55e';
              if (n >= 3) return '#3b82f6';
              return '#ef4444';
            }
            return '#64748b';
          }),
          borderWidth: niveisSigma.map(n => (n === sigmaAtual ? 2 : 1)),
          borderRadius: 4,
        },
      ],
    };
  }, [kpis.sigma]);

  // Gráfico Radar: Indicadores de Qualidade do Sistema
  const radarQualityData = useMemo(() => {
    const total = uniqueFilteredData.length;
    if (total === 0) {
      return {
        labels: ['Yield', 'Taxa Soldagem', 'Taxa Posicionamento', 'Críticos', 'Urgentes'],
        datasets: [
          {
            label: 'Indicador',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: '#3b82f6',
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#3b82f6',
          },
        ],
      };
    }

    // Yield (taxa de aceitação) - quanto maior, melhor
    const yieldScore = parseFloat(kpis.yieldPercent);

    // Taxas de falha por processo (%)
    const taxaSoldagem = (kpis.falhasSoldagem / total) * 100;
    const taxaPosicionamento = (kpis.falhasPosicionamento / total) * 100;

    // Taxas de criticidade
    const taxaCriticos = (kpis.defeitosCriticos / total) * 100;
    const urgentes = uniqueFilteredData.filter(d => d.prioridade === 'urgente').length;
    const taxaUrgentes = (urgentes / total) * 100;

    return {
      labels: ['Yield (%)', 'Taxa Soldagem', 'Taxa Posicionamento', 'Críticos (%)', 'Urgentes (%)'],
      datasets: [
        {
          label: 'Métricas de Qualidade',
          data: [
            Math.round(yieldScore),
            Math.round(taxaSoldagem),
            Math.round(taxaPosicionamento),
            Math.round(taxaCriticos),
            Math.round(taxaUrgentes),
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6',
          borderWidth: 2,
        },
      ],
    };
  }, [uniqueFilteredData, kpis]);

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 }, usePointStyle: true } },
      title: { color: '#e5e7eb', font: { size: 16, weight: 'bold' as const } },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        padding: 12,
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1,
        titleColor: '#e5e7eb',
        bodyColor: '#cbd5e1',
        displayColors: true,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, beginAtZero: true },
    },
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div
      id="quality-dashboard"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
    >
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-10 h-10"
            >
              <svg
                id="fi_1892654"
                enableBackground="new 0 0 511.985 511.985"
                className="w-full h-full text-purple-400 drop-shadow-lg"
                viewBox="0 0 511.985 511.985"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  id="XMLID_1656_"
                  fill="currentColor"
                  d="m450.365 186.776c7.3-11.387 9.479-25.41 5.978-38.475-3.501-13.064-12.399-24.12-24.414-30.33-9.75-5.041-15.72-15.381-15.209-26.344.628-13.511-4.496-26.745-14.06-36.31-9.564-9.563-22.803-14.682-36.309-14.06-10.961.51-21.304-5.461-26.344-15.209-6.211-12.016-17.267-20.914-30.331-24.414-13.064-3.502-27.088-1.322-38.474 5.978-9.24 5.922-21.181 5.924-30.419 0-11.386-7.299-25.411-9.479-38.473-5.978-13.065 3.5-24.12 12.398-30.332 24.414-5.04 9.749-15.394 15.724-26.344 15.209-13.51-.62-26.744 4.496-36.309 14.06-9.564 9.564-14.688 22.799-14.06 36.31.51 10.963-5.46 21.303-15.209 26.344-12.015 6.21-20.914 17.266-24.415 30.33-3.5 13.064-1.322 27.088 5.978 38.475 5.924 9.239 5.924 21.179 0 30.418-7.3 11.387-9.479 25.41-5.978 38.475 3.501 13.064 12.399 24.12 24.414 30.33 9.75 5.041 15.72 15.381 15.209 26.344-.628 13.511 4.496 26.745 14.06 36.31 9.333 9.333 22.163 14.418 35.333 14.079l-49.799 86.254c-2.022 3.503-1.735 7.879.727 11.088 2.462 3.208 6.615 4.615 10.522 3.571l55.91-14.981 14.983 55.909c1.047 3.907 4.344 6.799 8.354 7.326.438.058.875.086 1.308.086 3.538 0 6.856-1.88 8.657-5l60.673-105.089 60.673 105.089c1.802 3.12 5.119 5 8.657 5 .434 0 .871-.028 1.308-.086 4.01-.527 7.307-3.419 8.354-7.326l14.981-55.91 55.91 14.981c3.906 1.047 8.059-.362 10.522-3.571 2.462-3.209 2.749-7.585.727-11.088l-49.798-86.254c13.172.346 26-4.747 35.333-14.079 9.564-9.564 14.688-22.799 14.06-36.31-.51-10.963 5.46-21.303 15.209-26.344 12.015-6.21 20.914-17.266 24.415-30.33 3.5-13.064 1.322-27.088-5.978-38.475-5.924-9.238-5.924-21.177 0-30.417zm-260.295 289.301-11.321-42.249c-.687-2.563-2.362-4.746-4.659-6.072-2.296-1.326-5.024-1.686-7.588-.999l-42.25 11.321 40.064-69.394c3.135 2.452 5.771 5.579 7.662 9.237 6.211 12.016 17.267 20.914 30.331 24.414 4.089 1.096 8.272 1.635 12.438 1.635 6.612 0 13.181-1.365 19.27-4.012zm155.413-49.32c-2.564-.688-5.292-.328-7.588.999-2.297 1.326-3.973 3.51-4.659 6.072l-11.321 42.249-43.944-76.114c9.925 4.314 21.129 5.206 31.705 2.371 13.065-3.5 24.12-12.398 30.332-24.414 1.89-3.656 4.529-6.779 7.667-9.228l40.059 69.385zm88.045-198.768c4.333 6.758 5.574 14.75 3.496 22.504s-7.149 14.054-14.28 17.74c-16.668 8.617-26.875 26.296-26.003 45.039.373 8.019-2.547 15.561-8.224 21.237-5.676 5.677-13.227 8.604-21.236 8.224-18.74-.85-36.423 9.336-45.04 26.003-3.687 7.132-9.987 12.203-17.741 14.28-7.753 2.077-15.745.836-22.503-3.497-7.646-4.902-16.374-7.423-25.137-7.58-.127-.011-.253-.019-.38-.025-.157-.008-.314-.01-.472-.011-.175 0-.35.003-.525.012-.117.006-.233.014-.349.024-8.765.156-17.496 2.677-25.145 7.581-6.757 4.331-14.747 5.574-22.502 3.496-7.754-2.077-14.054-7.148-17.741-14.279-8.275-16.008-24.907-26.056-42.814-26.056-.74 0-1.482.018-2.226.052-8.017.381-15.561-2.548-21.236-8.224-5.677-5.677-8.597-13.219-8.224-21.237.872-18.743-9.335-36.422-26.003-45.04-7.131-3.686-12.202-9.985-14.28-17.739s-.836-15.746 3.496-22.504c10.128-15.797 10.128-36.211 0-52.008-4.333-6.758-5.574-14.75-3.496-22.504s7.149-14.054 14.28-17.74c16.668-8.617 26.875-26.296 26.003-45.039-.373-8.019 2.547-15.561 8.224-21.237 5.676-5.677 13.229-8.6 21.236-8.224 18.747.862 36.423-9.335 45.04-26.003 3.687-7.132 9.987-12.203 17.741-14.28 7.752-2.077 15.746-.836 22.503 3.497 15.797 10.127 36.21 10.127 52.007 0 0 0 0 0 .001-.001 6.756-4.331 14.748-5.574 22.502-3.496 7.754 2.077 14.054 7.148 17.741 14.279 8.617 16.67 26.302 26.876 45.04 26.004 8.019-.376 15.561 2.548 21.236 8.224 5.677 5.677 8.597 13.219 8.224 21.237-.872 18.743 9.335 36.422 26.003 45.04 7.131 3.686 12.202 9.985 14.28 17.739s.836 15.746-3.496 22.504c-10.128 15.797-10.128 36.211 0 52.008z"
                />
                <path
                  id="XMLID_1708_"
                  fill="currentColor"
                  d="m167.89 262.745c0 10.258 8.346 18.604 18.604 18.604h29.599c5.575 0 10.572-2.477 13.985-6.375 9.489 4.186 19.759 6.375 30.254 6.375h51.278c17.913 0 32.486-14.573 32.486-32.485v-43.028c0-17.913-14.573-32.486-32.486-32.486h-12.87l5.077-14.882c4.729-13.862-2.623-29.21-16.387-34.213-12.204-4.438-25.887.44-32.535 11.599-7.047 11.829-16.808 22.043-28.291 29.644-2.993-2.058-6.611-3.268-10.51-3.268h-29.599c-10.259 0-18.604 8.346-18.604 18.604v81.911zm104.186-116.657c1.74-2.921 5.324-4.196 8.521-3.037 3.604 1.31 5.529 5.329 4.291 8.959l-7.34 21.517c-4.638.868-8.151 4.932-8.151 9.822 0 5.522 4.477 10 10 10h5.295c.024 0 .048.003.072.003.025 0 .05-.003.075-.003h26.771c6.885 0 12.486 5.602 12.486 12.486v43.028c0 6.885-5.602 12.485-12.486 12.485h-51.278c-8.986 0-17.749-2.184-25.635-6.341v-70.927l1.221-.776c14.726-9.359 27.229-22.228 36.158-37.216zm-84.186 36.14h26.807v78.622.005.493h-26.807z"
                />
                <path
                  id="XMLID_1761_"
                  fill="currentColor"
                  d="m255.993 53.985c-22.973 0-44.995 5.122-65.452 15.226-4.952 2.445-6.984 8.441-4.539 13.394 2.445 4.95 8.44 6.985 13.394 4.538 17.68-8.73 36.722-13.157 56.597-13.157 70.58 0 128 57.421 128 128s-57.42 128-128 128-128-57.421-128-128c0-19.874 4.427-38.916 13.158-56.597 2.445-4.952.414-10.949-4.539-13.395-4.954-2.442-10.949-.413-13.394 4.539-10.103 20.458-15.225 42.479-15.225 65.452 0 81.607 66.393 148 148 148s148-66.393 148-148-66.393-148-148-148z"
                />
                <path
                  id="XMLID_1762_"
                  fill="currentColor"
                  d="m158.413 114.405c2.63 0 5.21-1.07 7.07-2.93s2.93-4.44 2.93-7.07-1.07-5.21-2.93-7.07c-1.86-1.859-4.44-2.93-7.07-2.93s-5.21 1.07-7.07 2.93-2.93 4.44-2.93 7.07 1.07 5.21 2.93 7.07 4.44 2.93 7.07 2.93z"
                />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center">
              Análise de Qualidade
              {isDemoMode && <DemoBadge />}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {(user.role === 'admin' || user.role === 'operator') && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/operador')}
                className="group relative p-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                title="Voltar para Registro de Falhas"
              >
                <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/0 to-cyan-500/0 group-hover:from-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-300" />
              </motion.button>
            )}
            <span className="text-slate-300">{user.name || user.username}</span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Configuração DPMO - IPC Standard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/20 rounded-xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center border border-orange-500/30">
                <Settings className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Configuração DPMO - Norma IPC
                  {dpmoConfigSaved && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                      ✓ Configurado
                    </span>
                  )}
                </h3>
                <p className="text-sm text-slate-400">
                  Defina os parâmetros de cálculo conforme IPC-A-610 e IPC-7912
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDPMOConfig(!showDPMOConfig)}
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showDPMOConfig ? 'Ocultar' : 'Configurar'}
            </Button>
          </div>

          {showDPMOConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-700"
            >
              <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-blue-500/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-slate-300">
                    <p className="font-semibold text-blue-400 mb-1">Informação IPC:</p>
                    <p className="mb-2">
                      O DPMO (Defeitos Por Milhão de Oportunidades) é calculado conforme norma
                      IPC-A-610.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                      <li>
                        <strong>Componentes por Placa:</strong> Número total de componentes montados
                        na placa
                      </li>
                      <li>
                        <strong>Pads SMD por Placa:</strong> Número de aberturas do stencil (juntas
                        soldadas)
                      </li>
                    </ul>
                    <p className="mt-2 text-slate-400">
                      O sistema <strong>soma</strong> componentes + pads SMD para calcular
                      oportunidades totais por placa.
                    </p>
                    <p className="mt-2 text-slate-300 font-semibold">
                      📌 Exemplo ilustrativo (conforme norma IPC):
                    </p>
                    <div className="mt-2 ml-4 text-sm text-slate-400 space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-2">
                        <p className="text-yellow-400 text-xs font-semibold">
                          ⚠️ Este é um exemplo didático com valores fictícios. O DPMO real será
                          calculado com seus dados reais.
                        </p>
                      </div>
                      {(() => {
                        const exemploComponentes = dpmoConfig.componentesPorPlaca || 100;
                        const exemploPads = dpmoConfig.padsSMDPorPlaca || 1000;
                        const exemploOportunidades = exemploComponentes + exemploPads;
                        const exemploPlacas = 450;
                        const exemploDefeitos = 3;
                        const exemploTotalOportunidades = exemploPlacas * exemploOportunidades;
                        const exemploDPMO = (
                          (exemploDefeitos / exemploTotalOportunidades) *
                          1000000
                        ).toFixed(2);

                        return (
                          <>
                            <div>
                              <p className="text-blue-400 font-semibold mb-1">
                                Exemplo com dados fictícios:
                              </p>
                              <p>
                                • Placas inspecionadas:{' '}
                                <strong className="text-white">
                                  {exemploPlacas.toLocaleString()} placas
                                </strong>
                              </p>
                              <p>
                                • Componentes por placa:{' '}
                                <strong className="text-white">
                                  {exemploComponentes.toLocaleString()}
                                </strong>
                              </p>
                              <p>
                                • Pads SMD por placa:{' '}
                                <strong className="text-white">
                                  {exemploPads.toLocaleString()}
                                </strong>
                              </p>
                              <p>
                                • Defeitos encontrados:{' '}
                                <strong className="text-red-400">{exemploDefeitos} defeitos</strong>
                              </p>
                            </div>
                            <div className="border-t border-slate-700 pt-2 mt-2">
                              <p className="text-green-400 font-semibold mb-1">
                                Cálculo passo a passo:
                              </p>
                              <p>
                                1. Oportunidades por placa ={' '}
                                <strong className="text-white">
                                  {exemploComponentes.toLocaleString()} +{' '}
                                  {exemploPads.toLocaleString()} ={' '}
                                  {exemploOportunidades.toLocaleString()}
                                </strong>
                              </p>
                              <p>
                                2. DPMO ={' '}
                                <strong className="text-white">
                                  ({exemploDefeitos} × 1.000.000) / (
                                  {exemploPlacas.toLocaleString()} ×{' '}
                                  {exemploOportunidades.toLocaleString()})
                                </strong>
                              </p>
                              <p>
                                3. DPMO ={' '}
                                <strong className="text-white">
                                  ({exemploDefeitos} × 1.000.000) /{' '}
                                  {exemploTotalOportunidades.toLocaleString()}
                                </strong>
                              </p>
                              <p className="text-orange-400 font-bold text-base mt-2">
                                ✅ Resultado do exemplo:{' '}
                                <strong className="text-white">
                                  DPMO ={' '}
                                  {parseFloat(exemploDPMO).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </strong>
                              </p>
                            </div>
                          </>
                        );
                      })()}
                      <p className="text-xs text-slate-500 italic mt-2">
                        <strong>Nota:</strong> O DPMO real do seu sistema (mostrado no card laranja)
                        será calculado usando os dados reais das placas inspecionadas e defeitos
                        encontrados no período selecionado, aplicando a mesma fórmula.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Componentes por Placa *
                    <span className="text-xs text-slate-500 ml-2">
                      (Número de componentes montados)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dpmoConfig.componentesPorPlaca || ''}
                    onChange={e =>
                      setDpmoConfig({
                        ...dpmoConfig,
                        componentesPorPlaca: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-900 border border-orange-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="Ex: 150"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Pads SMD por Placa *
                    <span className="text-xs text-slate-500 ml-2">
                      (Aberturas do stencil / Juntas soldadas)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dpmoConfig.padsSMDPorPlaca || ''}
                    onChange={e =>
                      setDpmoConfig({
                        ...dpmoConfig,
                        padsSMDPorPlaca: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-900 border border-orange-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500/50"
                    placeholder="Ex: 200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  * Pelo menos um campo deve ser preenchido. O sistema somará ambos os valores para
                  calcular oportunidades totais.
                </p>
                <Button onClick={handleSaveDPMOConfig} variant="success" className="ml-auto">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Período Rápido
              </label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todo o Período</option>
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">OM</label>
              <select
                value={omFilter}
                onChange={e => setOmFilter(e.target.value)}
                className="w-full bg-slate-900 border border-purple-500/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="all">Todas as OMs</option>
                {uniqueOms
                  .filter(om => om !== 'all')
                  .map(om => (
                    <option key={om} value={om}>
                      {om}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* KPIs Avançados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 auto-rows-fr">
          {/* KPI 1: Total de Falhas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800 via-red-900/20 to-slate-900 border border-red-500/20 rounded-xl p-6 hover:border-red-500/40 transition-all duration-300 shadow-lg shadow-red-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total de Falhas
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  kpis.variacao.startsWith('-') ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}
              ></div>
            </div>
            <p className="text-4xl font-black text-red-400 mb-1">{kpis.totalFalhas}</p>
            <div className="text-xs text-slate-500 mb-1">Defeitos encontrados no período</div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-blue-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Tendência: {kpis.variacao.startsWith('-') ? '↓' : '↑'}{' '}
                {Math.abs(parseFloat(kpis.variacao))}% vs 7 dias anteriores
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Últimos 7 dias: {kpis.ultimos7Dias} falhas
              </div>
            </div>
          </motion.div>

          {/* KPI 2: Yield */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 via-green-900/20 to-slate-900 border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300 shadow-lg shadow-green-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Yield
              </div>
              <div className="text-green-400">✓</div>
            </div>
            <p className="text-4xl font-black text-green-400 mb-1">{kpis.yieldPercent}%</p>
            <div className="text-xs text-slate-500 mb-1">Taxa de Aceitação</div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-green-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {kpis.totalInspecionadas.toLocaleString()} unidades inspecionadas
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {kpis.totalInspecionadas - kpis.totalFalhas} unidades aprovadas
              </div>
            </div>
          </motion.div>

          {/* KPI 3: DPMO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800 via-orange-900/20 to-slate-900 border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/40 transition-all duration-300 shadow-lg shadow-orange-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                DPMO
              </div>
              <div className="text-orange-400">📊</div>
            </div>
            <p className="text-4xl font-black text-orange-400 mb-1">
              {parseFloat(kpis.dpmo).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="text-xs text-slate-500 mb-1">Defeitos por Milhão de Oportunidades</div>
            {dpmoConfigSaved &&
            (dpmoConfig.componentesPorPlaca > 0 || dpmoConfig.padsSMDPorPlaca > 0) ? (
              <div className="mt-auto space-y-1">
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Usando configuração IPC:{' '}
                  {(
                    (dpmoConfig.componentesPorPlaca || 0) + (dpmoConfig.padsSMDPorPlaca || 0)
                  ).toLocaleString()}{' '}
                  oportunidades/placa
                </div>
                <div className="text-xs text-blue-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Cálculo: ({kpis.totalFalhas} × 1.000.000) / (
                  {kpis.totalInspecionadas.toLocaleString()} placas ×{' '}
                  {(
                    (dpmoConfig.componentesPorPlaca || 0) + (dpmoConfig.padsSMDPorPlaca || 0)
                  ).toLocaleString()}{' '}
                  oportunidades) ={' '}
                  {parseFloat(kpis.dpmo).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  DPMO
                </div>
              </div>
            ) : (
              <div className="mt-auto text-xs text-yellow-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Configure os parâmetros acima para cálculo preciso
              </div>
            )}
          </motion.div>

          {/* KPI 4: Nível Sigma */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-slate-800 via-cyan-900/20 to-slate-900 border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/40 transition-all duration-300 shadow-lg shadow-cyan-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nível Sigma
              </div>
              <div className="text-cyan-400">⚡</div>
            </div>
            <p className="text-4xl font-black text-cyan-400 mb-1">{kpis.nivelSigma}</p>
            <div className="text-xs text-slate-500 mb-1">Indicador de Qualidade Six Sigma</div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-cyan-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                DPMO:{' '}
                {parseFloat(kpis.dpmo).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {kpis.sigma >= 4
                  ? 'Excelente qualidade'
                  : kpis.sigma >= 3
                  ? 'Boa qualidade'
                  : 'Necessita melhoria'}
              </div>
            </div>
          </motion.div>

          {/* KPI 5: Principal Defeito */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-gradient-to-br from-slate-800 via-purple-900/20 to-slate-900 border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 shadow-lg shadow-purple-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Principal Defeito
              </div>
              <div className="text-purple-400">⚠️</div>
            </div>
            <p className="text-2xl font-black text-purple-400 mb-1 line-clamp-2 min-h-[3rem]">
              {kpis.principalDefeito}
            </p>
            <div className="text-xs text-slate-500 mb-1">Mais frequente no período</div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-purple-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Tipo de defeito mais recorrente
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Verifique ações corretivas necessárias
              </div>
            </div>
          </motion.div>

          {/* KPI 6: Taxa Críticos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-gradient-to-br from-slate-800 via-yellow-900/20 to-slate-900 border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all duration-300 shadow-lg shadow-yellow-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Críticos
              </div>
              <div className="text-yellow-400">🔥</div>
            </div>
            <p className="text-4xl font-black text-yellow-400 mb-1">{kpis.taxaCriticos}%</p>
            <div className="text-xs text-slate-500 mb-1">Taxa de Defeitos Críticos</div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-yellow-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                {kpis.defeitosCriticos} de {kpis.totalFalhas} falhas são críticas
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Prioridade alta ou urgente
              </div>
            </div>
          </motion.div>

          {/* KPI 6: Soldagem vs Posicionamento */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-slate-800 via-blue-900/20 to-slate-900 border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300 shadow-lg shadow-blue-500/10 h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Origens
              </div>
              <div className="text-blue-400">📊</div>
            </div>
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Soldagem</span>
                <span className="text-lg font-bold text-orange-400">{kpis.falhasSoldagem}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Posicionamento</span>
                <span className="text-lg font-bold text-blue-400">{kpis.falhasPosicionamento}</span>
              </div>
            </div>
            <div className="mt-auto space-y-1">
              <div className="text-xs text-blue-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Distribuição por processo
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Total: {kpis.falhasSoldagem + kpis.falhasPosicionamento} falhas categorizadas
              </div>
            </div>
          </motion.div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Defeitos por Tipo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="lg:col-span-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Distribuição de Falhas por Tipo</h3>
            <div style={{ height: '350px' }}>
              <Bar
                data={defeitosPorTipoData}
                options={{
                  ...chartOptions,
                  indexAxis: 'y' as const,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false },
                    title: { display: false },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#94a3b8' },
                      grid: { color: '#334155' },
                      beginAtZero: true,
                    },
                    y: {
                      grid: { display: false },
                      ticks: { color: '#94a3b8', autoSkip: false },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Tendência */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Tendência Temporal de Falhas</h3>
            <div style={{ height: '300px' }}>
              <Line
                data={tendenciaData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: true, position: 'top' },
                    title: { display: false },
                  },
                  scales: {
                    ...chartOptions.scales,
                    x: {
                      ...chartOptions.scales.x,
                      ticks: { ...chartOptions.scales.x.ticks, maxTicksLimit: 15 },
                    },
                    y: {
                      ...chartOptions.scales.y,
                      ticks: { ...chartOptions.scales.y.ticks, stepSize: 1 },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Categorias */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Origem da Falha (Processo)</h3>
            <div style={{ height: '300px' }}>
              <Doughnut
                data={categoriasData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { position: 'bottom' as const, labels: { color: '#94a3b8' } },
                    title: {
                      display: true,
                      text: 'Origem da Falha (Processo)',
                      ...chartOptions.plugins.title,
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Nível Sigma */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="lg:col-span-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Nível Sigma (Six Sigma)</h3>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-sm text-slate-400">Excelente (4σ+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500"></div>
                <span className="text-sm text-slate-400">Bom (3σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-sm text-slate-400">Melhorar (&lt;3σ)</span>
              </div>
            </div>
            <div style={{ height: '300px' }}>
              <Bar
                data={sigmaData}
                options={{
                  ...chartOptions,
                  indexAxis: 'y' as const,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false },
                    tooltip: {
                      ...chartOptions.plugins.tooltip,
                      callbacks: {
                        title: (items: any) => {
                          // Mostrar o nível Sigma no título
                          const item = items[0];
                          if (item) {
                            const nivel = sigmaData.labels[item.dataIndex];
                            return nivel;
                          }
                          return '';
                        },
                        label: (context: any) => {
                          // Mostrar informações apenas para a barra do nível atual
                          const nivelAtual = kpis.sigma || 0;
                          // Para gráfico horizontal, os níveis estão em ordem decrescente [6,5,4,3,2,1]
                          // Precisamos encontrar qual nível corresponde ao índice
                          const niveisSigma = [6, 5, 4, 3, 2, 1];
                          const nivelHovered = niveisSigma[context.dataIndex];

                          if (nivelHovered === nivelAtual && context.parsed.x > 5) {
                            return `Nível Atual: ${kpis.nivelSigma} | DPMO: ${parseFloat(
                              kpis.dpmo
                            ).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`;
                          }
                          return '';
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: '#94a3b8',
                        display: false, // Ocultar números do eixo X
                      },
                      grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        display: true,
                      },
                      beginAtZero: true,
                      max: 100,
                    },
                    y: {
                      grid: {
                        display: true,
                        color: 'rgba(148, 163, 184, 0.1)',
                      },
                      ticks: {
                        color: '#94a3b8',
                        font: {
                          weight: 'bold' as const,
                          size: 12,
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Radar Quality */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Radar de Métricas de Qualidade</h3>
            <div style={{ height: '350px' }}>
              <Radar
                data={radarQualityData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: true, position: 'top' },
                    title: { display: false },
                  },
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        stepSize: 20,
                        color: '#94a3b8',
                        backdropColor: 'rgba(30, 41, 59, 0.8)',
                      },
                      grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                      },
                      pointLabels: {
                        color: '#cbd5e1',
                        font: {
                          size: 12,
                          weight: 'bold',
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Análise por OM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold mb-4">Análise por OM</h3>
            <div style={{ height: '350px' }}>
              <Bar
                data={analisePorOMData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: { display: false },
                    title: { display: false },
                  },
                  scales: {
                    x: {
                      ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 },
                      grid: { display: false },
                    },
                    y: {
                      ticks: { color: '#94a3b8', stepSize: 1 },
                      grid: { color: '#334155' },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
