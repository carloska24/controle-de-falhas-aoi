// frontend/utils.js
// Funções utilitárias compartilhadas para o frontend

export function getApiBaseUrl() {
    // Retorna a base da API dinamicamente baseada no host atual.
    // Se o frontend estiver sendo servido pelo próprio backend, use a origem atual.
    const proto = window.location.protocol || 'http:';
    const host = window.location.hostname || 'localhost';
    // Se a porta atual for 3001 (servido pelo backend), mantenha a origem completa
    if (window.location.port === '3001') return `${proto}//${host}:3001`;
    // Caso contrário, a API está no mesmo host mas na porta 3001
    return `${proto}//${host}:3001`;
}

export function getToken() {
    return localStorage.getItem('authToken');
}

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

export async function fetchAutenticado(url, options = {}) {
    const token = getToken();
    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;
    options.headers = { ...defaultHeaders, ...options.headers };
    const response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Token inválido ou expirado.');
    }
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro de comunicação' }));
        throw new Error(errorData.error || `Erro na API: ${response.statusText}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

export function setLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('hidden', !isLoading);
}

export function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

// Predefine uma variável global utilitária para compatibilidade com scripts antigos
try {
    if (typeof window !== 'undefined' && !window.API_BASE_URL) {
        window.API_BASE_URL = getApiBaseUrl();
    }
} catch (e) {
    // ignore in non-browser contexts
}
