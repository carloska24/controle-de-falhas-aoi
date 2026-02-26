'use client';

import { useState, useMemo, useEffect, useCallback, useRef, useTransition } from 'react';
import Skeleton from '@/components/ui/Skeleton';
import { Trash2, FilePlus, Loader2, Search, X, Edit3, Save } from 'lucide-react';
import { Registro } from '@/types/index';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Dialog from '@/components/ui/Dialog';
import { format, isValid } from 'date-fns';
import OMTimeSummary from './OMTimeSummary';
import { useDebounce } from '@/hooks/useDebounce';

interface ProTableProps {
  registros: Registro[];
  onDelete: (ids: string[]) => Promise<void>;
  onGenerateRequest: (ids: string[]) => Promise<void>;
  onAddDemo: () => Promise<void>;
  onEdit?: (id: string, data: Partial<Registro>) => Promise<void>;
  isLoading?: boolean;
  omTimeSummary?: {
    startTime: number | null;
    endTime: number | null;
    elapsed: number;
  };
}

export default function ProTable({
  registros,
  onDelete,
  onGenerateRequest,
  onAddDemo,
  onEdit,
  isLoading = false,
  omTimeSummary,
}: ProTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Registro | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isRequesting, setIsRequesting] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Estado para edição
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Registro>>({});
  const [isSaving, setIsSaving] = useState(false);

  // useTransition para operações de ordenação não-bloqueantes
  const [isPending, startTransition] = useTransition();

  const perPage = 12; // Fixado em 12 itens por página

  // Debounce da busca global para otimizar performance
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);

  // Filtrar registros por busca global (usando valor debounced)
  const filteredRegistros = useMemo(() => {
    if (!Array.isArray(registros)) return [];
    if (!debouncedGlobalFilter.trim()) return registros;

    const filterLower = debouncedGlobalFilter.toLowerCase();
    return registros.filter(registro => {
      return (
        registro.om?.toLowerCase().includes(filterLower) ||
        registro.pn?.toLowerCase().includes(filterLower) ||
        registro.serial?.toLowerCase().includes(filterLower) ||
        registro.designador?.toLowerCase().includes(filterLower) ||
        registro.tipodefeito?.toLowerCase().includes(filterLower) ||
        registro.descricao?.toLowerCase().includes(filterLower) ||
        registro.prioridade?.toLowerCase().includes(filterLower)
      );
    });
  }, [registros, debouncedGlobalFilter]);

  // Função robusta de comparação para ordenação - memoizada e otimizada
  const compareValues = useCallback((aVal: any, bVal: any, field: keyof Registro): number => {
    // Early return para valores iguais
    if (aVal === bVal) return 0;

    // Tratamento de valores nulos/undefined - sempre vão para o final
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Tratamento especial para campo de data - otimizado
    if (field === 'createdat') {
      // Parsear datas de forma eficiente
      const dateA = new Date(aVal).getTime();
      const dateB = new Date(bVal).getTime();

      // Verificar se as datas são válidas
      if (isNaN(dateA) && isNaN(dateB)) return 0;
      if (isNaN(dateA)) return 1; // Data inválida vai para o final
      if (isNaN(dateB)) return -1;

      // Comparação numérica direta (muito rápida)
      return dateA - dateB;
    }

    // Converter para string uma vez e reutilizar
    const strA = String(aVal).trim();
    const strB = String(bVal).trim();

    // Se ambos estão vazios, são iguais
    if (strA === '' && strB === '') return 0;
    if (strA === '') return 1;
    if (strB === '') return -1;

    // Comparação numérica rápida (mais rápido que localeCompare)
    const numA = Number(aVal);
    const numB = Number(bVal);
    if (!isNaN(numA) && !isNaN(numB) && strA === String(numA) && strB === String(numB)) {
      return numA - numB;
    }

    // Comparação de strings otimizada
    // Usar comparação direta primeiro (mais rápida)
    if (strA < strB) return -1;
    if (strA > strB) return 1;

    // Fallback para localeCompare apenas se necessário
    return strA.localeCompare(strB, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    });
  }, []);

  // Ordenação otimizada com cache para grandes datasets
  const sortedRegistros = useMemo(() => {
    if (!Array.isArray(filteredRegistros)) return [];
    if (!sortField) return filteredRegistros;

    // Para datasets pequenos, ordenação direta é rápida
    if (filteredRegistros.length < 100) {
      try {
        const sorted = [...filteredRegistros].sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          const comparison = compareValues(aVal, bVal, sortField);
          return comparison === 0 ? 0 : sortDirection === 'asc' ? comparison : -comparison;
        });
        return sorted;
      } catch (error) {
        console.error('Erro na ordenação:', error);
        return filteredRegistros;
      }
    }

    // Para datasets maiores, usar algoritmo otimizado
    try {
      // Preparar array de índices para ordenação indireta (mais eficiente)
      const indices = filteredRegistros.map((_, idx) => idx);

      indices.sort((idxA, idxB) => {
        const aVal = filteredRegistros[idxA][sortField];
        const bVal = filteredRegistros[idxB][sortField];
        const comparison = compareValues(aVal, bVal, sortField);
        return comparison === 0 ? 0 : sortDirection === 'asc' ? comparison : -comparison;
      });

      return indices.map(idx => filteredRegistros[idx]);
    } catch (error) {
      console.error('Erro na ordenação:', error);
      return filteredRegistros;
    }
  }, [filteredRegistros, sortField, sortDirection, compareValues]);

  // Resetar página quando filtro ou ordenação mudar
  // Criar uma chave única para rastrear mudanças sem alterar o tamanho do array
  const sortKey = useMemo(() => {
    return `${debouncedGlobalFilter}_${sortField || 'null'}_${sortDirection}`;
  }, [debouncedGlobalFilter, sortField, sortDirection]);

  // Cleanup do timeout ao desmontar
  useEffect(() => {
    return () => {
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
    };
  }, []);

  // Resetar página quando ordenação muda - usando transition para não bloquear UI
  useEffect(() => {
    startTransition(() => {
      setCurrentPage(1);
    });
  }, [sortKey, startTransition]);

  const totalPages = Math.max(1, Math.ceil(sortedRegistros.length / perPage));
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = startIdx + perPage;
  const paginatedRegistros = sortedRegistros.slice(startIdx, endIdx);

  // Ajusta página quando totalPages mudar (por exemplo, após deletar registros)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Handler seguro para mudança de página com validação
  const handlePageChange = useCallback(
    (newPage: number) => {
      // Validação para garantir que a página está dentro dos limites válidos
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      if (validPage !== currentPage && validPage >= 1 && validPage <= totalPages) {
        setCurrentPage(validPage);
      }
    },
    [totalPages, currentPage]
  );

  // Ref para cleanup de timeouts
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSort = useCallback(
    (field: keyof Registro, e?: React.MouseEvent | React.KeyboardEvent) => {
      try {
        // Validar campo
        if (!field || typeof field !== 'string') {
          return;
        }

        // Prevenir comportamentos padrão do evento de forma otimizada
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        // Usar startTransition para tornar não-bloqueante (evita violações de performance)
        startTransition(() => {
          if (sortField === field) {
            // Mesmo campo: alternar direção
            setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
          } else {
            // Novo campo: começar com ascendente
            setSortField(field);
            setSortDirection('asc');
          }
        });

        // Limpar seleção de texto de forma assíncrona (não bloqueia)
        if (typeof window !== 'undefined' && window.getSelection) {
          // Usar requestIdleCallback se disponível, senão setTimeout
          const clearSelection = () => {
            try {
              window.getSelection()?.removeAllRanges();
            } catch (err) {
              // Ignora erros silenciosamente
            }
          };

          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(clearSelection, { timeout: 100 });
          } else {
            setTimeout(clearSelection, 0);
          }
        }
      } catch (error) {
        // Captura qualquer erro e loga sem quebrar a aplicação
        console.error('Erro ao ordenar tabela:', error);
      }
    },
    [sortField, startTransition]
  );

  // Otimizado com useCallback para evitar re-criações
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!Array.isArray(paginatedRegistros)) return;
    startTransition(() => {
      if (selectedIds.size === paginatedRegistros.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(paginatedRegistros.map(r => r.id)));
      }
    });
  }, [paginatedRegistros, selectedIds.size]);

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    await onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleGenerateRequest = async () => {
    if (selectedIds.size === 0 || isRequesting) return;
    setIsRequesting(true);
    try {
      await onGenerateRequest(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsRequesting(false);
    }
  };

  // Handler para duplo clique - abre modal de edição
  const handleDoubleClick = useCallback((registro: Registro) => {
    setEditingRegistro(registro);
    setEditFormData({
      pn: registro.pn || '',
      serial: registro.serial || '',
      designador: registro.designador || '',
      tipodefeito: registro.tipodefeito || '',
      descricao: registro.descricao || '',
      prioridade: registro.prioridade || 'media',
    });
  }, []);

  // Handler para salvar edição
  const handleSaveEdit = async () => {
    if (!editingRegistro || !onEdit) return;
    setIsSaving(true);
    try {
      await onEdit(editingRegistro.id, editFormData);
      setEditingRegistro(null);
      setEditFormData({});
    } finally {
      setIsSaving(false);
    }
  };

  // Fechar modal de edição
  const handleCloseEdit = () => {
    setEditingRegistro(null);
    setEditFormData({});
  };

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F para focar busca
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
        searchInput?.focus();
      }
      // Esc para limpar busca
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement;
        if (document.activeElement === searchInput) {
          setGlobalFilter('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="bg-gradient-to-b from-[#16243a] to-[#112137] border border-[#314566] rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black tracking-wide text-[#b5c6e3] flex items-center gap-3">
          <svg
            width="34"
            height="34"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="rg-list-new" x1="2" y1="62" x2="62" y2="2">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <g>
              <path
                d="m31 45h-8c-1.103 0-2 .897-2 2 0 2.206 1.794 4 4 4h4c2.206 0 4-1.794 4-4 0-1.103-.897-2-2-2zm-2 4h-4c-1.103 0-2-.897-2-2h8c0 1.103-.897 2-2 2z"
                fill="url(#rg-list-new)"
              />
              <circle cx="42" cy="6" r="1" fill="url(#rg-list-new)" />
              <circle cx="38" cy="6" r="1" fill="url(#rg-list-new)" />
              <path d="m23 5h8v2h-8z" fill="url(#rg-list-new)" />
              <path
                d="m59.093 19.32 2.578-2.578c.857-.856 1.329-1.996 1.329-3.207 0-2.501-2.035-4.535-4.536-4.535-1.212 0-2.351.472-3.207 1.328l-4.671 4.672h-3.101c-.163 0-.324.013-.485.024v-9.024c0-2.757-2.243-5-5-5h-30c-2.757 0-5 2.243-5 5v23.586l-2.76 2.761c-2.09 2.089-3.24 4.866-3.24 7.82 0 .606.051 1.218.15 1.818l1.556 9.332c.216 1.298.573 2.574 1.061 3.792l1.233 3.084v4.807h14v-4.807l.69-1.725c.193-.483.357-.974.508-1.468h21.802c2.757 0 5-2.243 5-5v-18.586l.405-.405.918.551c1.569.942 3.368 1.44 5.2 1.44 1.087 0 2.162-.175 3.195-.52l4.444-1.48h1.838v-10h-1.667zm-2.422-7.578c.479-.478 1.116-.742 1.793-.742 1.398 0 2.536 1.138 2.536 2.535 0 .677-.264 1.313-.743 1.793l-9.331 9.332-2.391-1.913c-.549-.439-1.153-.798-1.792-1.076zm-8.085 5.258-4.066 4.066c-.32-.039-.642-.066-.966-.066-1.96 0-3.554 1.594-3.554 3.554 0 .311.042.617.121.912l-1.251 1.251c-.527-.328-.87-.902-.87-1.546 0-.481.195-.952.536-1.293l5.414-5.414c.944-.944 2.199-1.464 3.535-1.464zm-39.586-11c0-1.654 1.346-3 3-3h30c1.654 0 3 1.346 3 3v9.459c-.722.274-1.398.664-2 1.169v-5.628c0-1.103-.897-2-2-2h-28c-1.103 0-2 .897-2 2v30c0 .8.476 1.488 1.157 1.807-.431 1.273-.938 2.52-1.539 3.72-.145.292-.438.473-.764.473-.471 0-.854-.384-.854-.854zm8 55h-10v-2h10zm.833-5.274-.51 1.274h-10.646l-1.054-2.634c-.434-1.085-.752-2.221-.945-3.377l-1.556-9.332c-.08-.492-.122-.993-.122-1.49 0-2.42.942-4.694 2.654-6.406l1.346-1.347v13.731c0 1.575 1.28 2.855 2.854 2.855 1.088 0 2.066-.604 2.553-1.578 1.02-2.039 1.816-4.194 2.37-6.406l.75-2.998c.149-.599.685-1.018 1.303-1.018.698 0 1.287.545 1.34 1.241l.783 10.172c.031.416.047.834.047 1.252 0 2.085-.393 4.124-1.167 6.061zm-1.003-20.726c-1.537 0-2.871 1.042-3.244 2.533l-.586 2.344v-28.877h28v7.586l-3.878 3.878c-.724.723-1.122 1.683-1.122 2.707 0 1.187.556 2.265 1.439 2.976l-2.292 2.292-1.956 4.889c-.127.318-.191.652-.191.995 0 1.476 1.201 2.677 2.677 2.677.341 0 .675-.064.994-.191l4.329-1.732v3.923h-20.612l-.224-2.912c-.133-1.732-1.598-3.088-3.334-3.088zm19.535-2.221 2.855 2.855-3.291 1.317c-.434.174-.929-.169-.929-.628 0-.087.016-.171.049-.252zm8.635 17.221c0 1.654-1.346 3-3 3h-21.311c.203-1.095.311-2.209.311-3.335 0-.469-.018-.938-.054-1.405l-.404-5.26h20.458c1.103 0 2-.897 2-2v-5.586l2-2zm-4-15.414-3.586-3.586 3.791-3.79c.162.144.332.279.521.392l3.912 2.347zm20-5.586h-.162l-4.752 1.584c-2.226.743-4.729.466-6.733-.739l-6.597-3.958c-.467-.28-.756-.79-.756-1.333 0-.857.697-1.554 1.554-1.554 1.351 0 2.676.465 3.731 1.31l3.364 2.69h5.351v-2h-2.586l4.251-4.251 3.002 2.251h.333z"
                fill="url(#rg-list-new)"
              />
              <path d="m39 13h-24v6h24zm-2 4h-20v-2h20z" fill="url(#rg-list-new)" />
              <path d="m21 21h13v2h-13z" fill="url(#rg-list-new)" />
              <path d="m32 25h2v2h-2z" fill="url(#rg-list-new)" />
              <path d="m21 25h9v2h-9z" fill="url(#rg-list-new)" />
              <path d="m21 29h13v2h-13z" fill="url(#rg-list-new)" />
              <path d="m21 33h11v2h-11z" fill="url(#rg-list-new)" />
              <path d="m21 37h11v2h-11z" fill="url(#rg-list-new)" />
            </g>
          </svg>
          <span>Registros</span>
        </h2>
        <svg
          onClick={onAddDemo}
          className="w-12 h-12 cursor-pointer hover:scale-110 transition-transform duration-300"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Adicionar registros de demonstração</title>
          <defs>
            <linearGradient
              id="demoGradient"
              gradientUnits="userSpaceOnUse"
              x1="256"
              x2="256"
              y1="0"
              y2="512"
            >
              <stop offset="0" stopColor="#ffc837">
                <animate
                  attributeName="stop-color"
                  values="#ffc837;#ff8c00;#ffc837;#ffec8b;#ffc837"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="0.5" stopColor="#ff9500">
                <animate
                  attributeName="stop-color"
                  values="#ff9500;#ffc837;#ff9500;#ffb84d;#ff9500"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="1" stopColor="#ff8c00">
                <animate
                  attributeName="stop-color"
                  values="#ff8c00;#ffc837;#ff8c00;#ffec8b;#ff8c00"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
            <filter id="demoGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#demoGlow)">
            <path
              fill="url(#demoGradient)"
              d="m482.054 239.79c-19.378-19.505-45.154-30.247-72.576-30.247h-88.141c29.519-48.873-7.868-114.286-65.296-113.477-57.417-.811-94.822 64.615-65.294 113.477h-88.141c-56.577 0-102.606 46.295-102.606 103.198 0 56.007 46.423 103.197 102.607 103.197h109.448c5.524 0 10.002-4.479 10.002-10.002s-4.478-10.002-10.002-10.002h-109.448c-45.281 0-82.604-38.087-82.604-83.194 0-45.874 37.056-83.195 82.604-83.195h104.955c27.724 23.229 69.236 23.23 96.959 0h104.956c45.281 0 82.604 38.088 82.604 83.195 0 45.873-37.056 83.194-82.604 83.194h-109.427c-5.524 0-10.002 4.479-10.002 10.002s4.478 10.002 10.002 10.002h109.428c90.554.587 136.932-112.558 72.576-176.148zm-226.011-123.721c57.673.46 76.355 77.075 26.508 104.345-16.381 8.9-36.635 8.9-53.016 0-49.874-27.294-31.127-103.897 26.508-104.345z"
            />
            <path
              fill="url(#demoGradient)"
              d="m290.223 354.035 14.744-52.053 9.868 51.961c.875 4.612 5.325 7.637 9.939 6.766 4.613-.876 7.642-5.325 6.766-9.939l-15.139-79.72c-.006-.033-.013-.067-.02-.102-.934-4.61-4.863-8.014-9.555-8.276-4.697-.294-8.974 2.678-10.417 7.153-.031.097-.061.194-.088.292l-16.135 56.962-16.724-57.05c-.03-.101-.061-.2-.094-.3-1.489-4.463-5.814-7.354-10.494-7.047-4.69.313-8.582 3.762-9.483 8.478l-14.291 79.697c-.829 4.621 2.246 9.039 6.867 9.868 4.626.839 9.039-2.245 9.869-6.867l9.294-51.819 15.27 52.089c.029.1.061.199.093.298 1.413 4.236 5.349 7.072 9.806 7.071h.052c4.478-.022 8.411-2.904 9.787-7.17.028-.097.057-.194.085-.292z"
            />
            <path
              fill="url(#demoGradient)"
              d="m202.504 280.406c11.24-.348 11.232-16.658 0-17.003h-24.678c-4.695 0-8.501 3.807-8.501 8.501v81.091c0 4.695 3.807 8.501 8.501 8.501h24.678c11.24-.348 11.232-16.658 0-17.003h-16.177v-23.543h13.673c11.24-.348 11.232-16.658 0-17.003h-13.673v-23.543h16.177z"
            />
            <path
              fill="url(#demoGradient)"
              d="m79.863 351.706c0 5.072 3.236 9.792 8.693 9.792.675-.003 16.603-.064 22.961-.176 52.796-.98 52.843-97.065-.803-96.245h-22.35c-4.697 0-8.501 3.922-8.501 8.584zm30.851-69.627c31.726-.44 30.861 61.75.504 62.241-3.245.058-9.215.102-14.221.132-.085-23.108-.07-38.536-.116-62.373z"
            />
            <path
              fill="url(#demoGradient)"
              d="m442.409 313.288c0-27.251-22.054-49.421-49.16-49.421-65.127 2.481-65.109 96.372.001 98.842 27.106 0 49.159-22.171 49.159-49.421zm-81.318 0c0-17.876 14.425-32.418 32.157-32.418 42.602 1.625 42.59 63.219 0 64.837-17.731-.001-32.157-14.543-32.157-32.419z"
            />
            <path
              fill="url(#demoGradient)"
              d="m234.442 206.115c6.248 3.607 14.047 3.608 20.296 0l29.314-16.925c13.293-7.674 13.296-27.478 0-35.154l-29.314-16.924c-13.306-7.68-30.444 2.246-30.444 17.577v33.849c-.001 7.338 3.793 13.908 10.148 17.577zm9.855-51.426c0-.259.265-.354.439-.254l29.314 16.924c.195.169.195.339 0 .508l-29.314 16.925c-.244.085-.391 0-.439-.254z"
            />
            <path
              fill="url(#demoGradient)"
              d="m265.274 402.105c-4.954-11.901-23.395-4.262-18.463 7.65 4.936 11.923 23.358 4.282 18.463-7.65z"
            />
          </g>
        </svg>
      </div>

      {/* Toolbar Simplificado */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#314566] gap-4 flex-wrap">
        {/* Lado Esquerdo: Busca */}
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <div className="flex-1 max-w-md">
            <Input
              id="global-search-input"
              placeholder="Buscar por OM, Serial, Defeito, Descrição..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="bg-[#0f1a2b] border-[#2a3d5c] text-[#eaf0ff] placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400/20"
              aria-label="Campo de busca global para filtrar registros"
            />
          </div>
          {globalFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGlobalFilter('')}
              className="text-slate-400 hover:text-white shrink-0"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Lado Direito: Indicadores e Ações */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Indicadores */}
          {selectedIds.size > 0 && (
            <span
              className="text-sm text-slate-400 flex items-center gap-2"
              role="status"
              aria-live="polite"
            >
              <span className="text-green-400">✓</span>
              {selectedIds.size} selecionado(s)
            </span>
          )}
          {globalFilter && (
            <span className="text-sm text-cyan-400 flex items-center gap-2">
              <Search className="w-3 h-3" />
              {sortedRegistros.length} resultado(s)
            </span>
          )}

          {/* Ações */}
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={selectedIds.size === 0 || isLoading}
            aria-label={`Excluir ${selectedIds.size} registro(s) selecionado(s)`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            )}
            Excluir
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleGenerateRequest}
            disabled={selectedIds.size === 0 || isRequesting}
            aria-label={`Gerar requisição para ${selectedIds.size} registro(s) selecionado(s)`}
          >
            {isRequesting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <FilePlus className="w-4 h-4" aria-hidden="true" />
            )}
            Requisitar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className="w-max min-w-full border-collapse"
          role="table"
          aria-label="Tabela de registros de falhas"
        >
          <thead>
            <tr className="bg-slate-900/40 text-left">
              <th className="p-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === paginatedRegistros.length && paginatedRegistros.length > 0
                  }
                  onChange={toggleSelectAll}
                  className={`rounded border-2 transition-all ${
                    selectedIds.size === paginatedRegistros.length && paginatedRegistros.length > 0
                      ? 'border-cyan-400 bg-cyan-500/20 checked:bg-cyan-500'
                      : 'border-[#2a3d5c] bg-[#0f1a2b]'
                  }`}
                  aria-label="Selecionar todos os registros da página"
                />
              </th>
              {(
                [
                  'om',
                  'pn',
                  'serial',
                  'designador',
                  'tipodefeito',
                  'descricao',
                  'createdat',
                ] as const
              ).map(field => (
                <th
                  key={field}
                  className={`p-3 text-xs font-bold text-slate-300 uppercase tracking-wide text-left cursor-pointer hover:text-white transition-colors relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded ${
                    field === 'createdat'
                      ? 'min-w-[96px]'
                      : field === 'descricao'
                      ? 'min-w-[140px]'
                      : field === 'serial'
                      ? 'min-w-[108px]'
                      : ''
                  }`}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSort(field, e);
                  }}
                  onMouseDown={e => {
                    // Apenas prevenir seleção de texto, não ordenar
                    e.preventDefault();
                    if (window.getSelection) {
                      window.getSelection()?.removeAllRanges();
                    }
                  }}
                  role="columnheader"
                  aria-sort={
                    sortField === field
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(field, e);
                    }
                  }}
                  aria-label={`Ordenar por ${
                    field === 'om'
                      ? 'OM'
                      : field === 'pn'
                      ? 'Código Alternativo'
                      : field === 'tipodefeito'
                      ? 'Defeito'
                      : field === 'createdat'
                      ? 'Data/Hora'
                      : field
                  }`}
                >
                  {/* Wrapper interno otimizado */}
                  <div className="flex items-center gap-1 select-none pointer-events-none">
                    <span>
                      {field === 'om'
                        ? 'OM'
                        : field === 'pn'
                        ? 'Cod. Alt'
                        : field === 'tipodefeito'
                        ? 'Defeito'
                        : field === 'createdat'
                        ? 'Data/Hora'
                        : field.charAt(0).toUpperCase() + field.slice(1)}
                    </span>
                    {sortField === field ? (
                      <span
                        className={`text-base font-bold select-none ${
                          sortDirection === 'asc' ? 'text-cyan-400' : 'text-cyan-500'
                        }`}
                        aria-hidden="true"
                      >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : (
                      <span
                        className="text-[#4a5d7a] text-xs opacity-40 select-none"
                        aria-hidden="true"
                      >
                        ↕
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 text-xs font-bold text-slate-300 uppercase tracking-wide text-left min-w-[96px]">
                Prioridade
              </th>
            </tr>
          </thead>
          <tbody className="">
            {isLoading ? (
              // Skeleton loaders melhorados durante carregamento
              Array.from({ length: perPage }).map((_, idx) => (
                <tr
                  key={`skeleton-${idx}`}
                  className="border-b border-[#314566]/50 animate-pulse"
                  role="row"
                >
                  <td className="p-3">
                    <Skeleton variant="circular" height={20} width={20} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={100} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={80} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={100} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={80} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={120} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={150} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={120} />
                  </td>
                  <td className="p-3">
                    <Skeleton variant="text" width={60} />
                  </td>
                </tr>
              ))
            ) : !Array.isArray(paginatedRegistros) || paginatedRegistros.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="text-center p-8 text-slate-500"
                  role="status"
                  aria-live="polite"
                >
                  {globalFilter
                    ? `Nenhum registro encontrado para "${globalFilter}".`
                    : 'Nenhum registro encontrado.'}
                </td>
              </tr>
            ) : (
              <>
                {paginatedRegistros.map((registro, index) => (
                  <tr
                    key={registro.id}
                    className={`border-b border-white/5 transition-all duration-200 group cursor-pointer ${
                      selectedIds.has(registro.id)
                        ? 'bg-cyan-500/10 shadow-[inset_3px_0_0_0_#22d3ee] border-cyan-500/20'
                        : index % 2 === 0
                        ? 'bg-white/[0.02] hover:bg-cyan-500/5 hover:border-cyan-500/30'
                        : 'bg-transparent hover:bg-cyan-500/5 hover:border-cyan-500/30'
                    }`}
                    onClick={e => {
                      // Usar startTransition para não bloquear UI
                      startTransition(() => {
                        toggleSelect(registro.id);
                      });
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      handleDoubleClick(registro);
                    }}
                    role="row"
                    aria-selected={selectedIds.has(registro.id)}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startTransition(() => {
                          toggleSelect(registro.id);
                        });
                      }
                    }}
                    aria-label={`Registro ${registro.om} - ${registro.tipodefeito}${
                      selectedIds.has(registro.id) ? ' - Selecionado' : ''
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(registro.id)}
                          onChange={e => {
                            e.stopPropagation();
                            startTransition(() => {
                              toggleSelect(registro.id);
                            });
                          }}
                          onClick={e => e.stopPropagation()}
                          className={`rounded border-2 transition-all ${
                            selectedIds.has(registro.id)
                              ? 'border-cyan-400 bg-cyan-500/20 checked:bg-cyan-500'
                              : 'border-[#2a3d5c] bg-[#0f1a2b]'
                          }`}
                          aria-label={`Selecionar registro ${registro.om}`}
                        />
                        {selectedIds.has(registro.id) && (
                          <span className="text-cyan-400 text-xs">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {/* OM - Fonte monoespaçada com destaque maior */}
                      <span
                        className={`font-mono text-sm font-bold tracking-wide whitespace-nowrap ${
                          selectedIds.has(registro.id) ? 'text-cyan-300' : 'text-white'
                        }`}
                      >
                        {registro.om}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* COD.ALT/PN - Destaque maior */}
                      <span className="font-mono text-sm font-bold text-amber-300 tracking-wide whitespace-nowrap">
                        {registro.pn || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* Serial - Estilo de código de placa industrial */}
                      <span
                        className="font-mono text-xs px-2 py-1 rounded bg-slate-800/80 border border-slate-600/50 text-cyan-200 tracking-wider uppercase cursor-help whitespace-nowrap block w-fit"
                        style={{ letterSpacing: '0.15em' }}
                        title={registro.serial ? `Serial: ${registro.serial}` : ''}
                      >
                        {registro.serial
                          ? registro.serial.length > 8
                            ? `...${registro.serial.slice(-8)}`
                            : registro.serial
                          : '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* Designadores com destaque colorido por tipo de componente */}
                      <div className="flex flex-wrap gap-0.5">
                        {registro.designador
                          ?.split(/[,\s]+/)
                          .filter(Boolean)
                          .map((des, i) => {
                            // Identificar tipo de componente pelo prefixo
                            const prefix = des.match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || '';

                            // Cores por famílias de componentes (paleta reduzida e mais consistente)
                            const colorMap: Record<string, string> = {
                              R: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                              C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                              L: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                              FL: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                              U: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                              Q: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                              D: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                              F: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                              LED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                              J: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                              SW: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                              Y: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                            };

                            const colorClass =
                              colorMap[prefix] ||
                              'bg-slate-500/20 text-slate-300 border-slate-500/40';

                            return (
                              <span
                                key={`${des}-${i}`}
                                className={`inline-flex items-center px-1 py-px text-[9px] font-medium rounded border ${colorClass}`}
                                title={`Componente: ${des}`}
                              >
                                {des}
                              </span>
                            );
                          })}
                      </div>
                    </td>
                    <td className="p-3">
                      {/* Tipo de Defeito - Badge maior e mais visível */}
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold rounded-lg border shadow-sm whitespace-nowrap ${(() => {
                          const def = (registro.tipodefeito || '').toLowerCase();
                          if (def.includes('curto') || def.includes('solder ball'))
                            return 'bg-rose-500/20 text-rose-200 border-rose-500/40 shadow-rose-500/20';
                          if (
                            def.includes('ausente') ||
                            def.includes('danificado') ||
                            def.includes('invertido') ||
                            def.includes('incorreta')
                          )
                            return 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-amber-500/20';
                          if (
                            def.includes('solda') ||
                            def.includes('levantado') ||
                            def.includes('tombstone')
                          )
                            return 'bg-blue-500/20 text-blue-200 border-blue-500/40 shadow-blue-500/20';
                          return 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-purple-500/20';
                        })()}`}
                      >
                        {(() => {
                          const def = registro.tipodefeito || '';
                          const map: Record<string, string> = {
                            'Insuficiência de Solda': 'Insuf. Solda',
                            'Excesso de Solda': 'Exces. Solda',
                            'Terminal Levantado': 'Term. Levant.',
                            'Polaridade Incorreta': 'Polar. Incorr.',
                            'Solder Ball': 'Solder Ball', // Já curto
                          };
                          return map[def] || def;
                        })()}
                      </span>
                    </td>
                    <td className="p-3">
                      {/* Descrição - Texto maior */}
                      <span
                        className="text-xs text-slate-400 italic max-w-[140px] truncate block"
                        title={registro.descricao}
                      >
                        {registro.descricao || '—'}
                      </span>
                    </td>
                    <td className="p-2.5 min-w-[96px]">
                      {/* Data em cima e hora embaixo para economizar largura */}
                      {(() => {
                        const date = new Date(registro.createdat);
                        if (!isValid(date))
                          return <span className="font-mono text-sm text-slate-300 tabular-nums">—</span>;
                        return (
                          <span className="font-mono text-[11px] text-slate-300 tabular-nums leading-tight inline-flex flex-col">
                            <span>{format(date, 'dd/MM/yy')}</span>
                            <span className="text-slate-400 text-[10px]">{format(date, 'HH:mm')}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 min-w-[96px]">
                      {registro.prioridade ? (
                        <Badge
                          variant={
                            registro.prioridade === 'urgente'
                              ? 'danger'
                              : registro.prioridade === 'alta'
                              ? 'warning'
                              : registro.prioridade === 'media'
                              ? 'default'
                              : 'info'
                          }
                          size="md"
                        >
                          {registro.prioridade.charAt(0).toUpperCase() +
                            registro.prioridade.slice(1)}
                        </Badge>
                      ) : (
                        <Badge variant="default" size="md">
                          Média
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={sortedRegistros.length}
          itemsPerPage={perPage}
          showInfo={true}
        />
      )}

      {/* OM Time Summary - aparece quando uma OM está finalizada */}
      {omTimeSummary && (
        <OMTimeSummary
          startTime={omTimeSummary.startTime}
          endTime={omTimeSummary.endTime}
          elapsed={omTimeSummary.elapsed}
          visible={!!omTimeSummary.startTime}
        />
      )}

      <div className="mt-4 text-xs text-slate-500 text-center">
        Dica: Duplo clique em uma linha para editar.
      </div>

      {/* Modal de Edição */}
      <Dialog
        open={!!editingRegistro}
        onClose={handleCloseEdit}
        title="Editar Registro"
        size="lg"
        icon={<Edit3 className="w-5 h-5 text-purple-400" />}
      >
        {editingRegistro && (
          <div className="space-y-6">
            {/* Info do registro */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-xs text-slate-500">OM</span>
                  <p className="font-mono text-lg font-bold text-white">{editingRegistro.om}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Criado em</span>
                  <p className="text-sm text-slate-300">
                    {isValid(new Date(editingRegistro.createdat))
                      ? format(new Date(editingRegistro.createdat), 'dd/MM/yyyy HH:mm')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Código Alternativo (PN)
                </label>
                <input
                  type="text"
                  value={editFormData.pn || ''}
                  onChange={e => setEditFormData(prev => ({ ...prev, pn: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="Ex: A50423"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Serial</label>
                <input
                  type="text"
                  value={editFormData.serial || ''}
                  onChange={e => setEditFormData(prev => ({ ...prev, serial: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono"
                  placeholder="Ex: 6880161825112584CA29"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Designador(es)
              </label>
              <input
                type="text"
                value={editFormData.designador || ''}
                onChange={e => setEditFormData(prev => ({ ...prev, designador: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-mono"
                placeholder="Ex: R34, C21, U15"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Tipo de Defeito
                </label>
                <select
                  value={editFormData.tipodefeito || ''}
                  onChange={e =>
                    setEditFormData(prev => ({ ...prev, tipodefeito: e.target.value }))
                  }
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                  <option value="">Selecione...</option>
                  <optgroup label="Defeitos de Solda">
                    <option value="Curto">Curto</option>
                    <option value="Solda Fria">Solda Fria</option>
                    <option value="Excesso de Solda">Excesso de Solda</option>
                    <option value="Insuficiência de Solda">Insuficiência de Solda</option>
                    <option value="Tombstone">Tombstone</option>
                    <option value="Bilboard">Bilboard</option>
                    <option value="Solder Ball">Solder Ball</option>
                    <option value="Terminal Levantado">Terminal Levantado</option>
                  </optgroup>
                  <optgroup label="Defeitos de Posicionamento">
                    <option value="Ausente">Ausente</option>
                    <option value="Danificado">Danificado</option>
                    <option value="Deslocado">Deslocado</option>
                    <option value="Incorreto">Incorreto</option>
                    <option value="Invertido">Invertido</option>
                    <option value="Polaridade Incorreta">Polaridade Incorreta</option>
                    <option value="Levantado">Levantado</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Prioridade</label>
                <select
                  value={editFormData.prioridade || 'media'}
                  onChange={e => setEditFormData(prev => ({ ...prev, prioridade: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Descrição / Observações
              </label>
              <textarea
                value={editFormData.descricao || ''}
                onChange={e => setEditFormData(prev => ({ ...prev, descricao: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
                placeholder="Observações adicionais..."
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Button variant="ghost" onClick={handleCloseEdit} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="success" onClick={handleSaveEdit} disabled={isSaving || !onEdit}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}
