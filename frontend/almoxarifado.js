document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) { window.location.href = 'login.html'; return; }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
    const API_URL = `${API_BASE_URL}/api/requisicoes`;

    let allRequisicoes = [];

    // =================================================================
    // Seletores do DOM
    // =================================================================
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const loadingOverlay = document.querySelector('#loadingOverlay');
    const buscaInput = document.querySelector('#buscaRequisicao');
    const tableBody = document.querySelector('#tbodyRequisicoes');
    const toastContainer = document.querySelector('#toastContainer');
    const filtroOM = document.querySelector('#filtroOM');
    // Seletores do Modal
    const modal = document.querySelector('#itensModal');
    const modalTitle = document.querySelector('#modalTitle');
    const closeModalBtn = document.querySelector('#closeModal');
    const tbodyItens = document.querySelector('#tbodyItens');

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

    function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }

    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    }

    // =================================================================
    // Lógica da Página
    // =================================================================
    function renderTable() {
        const filtroTexto = buscaInput.value.toLowerCase();
        const omSelecionada = filtroOM.value;

        const dadosFiltrados = allRequisicoes.filter(r => 
            (omSelecionada === 'todos' || r.om === omSelecionada) && r.om.toLowerCase().includes(filtroTexto));

        if (dadosFiltrados.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma requisição encontrada.</td></tr>`;
            return;
        }

        tableBody.innerHTML = dadosFiltrados.map(req => `
            <tr data-id="${req.id}">
                <td data-label="ID">#${req.id}</td>
                <td data-label="OM">${req.om}</td>
                <td data-label="Data">${formatDate(req.created_at)}</td>
                <td data-label="Solicitante">${req.created_by}</td>
                <td data-label="Status"><span class="status-tag status-${req.status}">${req.status}</span></td>
                <td data-label="Ações">
                    <button class="btn small btn-ver-itens" data-id="${req.id}" data-items='${req.items}'>Ver Itens</button>
                    ${user.role === 'admin' ? `
                    <button class="btn small danger btn-excluir-req" data-id="${req.id}">Excluir</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    function popularFiltroOM() {
        const oms = [...new Set(allRequisicoes.map(r => r.om))];
        filtroOM.innerHTML = `<option value="todos">Todas as OMs</option>`;
        oms.sort().forEach(om => {
            const option = document.createElement('option');
            option.value = om;
            option.textContent = om;
            filtroOM.appendChild(option);
        });
    }

    async function inicializar() {
        setLoading(true);
        if (userDisplay) userDisplay.textContent = user.name || user.username;

        try {
            allRequisicoes = await fetchAutenticado(API_URL) || [];
            popularFiltroOM();
            renderTable();
        } catch (error) {
            console.error("Erro ao carregar requisições:", error);
            showToast(`Não foi possível carregar as requisições: ${error.message}`, 'error');
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ef4444;">Erro ao carregar dados.</td></tr>`;
        } finally {
            setLoading(false);
        }
    }

    // =================================================================
    // Event Listeners
    // =================================================================
    btnLogout.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

    // Listener para abrir o modal
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;

        // Excluir requisição
        if (target.classList.contains('btn-excluir-req')) {
            const reqId = target.dataset.id;
            if (confirm(`Tem certeza que deseja excluir a requisição #${reqId}? Esta ação não pode ser desfeita.`)) {
                try {
                    setLoading(true);
                    await fetchAutenticado(`${API_URL}/${reqId}`, { method: 'DELETE' });
                    allRequisicoes = allRequisicoes.filter(r => r.id != reqId);
                    renderTable();
                    showToast(`Requisição #${reqId} excluída com sucesso.`);
                } catch (error) {
                    showToast(`Erro ao excluir requisição: ${error.message}`, 'error');
                } finally { setLoading(false); }
            }
        }
        // Ver itens da requisição
        if (e.target.classList.contains('btn-ver-itens')) {
            const button = e.target;
            const reqId = button.dataset.id;
            const items = JSON.parse(button.dataset.items);

            modalTitle.textContent = `Itens da Requisição #${reqId}`;
            
            if (items && items.length > 0) {
                tbodyItens.innerHTML = items.map(item => `
                    <tr>
                        <td>${item.pn}</td>
                        <td>${item.quantidade}</td>
                    </tr>
                `).join('');
            } else {
                tbodyItens.innerHTML = '<tr><td colspan="2">Nenhum item encontrado para esta requisição.</td></tr>';
            }

            modal.classList.remove('hidden');
        }
    });

    // Listeners para fechar o modal
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    buscaInput.addEventListener('input', renderTable);
    filtroOM.addEventListener('change', renderTable);

    // Inicializar a página
    inicializar();
});
