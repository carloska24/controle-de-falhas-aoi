document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) { window.location.href = 'login.html'; return; }

    // Lógica de Controle de Acesso: mostra elementos apenas para admins
    if (user && user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('admin-only');
        });
    }

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
    const btnSalvarItens = document.querySelector('#btnSalvarItens');

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
    const statusMap = {
        pendente: 'Aberto',
        parcialmente_entregue: 'Separando',
        entregue: 'Entregue'
    };

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
                <td data-label="Status"><span class="status-tag status-${req.status}">${statusMap[req.status] || req.status}</span></td>
                <td data-label="Ações">
                    <button class="btn small btn-ver-itens" data-id="${req.id}">Ver Itens</button>
                    ${req.status !== 'entregue' ? `
                    <button class="btn small primary btn-atender-req" data-id="${req.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Atender</button>
                    ` : ''}
                    ${user && user.role === 'admin' ? `
                    <button class="btn small danger btn-excluir-req" data-id="${req.id}" style="margin-left: 4px;">Excluir</button>
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

    async function handleAtenderRequisicao(reqId) {
        if (!confirm(`Tem certeza que deseja marcar a requisição #${reqId} como "Entregue"?`)) return;

        try {
            setLoading(true);
            await fetchAutenticado(`${API_URL}/${reqId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'entregue' })
            });
            showToast(`Requisição #${reqId} marcada como "Entregue".`);
            await inicializar(); // Recarrega os dados para refletir a mudança
        } catch (error) { showToast(`Erro ao atender requisição: ${error.message}`, 'error'); } finally { setLoading(false); }
    }

    async function handleExcluirRequisicao(reqId) {
        if (!confirm(`Tem certeza que deseja excluir a requisição #${reqId}? Esta ação não pode ser desfeita.`)) return;

        try {
            setLoading(true);
            await fetchAutenticado(`${API_URL}/${reqId}`, { method: 'DELETE' });
            
            // Remove da lista local e renderiza a tabela novamente
            allRequisicoes = allRequisicoes.filter(r => r.id != reqId);
            renderTable();
            popularFiltroOM(); // Atualiza o filtro de OMs caso a última de uma OM seja removida

            showToast(`Requisição #${reqId} excluída com sucesso.`);
        } catch (error) { showToast(`Erro ao excluir requisição: ${error.message}`, 'error'); } finally { setLoading(false); }
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

        // Atender requisição
        if (target.classList.contains('btn-atender-req')) {
            handleAtenderRequisicao(target.dataset.id);
        }

        // Excluir requisição
        if (target.classList.contains('btn-excluir-req')) {
            handleExcluirRequisicao(target.dataset.id);
        }
        // Ver itens da requisição
        if (e.target.classList.contains('btn-ver-itens')) {
            const button = e.target;
            const reqId = button.dataset.id;
            const requisicao = allRequisicoes.find(r => r.id == reqId);
            const items = requisicao ? requisicao.items : [];

            modalTitle.textContent = `Requisição #${reqId} (OM: ${requisicao.om})`;
            modal.dataset.reqId = reqId; // Armazena o ID da requisição no modal
            
            if (items && items.length > 0) {
                tbodyItens.innerHTML = items.map(item => `
                    <tr data-pn="${item.pn}">
                        <td>${requisicao.om}</td>
                        <td>${item.pn}</td>
                        <td>${item.descricao || 'N/A'}</td>
                        <td>${item.quantidade_requisitada}</td>
                        <td>
                            <input 
                                type="number" 
                                class="input-table" 
                                value="${item.quantidade_entregue || 0}" 
                                min="0" 
                                max="${item.quantidade_requisitada}"
                            >
                        </td>
                    </tr>
                `).join('');
            } else {
                tbodyItens.innerHTML = '<tr><td colspan="5">Nenhum item encontrado para esta requisição.</td></tr>';
            }

            modal.classList.remove('hidden');
        }
    });

    btnSalvarItens.addEventListener('click', async () => {
        const reqId = modal.dataset.reqId;
        const requisicaoOriginal = allRequisicoes.find(r => r.id == reqId);
        if (!requisicaoOriginal) return;

        const updatedItems = Array.from(tbodyItens.querySelectorAll('tr')).map(row => {
            const pn = row.dataset.pn;
            const quantidade_entregue = parseInt(row.querySelector('.input-table').value, 10);
            const itemOriginal = requisicaoOriginal.items.find(i => i.pn === pn);
            return { ...itemOriginal, quantidade_entregue };
        });

        try {
            setLoading(true);
            await fetchAutenticado(`${API_URL}/${reqId}/itens`, { method: 'PUT', body: JSON.stringify({ items: updatedItems }) });
            showToast('Quantidades entregues salvas com sucesso!');
            modal.classList.add('hidden');
            await inicializar(); // Recarrega tudo para atualizar o status na tabela principal
        } catch (error) { showToast(`Erro ao salvar itens: ${error.message}`, 'error'); } finally { setLoading(false); }
    });

    // Listeners para fechar o modal
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    buscaInput.addEventListener('input', renderTable);
    filtroOM.addEventListener('change', renderTable);

    // Inicializar a página
    inicializar();
});
