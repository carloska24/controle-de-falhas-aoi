document.addEventListener('DOMContentLoaded', () => {

  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  let sort = { key: 'createdat', dir: 'desc' };
  
  const form = document.querySelector('#formRegistro');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const btnReqPDF = document.querySelector('#btnReqPDF');
  const btnReqCSV = document.querySelector('#btnReqCSV');
  const btnPDF = document.querySelector('#btnPDF');
  const btnDemo = document.querySelector('#btnDemo');
  const btnBackup = document.querySelector('#btnBackup');
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  const userDisplay = document.querySelector('#userDisplay');
  const btnLogout = document.querySelector('#btnLogout');
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  const mDistrib = document.querySelector('#mDistrib');
  const pie = document.querySelector('#pieChart');
  const pieCenter = document.querySelector('#pieCenter');
  const qualTitle = document.querySelector('#qualTitle');
  const qualEmoji = document.querySelector('.quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('#qualAux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const mostrarTexto = document.querySelector('#mostrarTexto');

  if (userDisplay && user) { userDisplay.textContent = user.name || user.username; }
  if (btnLogout) {
      btnLogout.addEventListener('click', () => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = 'login.html';
      });
  }

  async function fetchAutenticado(url, options = {}) {
      const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      options.headers = { ...defaultHeaders, ...options.headers };
      const response = await fetch(url, options);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken'); localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Token inválido ou expirado.');
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro de comunicação' }));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      if (response.status === 204 || response.headers.get("content-length") === "0") return null;
      return response.json();
  }

  async function carregarRegistros() {
    try {
      registros = await fetchAutenticado(API_URL) || [];
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
    }
  }

  function getFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => {
        data[key.toLowerCase()] = value.trim();
    });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }
  
  function validate(data) { /* ... */ }
  
  function render() {
      const f = busca.value.toLowerCase();
      let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
      
      // Lógica de ordenação (sort)
      
      tbody.innerHTML = rowsToRender.map(r => `
        <tr data-id="${r.id}">
          <td><input type="checkbox" class="checkbox rowSel" /></td>
          <td>${escapeHTML(r.om)}</td>
          <td>${formatDate(r.createdat)}</td>
          <td>${escapeHTML(r.serial ?? '')}</td>
          <td>${escapeHTML(r.designador ?? '')}</td>
          <td>${escapeHTML(r.tipodefeito ?? '')}</td>
          <td>${escapeHTML(r.pn ?? '')}</td>
          <td>${escapeHTML(r.obs ?? '')}</td>
        </tr>
      `).join('');

      updateMetrics(registros);
      updateSelectionState();
      updateQuality();
  }
  
  function updateMetrics(visibleRows) { /* ... */ }
  
  function updateQuality() {
      if (!pie) return;
      const total = Number(totalInspec.value || 0);
      const fails = getRowsForScope().length;
      if (total === 0) {
          const ctx = pie.getContext('2d');
          ctx.clearRect(0,0,pie.width,pie.height);
          qualEmoji.textContent = '😐'; qualText.textContent = 'Qualidade Indefinida';
          pieCenter.textContent = '—';
          qualAux.innerHTML = 'Informe o <b>Total Inspecionado</b> para calcular.';
          qualDetalhe.textContent = '—';
          return;
      }
      const badPct = Math.min(100, Math.max(0, (fails / total) * 100));
      const goodPct = 100 - badPct;
      drawPie(badPct);
      pieCenter.textContent = mostrarTexto.value === 'aproveitamento' ? `${goodPct.toFixed(0)}%` : `${goodPct.toFixed(0)}%`;
      let emoji, rotulo;
      if (goodPct >= 95) { emoji = '😃'; rotulo = 'Excelente'; }
      else if (goodPct >= 85) { emoji = '🙂'; rotulo = 'Muito Bom'; }
      else if (goodPct >= 75) { emoji = '😐'; rotulo = 'Regular'; }
      else { emoji = '😟'; rotulo = 'Ruim'; }
      qualEmoji.textContent = emoji;
      qualText.textContent = `${rotulo} (${goodPct.toFixed(1)}% aproveitamento)`;
      qualDetalhe.textContent = `Falhas contadas: ${fails} de ${total} itens inspecionados (${badPct.toFixed(1)}% de falhas).`;
  }

  function drawPie(badPct) { /* ... */ }

  function resetForm() { form.reset(); form.dataset.editing = ''; }
  function uid() { return Date.now().toString(36); }
  function escapeHTML(s) { return s ?? ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { btnExcluir.disabled = selectedIds().length === 0; }
  
  function getRowsForScope() {
    const scope = escopoQualidade.value;
    if (scope === 'selecionados') return registros.filter(r => selectedIds().includes(r.id));
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(busca.value.toLowerCase()));
  }

  // (Listeners de todos os botões, como na versão anterior)
  form.addEventListener('submit', async (e) => { /* ... */ });
  btnLimpar.addEventListener('click', resetForm);
  btnExcluir.addEventListener('click', async () => { /* ... */ });
  // etc...
  
  // ===== CORREÇÃO DO GRÁFICO =====
  // Adiciona os event listeners para os controles de qualidade
  [totalInspec, escopoQualidade, mostrarTexto].forEach(el => {
      if(el) el.addEventListener('input', updateQuality);
  });
  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState(); 
      if(escopoQualidade.value === 'selecionados') updateQuality();
    }
  });
  busca.addEventListener('input', render);
  
  carregarRegistros();
});