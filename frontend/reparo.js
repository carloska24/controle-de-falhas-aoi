document.addEventListener('DOMContentLoaded', async () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    // Token é mantido como HttpOnly cookie; usamos ensureUser para popular metadata local
    let user = null;
    try {
        const ensureUser = window.__utils__?.ensureUser || (await import('./utils.js').then(m => m.ensureUser));
        user = await ensureUser();
    } catch (e) {
        user = JSON.parse(localStorage.getItem('user') || 'null');
    }
    if (!user) { window.location.href = 'login.html'; return; }
    // Guarda de rota: admin, reparo e operador têm acesso
    if (!user || !['admin','reparo','operator'].includes(user.role)) {
        window.location.href = 'index.html';
        return;
    }

    // Lógica de Controle de Acesso: mostra elementos apenas para admins
    if (user && user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('admin-only');
        });
    }

    // Exibe botão de voltar para operadores
    if (user && user.role === 'operator') {
        const voltarBtn = document.createElement('a');
        voltarBtn.href = 'index.html';
        voltarBtn.className = 'btn outline';
        voltarBtn.textContent = 'Voltar para Registros';
        const userInfo = document.querySelector('.user-info');
        if (userInfo) userInfo.insertBefore(voltarBtn, userInfo.firstChild);
    }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    
    // CORRIGIDO: Removido o 'G'
    const API_BASE_URL = window.API_BASE_URL || (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : ('http://' + window.location.hostname + ':3001'));
    
    const API_URL = `${API_BASE_URL}/api/registros`;

    let allData = [];

    // =================================================================
    // Seletores do DOM
    // =================================================================
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('[data-action="logout"]') || document.querySelector('#btnLogout');
    const loadingOverlay = document.querySelector('#loadingOverlay');
    const omFilter = document.querySelector('#omFilter');
    const statusFilter = document.querySelector('#statusFilter');
    const tableBody = document.querySelector('#reparoTbody');
    // const tableHead = document.querySelector('#reparoTable thead'); // Não é mais necessário
    const toastContainer = document.querySelector('#toastContainer'); 

    // =================================================================
    // Funções Utilitárias
    // =================================================================
    async function fetchAutenticado(url, options = {}) {
        const defaultHeaders = { 'Content-Type': 'application/json' };
        options.headers = { ...defaultHeaders, ...options.headers };
        options.credentials = options.credentials || 'include';
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

    function setLoading(isLoading) {
        loadingOverlay.classList.toggle('hidden', !isLoading);
    }

    function formatDate(d) {
        if (!d) return '';
        const date = new Date(d);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const seg = String(date.getSeconds()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
    }

    function showToast(message, type = 'success') {
        if (!toastContainer) { 
            const container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.getElementById('toastContainer').appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    }

    // =================================================================
    // Lógica da Página
    // =================================================================
    function renderTable() {
        let dadosFiltrados = [...allData];

        if (omFilter.value !== 'all') {
            dadosFiltrados = dadosFiltrados.filter(d => d.om === omFilter.value);
        }
        if (statusFilter.value !== 'all') {
            dadosFiltrados = dadosFiltrados.filter(d => d.status === statusFilter.value);
        }

        // REMOVIDO: tableHead.innerHTML foi removido
        // (Cabeçalho agora está no reparo.html)

        // CORPO DA TABELA ATUALIZADO COM BOTÕES DE ÍCONE
        tableBody.innerHTML = dadosFiltrados.map(item => `
            <tr data-id="${item.id}">
                <td data-label="OM" style="text-align: center;">${item.om ?? ''}</td>
                <td data-label="Cod. Alt" style="text-align: center;">${item.pn ?? ''}</td>
                <td data-label="Serial" style="text-align: center;">${item.serial ?? ''}</td>
                <td data-label="Descrição" style="text-align: center;">${item.descricao ?? ''}</td>
                <td data-label="Designador" style="text-align: center;">${item.designador ?? ''}</td>
                <td data-label="Defeito" style="text-align: center;">${item.tipodefeito ?? ''}</td>
                <td data-label="Data/Hora" style="text-align: center;">${formatDate(item.createdat ?? '')}</td>
                <td data-label="Status" style="text-align: center;"><span class="status-tag status-${item.status}">${item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1)) : ''}</span></td>
                
                <td data-label="Ação" class="actions-cell" style="text-align: center; vertical-align: middle;">
                    <div class="action-wrap">
                        ${item.status === 'aberto' ? `
                        <button class="btn-icon text-amber-400 hover:bg-amber-500/10 btn-reparar" data-id="${item.id}" title="Marcar como Reparado — sem confirmação">
                            <i data-lucide="wrench" class="w-4 h-4"></i>
                        </button>` : ''}
                        
                        <button class="btn-icon text-rose-600 hover:bg-rose-700/5 btn-excluir-reparo" data-id="${item.id}" title="Excluir Registro — sem confirmação">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        // Esta chamada SÓ vai funcionar se lucide.js for carregado ANTES
        try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
    }

    async function handleReparar(id) {
        // CORRIGIDO: Comparação flexível (==) para funcionar com string ou número
        const item = allData.find(d => d.id == id); 
        if (!item) return;

        // Nota: confirmação removida — a ação é executada imediatamente

        try {
            setLoading(true); // ADICIONADO
            await fetchAutenticado(`${API_URL}/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'reparado' })
            });
            showToast('Status atualizado para "Reparado".', 'success');
            await inicializar(); // Recarrega os dados para garantir consistência
        } catch (error) {
            showToast(`Erro ao atualizar status: ${error.message}`, 'error');
        } finally {
            setLoading(false); // ADICIONADO
        }
    }

    async function handleExcluir(id) {
        // CORRIGIDO: Comparação flexível (==)
        const item = allData.find(d => d.id == id); 
        if (!item) return;

        // Nota: confirmação removida — a exclusão é executada imediatamente
        try {
            setLoading(true);
            // A API espera um array de IDs, mesmo que seja para um único item.
            await fetchAutenticado(API_URL, {
                method: 'DELETE',
                body: JSON.stringify({ ids: [id] })
            });
            showToast('Registro excluído com sucesso.');
            await inicializar(); // Recarrega os dados
        } catch (error) {
            showToast(`Erro ao excluir registro: ${error.message}`, 'error');
        } finally {
            setLoading(false); 
            // CORRIGIDO: O "img" que estava aqui foi removido.
        }
    }

    async function inicializar() {
        setLoading(true);
        if (userDisplay) userDisplay.textContent = user.name || user.username;

        try {
            const rawData = await fetchAutenticado(API_URL) || [];
            allData = (user && user.role === 'admin') ? rawData : rawData.filter(d => !d.om.startsWith('DEMO-'));
            
            const oms = ['all', ...new Set(allData.map(d => d.om))];
            omFilter.innerHTML = oms.map(om => `<option value="${om}">${om === 'all' ? 'Todas as OMs' : om}</option>`).join('');
            renderTable();
        } catch (error) {
            console.error("Erro ao inicializar:", error);
            showToast("Não foi possível carregar os dados de reparo.", 'error');
        } finally {
            setLoading(false);
        }
    }

    // =================================================================
    // Event Listeners
    // =================================================================
    btnLogout.addEventListener('click', async () => {
        if (user && user.role === 'admin') {
            try {
                await fetchAutenticado(`${API_BASE_URL}/api/admin/logout`, { method: 'POST' });
            } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
        }
        localStorage.clear(); sessionStorage.clear();
        await fetchAutenticado(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' }).catch(()=>{});
        window.location.href = 'login.html';
    });
    [omFilter, statusFilter].forEach(el => el.addEventListener('change', renderTable));
    
    tableBody.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('button');
        if (!btn) return;
        
        const id = btn.dataset.id || btn.getAttribute('data-id');
        if (!id) return; 

        if (btn.classList.contains('btn-reparar')) {
            // CORREÇÃO: Passa o ID como string (texto).
            // A função handleReparar() já usa '==' para comparar.
            handleReparar(id); 
            return;
        }
        if (btn.classList.contains('btn-excluir-reparo')) {
            // CORREÇÃO: Passa o ID como string (texto).
            // A função handleExcluir() já usa '==' para comparar.
            handleExcluir(id); 
            return;
        }
    });

    inicializar();
});