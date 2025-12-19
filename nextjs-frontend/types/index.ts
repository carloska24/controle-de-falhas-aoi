export interface Registro {
  id: string;
  om: string;
  qtdlote?: number;
  serial?: string;
  designador: string;
  tipodefeito: string;
  pn?: string;
  descricao?: string;
  obs?: string;
  prioridade?: string;
  status?: string;
  operador?: string;
  createdat: string;
  updatedat?: string;
  user_id?: string;
}

export interface OM {
  omNumber: string;
  qtdlote?: number;
  status: 'running' | 'paused' | 'finished';
  elapsed?: number;
  startTime?: number;
  endTime?: number;
}

export interface Metrics {
  total: number;
  oms: number;
  distrib: string;
}

export interface RequisicaoItem {
  pn: string;
  designador: string;
  quantidade_requisitada: number;
  quantidade_entregue: number;
  descricao?: string;
}

export interface Requisicao {
  id: number;
  om: string;
  items: RequisicaoItem[] | string; // Pode vir como JSON string do backend
  status: 'pendente' | 'parcialmente_entregue' | 'entregue';
  created_at: string;
  created_by?: string;
}

