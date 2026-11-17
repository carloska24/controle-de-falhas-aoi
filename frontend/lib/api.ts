// Configuração da API base - comunicação com backend Express
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Servidor-side: usa o backend diretamente
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // Client-side: usa variável de ambiente ou detecta automaticamente
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Detecta automaticamente o host atual (seja localhost, IP ou domínio)
  // e assume que o backend está na porta 3001
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
}

export async function fetchAutenticado(url: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const defaultHeaders = { 'Content-Type': 'application/json' };
  const config: RequestInit = {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
    credentials: 'include', // Importante para cookies HttpOnly
  };

  let response: Response;
  try {
    response = await fetch(fullUrl, config);
  } catch (networkError) {
    // Erro de rede (sem resposta do servidor) - não redireciona automaticamente
    throw new Error('Erro de conexão com o servidor. Verifique sua conexão.');
  }

  if (response.status === 401) {
    // Apenas redireciona se realmente for erro de autenticação
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      // Usa router.push ao invés de window.location para evitar recarregamento completo
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw new Error('Token inválido ou expirado.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Erro de comunicação',
    }));
    throw Object.assign(new Error(errorData.error || `Erro na API: ${response.statusText}`), {
      status: response.status,
      details: errorData.details,
    });
  }

  if (response.status === 204) return null;
  return response.json();
}

// As telas atuais filtram/exportam no cliente. Carregue todas as páginas antes
// de publicar o resultado; nunca apresente a primeira página como o conjunto inteiro.
export async function fetchListaCompleta<T extends { id: string | number }>(
  endpoint: '/api/registros' | '/api/requisicoes'
): Promise<T[]> {
  const maxItens = 10000;
  const limite = 200;
  const itens: T[] = [];
  const ids = new Set<string | number>();
  let totalEsperado: number | undefined;
  let paginasEsperadas = 1;

  for (let pagina = 1; pagina <= paginasEsperadas; pagina++) {
    const resposta = await fetchAutenticado(`${endpoint}?page=${pagina}&limit=${limite}`);
    const meta = resposta?.meta;
    if (!Array.isArray(resposta?.data) || !meta ||
        !Number.isSafeInteger(meta.total) || meta.total < 0 ||
        !Number.isSafeInteger(meta.limit) || meta.limit !== limite ||
        meta.page !== pagina || !Number.isSafeInteger(meta.totalPages) ||
        meta.totalPages !== Math.ceil(meta.total / limite)) {
      throw new Error('A API retornou uma paginação inválida. Atualize a página e tente novamente.');
    }
    if (meta.total > maxItens) {
      throw new Error('A consulta ultrapassa 10.000 itens. Solicite à equipe um filtro por período antes de continuar.');
    }
    if (totalEsperado !== undefined && meta.total !== totalEsperado) {
      throw new Error('Os dados mudaram durante a consulta. Atualize a lista antes de continuar.');
    }
    totalEsperado = meta.total;
    paginasEsperadas = meta.totalPages;
    const quantidadeEsperada = Math.min(limite, meta.total - (pagina - 1) * limite);
    if (resposta.data.length !== quantidadeEsperada) {
      throw new Error('A consulta retornou dados incompletos. Atualize a lista antes de continuar.');
    }
    for (const item of resposta.data) {
      if (!item || !['string', 'number'].includes(typeof item.id) || ids.has(item.id)) {
        throw new Error('Os dados mudaram durante a consulta. Atualize a lista antes de continuar.');
      }
      ids.add(item.id);
      itens.push(item);
    }
  }
  return itens;
}

export async function encerrarSessao(): Promise<void> {
  await fetchAutenticado('/api/auth/logout', { method: 'POST' });
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
}

export function getRegistroVersion(registro?: { version?: number }): number {
  const version = registro?.version;
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
    throw new Error('Atualize a lista para obter a versão mais recente do registro.');
  }
  return version;
}
