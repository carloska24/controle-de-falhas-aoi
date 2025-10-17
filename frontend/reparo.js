document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) { window.location.href = 'login.html'; return; }
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
    const API_BASE_URL = 'http://192.168.0.67:3001';
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
    const tableHead = document.querySelector('#reparoTable thead');
    const toastContainer = document.querySelector('#toastContainer'); // Adicionado

    // =================================================================
    // Funções Utilitárias
    // =================================================================
    async function fetchAutenticado(url, options = {}) {
        const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
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

    // Adicionando a função de Toast para feedback visual
    function showToast(message, type = 'success') {
        if (!toastContainer) { // Adiciona o container se não existir no HTML
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

        // Cabeçalho da tabela com a nova ordem e centralizado
        tableHead.innerHTML = `<tr>
            <th style="text-align: center;">OM</th><th style="text-align: center;">Cod. Alt</th><th style="text-align: center;">Serial</th><th style="text-align: center;">Descrição</th><th style="text-align: center;">Designador</th><th style="text-align: center;">Defeito</th><th style="text-align: center;">Data/Hora</th><th style="text-align: center;">Status</th><th style="text-align: center;">Ação</th>
        </tr>`;

        // Corpo da tabela com a nova ordem e centralizado
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
                <td data-label="Ação" class="actions-cell" style="justify-content: center;">
                    ${item.status === 'aberto' ? `<button class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white btn-reparar" data-id="${item.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.44 2.5C17.44 2.5 14.42 2.5 12.64 4.87C10.86 7.24 10.56 10.23 10.56 10.23M10.56 10.23L13.44 13.11M10.56 10.23L7.68 7.35M6.56 13.77C6.56 13.77 9.58 13.77 11.36 11.4C12.43 10.01 12.82 8.37 12.82 8.37M12.82 8.37L9.94 5.49M12.82 8.37L15.7 11.25M2 22L10 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Reparar</span></button>` : ''}
                    <button class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold border border-rose-600 text-rose-600 hover:bg-rose-700/5 btn-excluir-reparo" data-id="${item.id}" style="margin-left: 4px;"> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 6L18.2 19.2C18.1 20.3 17.2 21 16.1 21H7.9C6.8 21 5.9 20.3 5.8 19.2L5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Excluir</span></button>
                </td>
            </tr>
        `).join('');
    }

    async function handleReparar(id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;
        try {
            await fetchAutenticado(`${API_URL}/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'reparado' })
            });
            showToast('Status atualizado para "Reparado".', 'success');
            await inicializar(); // Recarrega os dados para garantir consistência
        } catch (error) {
            showToast(`Erro ao atualizar status: ${error.message}`, 'error');
        }
    }

    async function handleExcluir(id) {
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
                // Endpoint unificado de logout admin limpa DEMOs de registros e requisições
                await fetchAutenticado(`${API_BASE_URL}/api/admin/logout`, { method: 'POST' });
            } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
        }
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html';
    });
    [omFilter, statusFilter].forEach(el => el.addEventListener('change', renderTable));
    tableBody.addEventListener('click', (e) => {
        // Use delegation with closest so clicks on SVG or span inside button still count
        const btn = e.target.closest && e.target.closest('button');
        if (!btn) return;
        if (btn.classList.contains('btn-reparar')) {
            const id = btn.dataset.id || btn.getAttribute('data-id');
            handleReparar(id);
            return;
        }
        if (btn.classList.contains('btn-excluir-reparo')) {
            const id = btn.dataset.id || btn.getAttribute('data-id');
            handleExcluir(id);
            return;
        }
    });

    inicializar();
});