document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) { window.location.href = 'login.html'; return; }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
    const API_URL = `${API_BASE_URL}/api/registros`;

    let allData = [];

    // =================================================================
    // Seletores do DOM
    // =================================================================
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
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

    function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }

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

        tableHead.innerHTML = `<tr><th>OM</th><th>Data</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>Obs.</th><th>Status</th><th>Ação</th></tr>`;
        tableBody.innerHTML = dadosFiltrados.map(item => `
            <tr data-id="${item.id}">
                <td data-label="OM">${item.om}</td>
                <td data-label="Data">${formatDate(item.createdat)}</td>
                <td data-label="Serial">${item.serial || '—'}</td>
                <td data-label="Designador">${item.designador}</td>
                <td data-label="Defeito">${item.tipodefeito}</td>
                <td data-label="Obs.">${item.obs || '—'}</td>
                <td data-label="Status"><span class="status-tag status-${item.status}">${item.status}</span></td>
                <td data-label="Ação" style="text-align: center;">
                    ${item.status === 'aberto' ? `<button class="btn primary small btn-reparar" data-id="${item.id}">Marcar como Reparado</button>` : '—'}
                </td>
            </tr>
        `).join('');
    }

    async function handleReparar(id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;

        // Se for um item de demonstração (não salvo no backend), atualiza apenas localmente
        const demoData = JSON.parse(sessionStorage.getItem('demoData') || '[]');
        const isDemoItem = demoData.some(d => d.id === id);

        if (isDemoItem) {
            item.status = 'reparado';
            const updatedDemoData = demoData.map(d => d.id === id ? item : d);
            sessionStorage.setItem('demoData', JSON.stringify(updatedDemoData));
            showToast('Status (demo) atualizado para "Reparado".', 'success');
            renderTable(); // Apenas renderiza a tabela, sem recarregar da API
            return;
        }

        try {
            await fetchAutenticado(`${API_URL}/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'reparado' })
            });
            if (item) item.status = 'reparado';
            showToast('Status atualizado para "Reparado".', 'success');
            renderTable();
        } catch (error) {
            showToast(`Erro ao atualizar status: ${error.message}`, 'error');
        }
    }

    async function inicializar() {
        setLoading(true);
        if (userDisplay) userDisplay.textContent = user.name || user.username;

        try {
            const registrosDoBackend = await fetchAutenticado(API_URL) || [];
            const demoData = JSON.parse(sessionStorage.getItem('demoData') || '[]');
            // Combina os dados, garantindo que os da demo tenham prioridade e não haja duplicatas
            allData = [...demoData, ...registrosDoBackend.filter(r => !demoData.some(d => d.id === r.id))];

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
    btnLogout.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
    [omFilter, statusFilter].forEach(el => el.addEventListener('change', renderTable));
    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-reparar')) {
            handleReparar(e.target.dataset.id);
        }
    });

    inicializar();
});