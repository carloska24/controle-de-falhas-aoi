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

  if (response.status === 401 || response.status === 403) {
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
    throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}
