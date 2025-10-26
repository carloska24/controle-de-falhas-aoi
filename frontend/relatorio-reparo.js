document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('reparoReportContainer');
  const buscaInput = document.getElementById('buscaReparo');
  const filtroOM = document.getElementById('filtroOMReparo');
  const btnExportarCSV = document.getElementById('btnExportarCSVReparo');

  let allRegistros = [];
  let flatRegistros = [];

  // =================================================================
  // Lógica de API e Autenticação (COPIADA DE REPARO.JS)
  // =================================================================

  let user = null;
  let getApiBaseUrl = null;
  try {
    // Tenta importar as utils
    const utils = await import('./utils.js');
    user = await utils.ensureUser();
    getApiBaseUrl = utils.getApiBaseUrl; // Armazena a função
  } catch (e) {
    console.error("Falha ao carregar utils.js", e);
    // Fallback para usuário no localStorage se a importação falhar
    user = JSON.parse(localStorage.getItem('user') || 'null');
  }
  // Se não houver usuário, redireciona para o login
  if (!user) { window.location.href = 'login.html'; return; }

  // Define a URL correta da API (apontando para a porta 3001)
  const API_BASE_URL = window.API_BASE_URL || (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : ('http://' + window.location.hostname + ':3001'));
  const API_URL = `${API_BASE_URL}/api/registros`;

  /**
   * Função de fetch autenticado (COPIADA DE REPARO.JS)
   */
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

  // =================================================================
  // Lógica da Página (Restante do seu código original)
  // =================================================================

  function renderTabela(registros) {
    if (!registros.length) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    let html = '<table class="table"><thead><tr>' +
      '<th>OM</th><th>Cod. Alt</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>Descrição</th><th>Data/Hora</th><th>Operador</th><th>Status do Reparo</th><th>Observações</th>' +
      '</tr></thead><tbody>';
    for (const r of registros) {
      html += `<tr>
        <td data-label="OM">${r.om}</td>
        <td data-label="Cod. Alt">${r.pn || ''}</td>
        <td data-label="Serial">${r.serial || ''}</td>
        <td data-label="Designador">${r.designador || ''}</td>
        <td data-label="Defeito">${r.tipodefeito || r.defeito || ''}</td>
        <td data-label="Descrição">${r.descricao || ''}</td>
        <td data-label="Data/Hora">${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'}</td>
        <td data-label="Operador">${r.operador || ''}</td>
        <td data-label="Status do Reparo">${r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : ''}</td>
        <td data-label="Observações">${r.obs || ''}</td>
      </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  let omSelecionada = '';
  function filtrarRegistros() {
    let regs = [...flatRegistros];
    // Busca (O input de busca não existe no seu HTML, mas deixei a lógica caso adicione)
    const busca = (buscaInput?.value || '').toLowerCase();
    if (busca) {
      regs = regs.filter(r => Object.values(r).some(v => ((v || '').toString().toLowerCase().includes(busca))));
    }
    // Filtro OM
    if (omSelecionada) {
      regs = regs.filter(r => r.om === omSelecionada);
    }
    renderTabela(regs);
  }

  function exportarCSV() {
    let csv = 'OM,Cod. Alt,Serial,Designador,Defeito,Descrição,Data/Hora,Operador,Status do Reparo,Observações\n';
    // Usa 'flatRegistros' para exportar tudo, independente do filtro
    for (const r of flatRegistros) { 
      csv += `${r.om},${r.pn},${r.serial},${r.designador},${r.tipodefeito || r.defeito || ''},${r.descricao},${r.createdat ? new Date(r.createdat).toLocaleString('pt-BR') : '-'},${r.operador},${r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1)) : ''},${r.obs || ''}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio-reparo.csv';
    link.click();
  }

  // O input 'buscaReparo' não está no HTML, o 'if' evita erro
  if (buscaInput) {
    buscaInput.addEventListener('input', filtrarRegistros);
  }
  btnExportarCSV.addEventListener('click', exportarCSV);
  filtroOM.addEventListener('change', () => {
    omSelecionada = filtroOM.value;
    filtrarRegistros();
  });

  // Bloco de 'ensureUser' removido daqui, pois já foi feito no topo.

  // Busca dados
  container.innerHTML = '<div class="note">Carregando dados...</div>';
  try {
    // CORRIGIDO: Usa fetchAutenticado e a API_URL correta
    let rawData = await fetchAutenticado(API_URL);
    let dataArr = Array.isArray(rawData?.data) ? rawData.data : (Array.isArray(rawData) ? rawData : []);
    if (!Array.isArray(dataArr) || dataArr.length === 0) {
      container.innerHTML = '<div class="note">Nenhum registro encontrado.</div>';
      return;
    }
    flatRegistros = dataArr.map(r => ({
      om: r.om,
      qtdlote: r.qtdlote,
      pn: r.pn,
      serial: r.serial,
      designador: r.designador,
      tipodefeito: r.tipodefeito ?? r.tipoDefeito ?? '',
      descricao: r.descricao,
      createdat: r.createdat ?? r.createdAt ?? '',
      operador: r.operador,
      status: r.status,
      obs: r.obs
    }));
    // Preencher opções de OM
    const oms = [...new Set(flatRegistros.map(r => r.om))];
    filtroOM.innerHTML = '<option value="">Filtrar por OM</option>' + oms.map(om => `<option value="${om}">${om}</option>`).join('');
    filtrarRegistros(); // Renderiza a tabela com os dados
  } catch (e) {
    // Agora, se o fetch falhar (ex: token expirado), o fetchAutenticado vai redirecionar
    // Se for outro erro, ele será exibido
    container.innerHTML = `<div class="note">Erro: ${e.message}</div>`;
  }
});