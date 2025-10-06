document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // Bloco de Segurança e Configurações
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    // Guarda de rota: apenas administradores podem acessar esta página
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Lógica de Controle de Acesso: mostra elementos apenas para admins
    if (user && user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.remove('admin-only');
        });
    }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
    const API_URL = `${API_BASE_URL}/api/registros`;

    const DEFEITOS_SOLDAGEM = ['Curto-circuito', 'Solda Fria', 'Excesso de Solda', 'Insuficiência de Solda', 'Tombstone', 'Bilboard', 'Solder Ball'];
    const DEFEITOS_POSICIONAMENTO = ['Componente Ausente', 'Componente Danificado', 'Componente Deslocado', 'Componente Incorreto', 'Componente Invertido', 'Polaridade Incorreta'];

    let allData = [];
    let charts = {};

    // =================================================================
    // Seletores do DOM
    // =================================================================
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const loadingOverlay = document.querySelector('#loadingOverlay');
    const dateRangeSelect = document.querySelector('#dateRange');
    const omFilterSelect = document.querySelector('#omFilter');
    const startDateInput = document.querySelector('#startDate');
    const endDateInput = document.querySelector('#endDate');

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
        if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
        return response.json();
    }

    function setLoading(isLoading) {
        loadingOverlay.classList.toggle('hidden', !isLoading);
    }

    // =================================================================
    // Lógica de Renderização e Análise
    // =================================================================
    function processarErenderizarDados() {
        let dadosFiltrados = [...allData];

        // Filtro por Período
        const periodoSelecionado = dateRangeSelect.value;
        if (periodoSelecionado === 'custom') {
            const startDate = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : null;
            const endDate = endDateInput.value ? new Date(endDateInput.value + 'T23:59:59') : null;

            if (startDate) {
                dadosFiltrados = dadosFiltrados.filter(d => new Date(d.createdat) >= startDate);
            }
            if (endDate) {
                dadosFiltrados = dadosFiltrados.filter(d => new Date(d.createdat) <= endDate);
            }
        } else if (periodoSelecionado !== 'all') {
            const dias = parseInt(periodoSelecionado, 10);
            if (!isNaN(dias)) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - dias);
                dadosFiltrados = dadosFiltrados.filter(d => new Date(d.createdat) >= dataLimite);
            }
        }

        // Filtro por OM
        const omSelecionada = omFilterSelect.value;
        if (omSelecionada !== 'all') {
            dadosFiltrados = dadosFiltrados.filter(d => d.om === omSelecionada);
        }

        // Atualizar KPIs
        document.getElementById('kpiTotalFalhas').textContent = dadosFiltrados.length;
        
        const contagemDefeitos = dadosFiltrados.reduce((acc, item) => {
            acc[item.tipodefeito] = (acc[item.tipodefeito] || 0) + 1;
            return acc;
        }, {});

        const [principalDefeito, qtd] = Object.entries(contagemDefeitos).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
        document.getElementById('kpiPrincipalDefeito').textContent = principalDefeito;

        const falhasSoldagem = dadosFiltrados.filter(d => DEFEITOS_SOLDAGEM.includes(d.tipodefeito)).length;
        const falhasPosicionamento = dadosFiltrados.filter(d => DEFEITOS_POSICIONAMENTO.includes(d.tipodefeito)).length;
        document.getElementById('kpiFalhasSoldagem').textContent = falhasSoldagem;
        document.getElementById('kpiFalhasPosicionamento').textContent = falhasPosicionamento;

        // Renderizar Gráficos
        renderizarGraficoDefeitos(contagemDefeitos);
        renderizarGraficoCategorias(falhasSoldagem, falhasPosicionamento);
        renderizarGraficoTendencia(dadosFiltrados);
    }

    function renderizarGraficoDefeitos(contagem) {
        const ctx = document.getElementById('defeitosPorTipoChart').getContext('2d');
        const sortedData = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
        
        if (charts.defeitos) charts.defeitos.destroy();
        charts.defeitos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(item => item[0]),
                datasets: [{
                    label: 'Quantidade de Falhas',
                    data: sortedData.map(item => item[1]),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, title: { display: true, text: 'Distribuição de Falhas por Tipo', color: '#e5e7eb', font: { size: 16 } } },
                scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }
            }
        });
    }

    function renderizarGraficoCategorias(soldagem, posicionamento) {
        const ctx = document.getElementById('defeitosPorCategoriaChart').getContext('2d');
        if (charts.categorias) charts.categorias.destroy();
        charts.categorias = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Falhas de Soldagem', 'Falhas de Posicionamento'],
                datasets: [{
                    data: [soldagem, posicionamento],
                    backgroundColor: ['#f59e0b', '#3b82f6'], // Laranja e Azul
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Causa Raiz Principal', color: '#e5e7eb', font: { size: 16 } },
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } }
                }
            }
        });
    }

    function renderizarGraficoTendencia(dados) {
        const ctx = document.getElementById('tendenciaFalhasChart').getContext('2d');

        // Agrupa as falhas por dia
        const falhasPorDia = dados.reduce((acc, item) => {
            const data = new Date(item.createdat).toISOString().split('T')[0]; // Normaliza para YYYY-MM-DD
            acc[data] = (acc[data] || 0) + 1;
            return acc;
        }, {});

        const sortedData = Object.entries(falhasPorDia).sort((a, b) => new Date(a[0]) - new Date(b[0]));

        if (charts.tendencia) charts.tendencia.destroy();
        charts.tendencia = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedData.map(item => item[0]),
                datasets: [{
                    label: 'Falhas por Dia',
                    data: sortedData.map(item => item[1]),
                    borderColor: '#ef4444', // var(--danger)
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Tendência de Falhas ao Longo do Tempo', color: '#e5e7eb', font: { size: 16 } },
                    legend: { display: false }
                },
                scales: {
                    x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' }, ticks: { color: '#94a3b8' } },
                    y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 } }
                }
            }
        });
    }

    async function inicializar() {
        setLoading(true);
        if (userDisplay) userDisplay.textContent = user.name || user.username;
        
        try {
            const rawData = await fetchAutenticado(API_URL) || [];
            const urlParams = new URLSearchParams(window.location.search);
            const isDemoMode = urlParams.get('demo') === 'true';

            if (isDemoMode && user && user.role === 'admin') {
                allData = rawData; // Em modo demo, mostra todos os dados
                document.querySelector('.app-title').textContent += ' (Modo Demo)';
            } else {
                // Em modo normal (ou se não for admin), filtra os dados de demonstração
                allData = rawData.filter(d => !d.om.startsWith('DEMO-'));
            }

            // Popular filtro de OM
            const oms = [...new Set(allData.map(d => d.om))];
            omFilterSelect.innerHTML = '<option value="all">Todas as OMs</option>';
            oms.forEach(om => {
                const option = document.createElement('option');
                option.value = om;
                option.textContent = om;
                omFilterSelect.appendChild(option);
            });

            processarErenderizarDados();
        } catch (error) {
            console.error("Erro ao inicializar a página:", error);
            alert("Não foi possível carregar os dados do relatório.");
        } finally {
            setLoading(false);
        }
    }

    // =================================================================
    // Event Listeners
    // =================================================================
    btnLogout.addEventListener('click', async () => {
        try {
            await fetchAutenticado(`${API_URL}/demo`, { method: 'DELETE' });
            await fetchAutenticado(`${API_BASE_URL}/api/requisicoes/demo`, { method: 'DELETE' });
        } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
        localStorage.clear(); sessionStorage.clear();
        window.location.href = 'login.html';
    });

    document.querySelectorAll('.filter-control').forEach(control => {
        control.addEventListener('change', processarErenderizarDados);
    });

    dateRangeSelect.addEventListener('change', () => {
        const isCustom = dateRangeSelect.value === 'custom';
        document.querySelectorAll('.custom-date-range').forEach(el => {
            el.classList.toggle('hidden', !isCustom);
        });
    })

    // Iniciar a página
    inicializar();
});