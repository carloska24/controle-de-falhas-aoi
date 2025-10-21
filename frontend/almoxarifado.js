document.addEventListener('DOMContentLoaded', async () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    // Garantir user via cookie HttpOnly
    try {
        const utils = await import('./utils.js');
        await utils.ensureUser();
    } catch (e) { /* ignore */ }
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) { window.location.href = 'login.html'; return; }
    // Guarda de rota: admin, almoxarifado e operador têm acesso
    if (!user || !['admin','almoxarifado','operator'].includes(user.role)) {
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
    const API_BASE_URL = window.API_BASE_URL || (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : ('http://' + window.location.hostname + ':3001'));
    const API_URL = `${API_BASE_URL}/api/requisicoes`;

    let allRequisicoes = [];

    // =================================================================
    // Seletores do DOM
    // =================================================================
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('[data-action="logout"]') || document.querySelector('#btnLogout');
    const loadingOverlay = document.querySelector('#loadingOverlay');
    
    // SUGESTÃO APLICADA (Reversão): Trocamos buscaInput por filtroOM
    // const buscaInput = document.querySelector('#buscaRequisicao'); // REMOVIDO
    const filtroOM = document.querySelector('#filtroOM'); // ADICIONADO DE VOLTA
    
    const tableBody = document.querySelector('#tbodyRequisicoes');
    const toastContainer = document.querySelector('#toastContainer');
    const filtroStatus = document.querySelector('#filtroStatus');
    const emptyState = document.querySelector('#emptyStateAlmox');
    let sortState = { key: 'created_at', dir: 'desc' };
    let searchTimer;
    // Seletores do Modal
    const modal = document.querySelector('#itensModal');
    const modalTitle = document.querySelector('#modalTitle');
    const closeModalBtn = document.querySelector('#closeModal');
    const tbodyItens = document.querySelector('#tbodyItens');
    const btnSalvarItens = document.querySelector('[data-action="save-items"]') || document.querySelector('#btnSalvarItens');

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

    // SUGESTÃO APLICADA (Reversão): Função para popular o dropdown de OM
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

    function renderTable() {
        // SUGESTÃO APLICADA (Reversão): Lógica de filtro alterada
        // const filtroTexto = (buscaInput?.value || '').toLowerCase(); // REMOVIDO
        const omSelecionada = filtroOM.value; // ADICIONADO DE VOLTA
        const statusSel = filtroStatus.value;

        let dadosFiltrados = allRequisicoes.filter(r =>
            (omSelecionada === 'todos' || r.om === omSelecionada) && // Filtro pelo dropdown
            (statusSel === 'todos' || r.status === statusSel)
            // r.om.toLowerCase().includes(filtroTexto) // Filtro por texto removido
        );

        // Ordenação
        const key = sortState.key;
        const dir = sortState.dir === 'asc' ? 1 : -1;
        dadosFiltrados.sort((a,b) => {
            let va = a[key] ?? '';
            let vb = b[key] ?? '';
            if (key === 'created_at' || key === 'id') {
                if (key === 'created_at') { va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime(); }
                else { va = Number(va) || 0; vb = Number(vb) || 0; }
            } else {
                va = va.toString().toLowerCase();
                vb = vb.toString().toLowerCase();
            }
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });

        if (dadosFiltrados.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
        }

        // A renderização da tabela com botões de ícone unificados (da sugestão anterior) é mantida
        tableBody.innerHTML = dadosFiltrados.map(req => `
            <tr data-id="${req.id}">
                <td data-label="ID" style="text-align: center; vertical-align: middle;">#${req.id}</td>
                <td data-label="OM" style="text-align: center; vertical-align: middle;">${req.om}</td>
                <td data-label="Data" style="text-align: center; vertical-align: middle;">${formatDate(req.created_at)}</td>
                <td data-label="Solicitante" style="text-align: center; vertical-align: middle;">${req.created_by}</td>
                <td data-label="Status" style="text-align: center; vertical-align: middle;"><span class="status-tag status-${req.status}">${statusMap[req.status] || req.status}</span></td>
                
                <td data-label="Ações" class="actions-cell" style="text-align: center; vertical-align: middle;">
                    <div class="action-wrap">
                        <button class="btn-icon btn-ver-itens" data-id="${req.id}" title="Ver Itens da Requisição">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    ${req.status !== 'entregue' ? `
                        <button class="btn-icon text-sky-400 hover:bg-sky-700/10 btn-atender-req" data-id="${req.id}" title="Atender Requisição">
                            <i data-lucide="check-circle" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                        <button class="btn-icon text-rose-600 hover:bg-rose-700/5 btn-excluir-req" data-id="${req.id}" title="Excluir Requisição — sem confirmação">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
    }

    
    async function inicializar() {
        setLoading(true);
        if (userDisplay) userDisplay.textContent = user.name || user.username;

        try {
            const raw = await fetchAutenticado(API_URL) || [];
            // Filtro defensivo no frontend: oculta DEMO para não-admin
            allRequisicoes = (user && user.role === 'admin') ? raw : raw.filter(r => !(r.om || '').startsWith('DEMO-'));
            
            // SUGESTÃO APLICADA (Reversão): Popular o filtro de OM
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
        const conf = confirm(`Marcar a requisição #${reqId} como Entregue?`);
        if (!conf) return;
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
        try {
            setLoading(true);
            await fetchAutenticado(`${API_URL}/${reqId}`, { method: 'DELETE' });
            
            // Remove da lista local e renderiza a tabela novamente
            allRequisicoes = allRequisicoes.filter(r => r.id != reqId);
            renderTable();
            
            // SUGESTÃO APLICADA (Reversão): Atualiza o filtro de OMs
            popularFiltroOM(); 

            showToast(`Requisição #${reqId} excluída com sucesso.`);
        } catch (error) { showToast(`Erro ao excluir requisição: ${error.message}`, 'error'); } finally { setLoading(false); }
    }

    // =================================================================
    // Event Listeners
    // =================================================================
    btnLogout.addEventListener('click', async () => {
        if (user && user.role === 'admin') {
            try {
                // Chama o endpoint unificado de logout admin que limpa DEMOs em ambos os domínios
                await fetchAutenticado(`${API_BASE_URL}/api/admin/logout`, { method: 'POST' });
            } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
        }
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html';
    });

    // Listener para abrir o modal
    tableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button'); // Otimização: foca apenas em cliques em botões
        if (!target) return; // Se o clique não foi em um botão, ignora.

        // Atender requisição
        if (target.classList.contains('btn-atender-req')) {
            handleAtenderRequisicao(target.dataset.id);
            return; // Encerra a função para evitar outras verificações
        }

        // Excluir requisição (sem confirmação)
        if (target.classList.contains('btn-excluir-req')) {
            // Nota: confirmação removida — a exclusão é executada imediatamente
            handleExcluirRequisicao(target.dataset.id);
            return; // Encerra a função
        }
        
        // Ver itens da requisição
        if (target.classList.contains('btn-ver-itens')) {
            const reqId = target.dataset.id;
            const requisicao = allRequisicoes.find(r => r.id == reqId);
            const items = requisicao ? requisicao.items : [];

            modalTitle.textContent = `Requisição #${reqId} (OM: ${requisicao.om})`;
            modal.dataset.reqId = reqId; // Armazena o ID da requisição no modal
            
            if (items && items.length > 0) {
                // Exibe apenas a descrição limpa (remove designador entre parênteses, ex: "Componente (C188)" -> "Componente")
                tbodyItens.innerHTML = items.map(item => {
                    const isDelivered = (item.quantidade_entregue || 0) >= item.quantidade_requisitada;
                    // Remove trecho do designador entre parênteses no final da descrição, caso exista
                    const descricaoLimpa = (item.descricao || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || 'N/A';
                    return `
                        <tr data-pn="${item.pn}">
                            <td>${item.pn}</td>
                            <td>${descricaoLimpa}</td>
                            <td>${item.quantidade_requisitada}</td>
                            <td>
                                <input 
                                    type="number" 
                                    class="input-table" 
                                    value="${item.quantidade_entregue || 0}" 
                                    min="0" 
                                    max="${item.quantidade_requisitada}"
                                    ${isDelivered ? 'disabled' : ''}
                                >
                            </td>
                            <td style="text-align: center;">
                                ${!isDelivered ? `
                                <button class="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white btn-entregar-item" data-pn="${item.pn}" title="Entregar quantidade total"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1H5L7.68 14.39C7.77 14.85 8.15 15.17 8.62 15.17H19.42C19.89 15.17 20.27 14.85 20.36 14.39L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="21" r="2" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="21" r="2" stroke="currentColor" stroke-width="2"/></svg> Entregar</button>
                                ` : `<span style="color: var(--primary); font-weight: 600;">Entregue</span>`}
                            </td>
                        </tr>
                    `;
                }).join('');
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

    // Listener para o botão "Entregar" dentro do modal
    tbodyItens.addEventListener('click', (e) => {
        const target = e.target.closest('.btn-entregar-item');
        if (!target) return;

        const pn = target.dataset.pn;
        const row = tbodyItens.querySelector(`tr[data-pn="${pn}"]`);
        if (row) {
            const inputEntregue = row.querySelector('.input-table');
            inputEntregue.value = inputEntregue.max; // Preenche com a quantidade máxima (requisitada)
            target.parentElement.innerHTML = `<span style="color: var(--primary); font-weight: 600;">Entregue</span>`; // Atualiza a UI
        }
    });

    // SUGESTÃO APLICADA (Reversão): Listeners de filtro
    // buscaInput.addEventListener('input', () => { ... }); // REMOVIDO
    filtroOM.addEventListener('change', renderTable); // ADICIONADO DE VOLTA
    filtroStatus.addEventListener('change', renderTable);

    // Ordenação por cabeçalho
    document.querySelectorAll('#tabelaRequisicoes th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (sortState.key === key) {
                sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.key = key;
                sortState.dir = key === 'created_at' || key === 'id' ? 'desc' : 'asc';
            }
            // Atualiza indicadores visuais
            document.querySelectorAll('#tabelaRequisicoes th.sortable').forEach(h => h.classList.remove('sort-asc','sort-desc'));
            th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
            renderTable();
        });
    });

    // Inicializar a página
    inicializar();
});