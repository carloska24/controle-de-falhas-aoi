document.addEventListener('DOMContentLoaded', () => {
  // --- Controle de Inspeção OM ---
  let omTimer = null;
  let omStart = null;
  let omPausedAt = null;
  let omTotalPaused = 0;
  let omRunning = false;
  let omDisplay = document.getElementById('omTimerDisplay');
  const omTimerBox = document.getElementById('omTimerBox');
  const omFinalTime = document.getElementById('omFinalTime');

  const btnIniciarOM = document.querySelector('[data-action="start-om"]') || document.getElementById('btnIniciarOM');
  const btnPausarOM = document.querySelector('[data-action="pause-om"]') || document.getElementById('btnPausarOM');
  const btnFinalizarOM = document.querySelector('[data-action="finish-om"]') || document.getElementById('btnFinalizarOM');
  // Diagnóstico: logar se os botões foram encontrados
  if (!btnIniciarOM || !btnPausarOM || !btnFinalizarOM) {
    alert('Erro: Botões OM não encontrados no DOM! Verifique se o script está sendo carregado após o HTML.');
    console.error('[OM] Botões não encontrados:', { btnIniciarOM, btnPausarOM, btnFinalizarOM });
  } else {
    console.log('[OM] Botões encontrados:', { btnIniciarOM, btnPausarOM, btnFinalizarOM });
  }

  // Adiciona display de tempo ao lado dos botões OM
  function ensureOMDisplay() {
    if (omTimerBox) omTimerBox.style.display = '';
    if (omDisplay) omDisplay.style.display = '';
  }

  function formatTimer(ms) {
    if (!ms || ms < 0) ms = 0;
    const totalSec = Math.floor(ms/1000);
    const h = Math.floor(totalSec/3600).toString().padStart(2,'0');
    const m = Math.floor((totalSec%3600)/60).toString().padStart(2,'0');
    const s = (totalSec%60).toString().padStart(2,'0');
    return `${h}:${m}:${s}`;
  }

  function updateOMTimer() {
    if (!omRunning || !omStart) return;
    const now = Date.now();
    const elapsed = now - omStart - omTotalPaused;
    if (omDisplay) omDisplay.textContent = formatTimer(elapsed);
  }

  async function startOM() {
    const omValue = document.getElementById('om').value;
    if (!omValue) {
      showToast('Informe o número da OM antes de iniciar.', 'error');
      return;
    }
    localStorage.setItem('omEmAndamento', omValue);
    try {
      const resp = await fetch(`/api/om/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omNumber: omValue })
      });
      if (!resp.ok) throw new Error((await resp.json()).error || 'Erro ao iniciar OM');
      const data = await resp.json();
      omStart = data.startTime;
      omTotalPaused = data.pausedTime || 0;
      omPausedAt = null;
      omRunning = true;
      ensureOMDisplay();
      if (omDisplay) omDisplay.textContent = '00:00:00';
      if (omFinalTime) omFinalTime.style.display = 'none';
      btnIniciarOM.style.display = 'none';
      btnPausarOM.style.display = '';
      btnFinalizarOM.style.display = '';
      if (btnPausarOM) {
  btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
  try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
        btnPausarOM.setAttribute('title','Pausar Inspeção');
      }
      if (omTimer) clearInterval(omTimer);
      omTimer = setInterval(updateOMTimer, 1000);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function pauseOM() {
    if (!omRunning || omPausedAt) return;
    omPausedAt = Date.now();
    omRunning = false;
      if (btnPausarOM) {
  btnPausarOM.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span class="btn-label">Retomar</span>';
  try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
      btnPausarOM.setAttribute('title','Retomar Inspeção');
    }
    if (omTimer) clearInterval(omTimer);
    const omValue = localStorage.getItem('omEmAndamento') || document.getElementById('om').value;
    if (omValue) {
      await fetch(`/api/om/pause`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omNumber: omValue })
      });
    }
  }

  async function resumeOM() {
    if (!omPausedAt) return;
    omTotalPaused += Date.now() - omPausedAt;
    omPausedAt = null;
    omRunning = true;
      if (btnPausarOM) {
  btnPausarOM.innerHTML = '<i data-lucide="pause" class="w-3.5 h-3.5"></i><span class="btn-label">Pausar</span>';
  try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
      btnPausarOM.setAttribute('title','Pausar Inspeção');
    }
    omTimer = setInterval(updateOMTimer, 1000);
    const omValue = localStorage.getItem('omEmAndamento') || document.getElementById('om').value;
    if (omValue) {
      await fetch(`/api/om/resume`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omNumber: omValue })
      });
    }
  }

  async function finalizarOM() {
    if (omTimer) clearInterval(omTimer);
    let elapsed = 0;
    const omValue = localStorage.getItem('omEmAndamento') || document.getElementById('om').value;
    if (omValue) {
      const resp = await fetch(`/api/om/finalizar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omNumber: omValue })
      });
      if (resp.ok) {
        const data = await resp.json();
        elapsed = data.elapsed || 0;
      }
    }
    if (!elapsed) {
      const now = Date.now();
      elapsed = (omPausedAt ? omPausedAt : now) - omStart - omTotalPaused;
      if (elapsed < 0) elapsed = 0;
    }
    if (omDisplay) omDisplay.textContent = formatTimer(elapsed);
    btnIniciarOM.style.display = '';
    btnPausarOM.style.display = 'none';
    btnFinalizarOM.style.display = 'none';
    omRunning = false;
    omStart = null;
    omPausedAt = null;
    omTotalPaused = 0;
    if (omFinalTime) {
      omFinalTime.textContent = `Tempo total do lote: ${formatTimer(elapsed)}`;
      omFinalTime.style.display = '';
    }
    showToast(`Tempo total de inspeção: ${formatTimer(elapsed)}`,'info');
    localStorage.removeItem('omEmAndamento');
  }
  // Restaurar timer da OM ao carregar a página
  async function restaurarOM() {
    const omValue = localStorage.getItem('omEmAndamento');
    console.log('[OM] [restaurarOM] Valor em localStorage:', omValue);
    if (!omValue) {
      console.warn('[OM] [restaurarOM] Nenhuma OM em andamento encontrada no localStorage.');
      return;
    }
    document.getElementById('om').value = omValue;
    try {
      const resp = await fetch(`/api/om/${encodeURIComponent(omValue)}`);
      console.log('[OM] [restaurarOM] Resposta da API:', resp);
      if (!resp.ok) {
        console.warn('[OM] [restaurarOM] Resposta da API não OK:', resp.status);
        return;
      }
      const data = await resp.json();
      console.log('[OM] [restaurarOM] Dados recebidos:', data);
      omStart = Date.now() - (data.elapsed || 0);
      omTotalPaused = data.pausedTime || 0;
      omRunning = data.status === 'em_andamento';
      if (omRunning) {
        console.log('[OM] [restaurarOM] OM em andamento, restaurando timer.');
        ensureOMDisplay();
        btnIniciarOM.style.display = 'none';
        btnPausarOM.style.display = '';
        btnFinalizarOM.style.display = '';
        if (btnPausarOM) {
          btnPausarOM.innerHTML = '<svg id="icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 5H10V19H6V5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5H18V19H14V5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="btn-label">Pausar</span>';
          btnPausarOM.setAttribute('title','Pausar Inspeção');
        }
        if (omTimer) clearInterval(omTimer);
        omTimer = setInterval(updateOMTimer, 1000);
        updateOMTimer();
      } else if (data.status === 'pausada') {
        console.log('[OM] [restaurarOM] OM pausada, restaurando estado.');
        omRunning = false;
        omPausedAt = Date.now();
        ensureOMDisplay();
        btnIniciarOM.style.display = 'none';
        btnPausarOM.style.display = '';
        btnFinalizarOM.style.display = '';
        if (btnPausarOM) {
          btnPausarOM.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span class="btn-label">Retomar</span>';
          try { if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons(); } catch (e) {}
          btnPausarOM.setAttribute('title','Retomar Inspeção');
        }
        if (omTimer) clearInterval(omTimer);
        omTimer = setInterval(updateOMTimer, 1000);
        updateOMTimer();
      } else if (data.status === 'finalizada') {
        console.log('[OM] [restaurarOM] OM finalizada, exibindo tempo final.');
        omRunning = false;
        omPausedAt = null;
        if (omTimer) clearInterval(omTimer);
        btnIniciarOM.style.display = '';
        btnPausarOM.style.display = 'none';
        btnFinalizarOM.style.display = 'none';
        if (omDisplay) omDisplay.textContent = formatTimer(data.elapsed);
        if (omFinalTime) {
          omFinalTime.textContent = `Tempo total do lote: ${formatTimer(data.elapsed)}`;
          omFinalTime.style.display = '';
        }
      }
    } catch (e) {
      console.error('[OM] [restaurarOM] Erro ao restaurar OM:', e);
    }
  }

  if (btnIniciarOM) btnIniciarOM.addEventListener('click', () => {
    console.log('[OM] Clique em Iniciar OM');
    startOM();
  });
  if (btnPausarOM) btnPausarOM.addEventListener('click', () => {
    if (omRunning && !omPausedAt) pauseOM();
    else resumeOM();
  });
  if (btnFinalizarOM) btnFinalizarOM.addEventListener('click', () => {
    finalizarOM();
  });
  // Restaurar timer ao carregar
  setTimeout(restaurarOM, 0);
  const { jsPDF } = window.jspdf;
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Lógica de Controle de Acesso: mostra elementos apenas para admins
  const isAdmin = !!(user && user.role === 'admin');
  if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('admin-only'));
  } else {
    // Esconde botões/áreas de admin, incluindo botão de demo
    const btnDemo = document.querySelector('#btnDemo');
    if (btnDemo) btnDemo.style.display = 'none';
  }

  // Detecta se estamos em ambiente local ou de produção para definir a URL da API
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  const API_BASE_URL = window.API_BASE_URL || (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : ('http://' + window.location.hostname + ':3001'));
  const API_URL = `${API_BASE_URL}/api/registros`;
  let registros = [];
  let sortState = { key: 'createdat', dir: 'desc' }; // padrão: mais recentes primeiro
  let searchTimer;
  
  const form = document.querySelector('#formRegistro');
  const btnGravar = form.querySelector('button[type="submit"]');
  const btnLimpar = document.querySelector('[data-action="clear"]') || document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('[data-action="exclude"]') || document.querySelector('#btnExcluir');
  const btnDemo = document.querySelector('[data-action="add-demo"]') || document.querySelector('#btnDemo');
  const btnGerarRequisicao = document.querySelector('[data-action="generate-request"]') || document.querySelector('#btnGerarRequisicao');
  const btnPDF = document.querySelector('[data-action="export-pdf"]') || document.querySelector('#btnPDF');
  const btnReqCSV = document.querySelector('[data-action="export-req-csv"]') || document.querySelector('#btnReqCSV');
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
  const qualEmoji = document.querySelector('.quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('.quality-aux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const loadingOverlay = document.querySelector('#loadingOverlay');
  const toastContainer = document.querySelector('#toastContainer');

  if (userDisplay && user) { userDisplay.textContent = user.name || user.username; }
  if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
          if (user && user.role === 'admin') {
              try {
          // Usa o endpoint unificado no backend para limpar DEMOs e efetivar logout admin
          await fetchAutenticado(`${API_BASE_URL}/api/admin/logout`, { method: 'POST' });
                  showToast('Dados de demonstração foram limpos.', 'info');
              } catch (error) { console.error('Falha ao limpar dados de demo:', error); }
          }
          localStorage.clear(); sessionStorage.clear();
          window.location.href = 'login.html';
      });
  }

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
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      if (response.status === 204 || response.headers.get("content-length") === "0") return null;
      return response.json();
  }

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }
  // Adiciona a animação de saída ao CSS dinamicamente
  document.head.insertAdjacentHTML('beforeend', '<style>@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }</style>');

  function setLoading(isLoading) {
    if (loadingOverlay) {
      loadingOverlay.classList.toggle('hidden', !isLoading);
    }
  }

  async function carregarRegistros() {
    setLoading(true);
    try {
      registros = await fetchAutenticado(API_URL) || [];
      console.log('[DEBUG] Registros recebidos do backend:', registros);
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
      showToast(`Falha ao carregar registros: ${error.message}`, 'error');
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444;">Erro ao carregar dados.</td></tr>`;
    } finally {
      setLoading(false);
    }
  }

  function getFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => { data[key.toLowerCase()] = value.trim(); });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }

  function render() {
      const f = (busca?.value || '').toLowerCase();
      let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));

      // Ordenação
      const key = sortState.key;
      const dir = sortState.dir === 'asc' ? 1 : -1;
      rowsToRender.sort((a,b) => {
        let va = a[key] ?? '';
        let vb = b[key] ?? '';
        if (key === 'createdat') { va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime(); }
        else { va = va.toString().toLowerCase(); vb = vb.toString().toLowerCase(); }
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });

      if (rowsToRender.length === 0) {
        tbody.innerHTML = '';
        const empty = document.getElementById('emptyState');
        if (empty) empty.style.display = 'block';
      } else {
        const empty = document.getElementById('emptyState');
        if (empty) empty.style.display = 'none';
        tbody.innerHTML = rowsToRender.map(r => `
          <tr data-id="${r.id}">
            <td data-label="Selecionar"><input type="checkbox" class="checkbox rowSel" /></td>
            <td data-label="OM">${escapeHTML(r.om ?? '')}</td>
            <td data-label="Cod. Alt">${escapeHTML(r.pn ?? '')}</td>
            <td data-label="Serial">${escapeHTML(r.serial ?? '')}</td>
            <td data-label="Designador">${escapeHTML(r.designador ?? '')}</td>
            <td data-label="Defeito">${escapeHTML(r.tipodefeito ?? '')}</td>
            <td data-label="Descrição">${escapeHTML(r.descricao ?? '')}</td>
            <td data-label="Data/Hora">${formatDate(r.createdat)}</td>
          </tr>
        `).join('');
      }
      updateSelectionState();
      updateQuality();
      // Filtro aplicado: usa rowsToRender para métricas
      if (typeof mTotal !== 'undefined' && mTotal) {
        mTotal.textContent = rowsToRender.length;
      }
      if (typeof mOMs !== 'undefined' && mOMs) {
        const omSet = new Set(rowsToRender.map(r => r.om));
        mOMs.textContent = omSet.size;
      }
      // Top 3 defeitos
      if (typeof mDistrib !== 'undefined' && mDistrib) {
        if (rowsToRender.length === 0) {
          mDistrib.textContent = '—';
        } else {
          const counts = {};
          rowsToRender.forEach(r => {
            if (!r.tipodefeito) return;
            counts[r.tipodefeito] = (counts[r.tipodefeito] || 0) + 1;
          });
          const top = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([defeito, qtd]) => `${defeito} (${qtd})`)
            .join(', ');
          mDistrib.textContent = top || '—';
        }
      }
  }

      if (tbody) tbody.addEventListener('change', (e) => { 
        if (e.target.classList.contains('rowSel')) { 
          updateSelectionState();
          if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
        }
      });
      if (selAll) selAll.addEventListener('change', () => {
          const isChecked = selAll.checked;
          document.querySelectorAll('.rowSel').forEach(checkbox => { checkbox.checked = isChecked; });
          updateSelectionState();
          if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
      });
      if (btnReqCSV) {
        btnReqCSV.addEventListener('click', () => {
          const idsSelecionados = selectedIds();
          if (idsSelecionados.length === 0) {
            showToast('Selecione os registros para exportar.', 'info');
            return;
          }
          const dadosParaExportar = registros.filter(r => idsSelecionados.includes(r.id));
          const header = ['OM', 'Data', 'Serial', 'Designador', 'Defeito', 'PN', 'Descricao', 'Observacoes'];
          let csvContent = header.join(',') + '\n';
          dadosParaExportar.forEach(r => {
            const row = [r.om, formatDate(r.createdat), r.serial || '', r.designador, r.tipodefeito, r.pn || '', r.descricao || '', (r.obs || '').replace(/,/g, ';')];
            csvContent += row.join(',') + '\n';
          });
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `relatorio_reparo_${new Date().toLocaleDateString('pt-BR')}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }

      // Removido: não existe botão PDF no sistema
  
  function getRowsForScope() {
    const scope = escopoQualidade.value;
    if (scope === 'selecionados') {
        const ids = selectedIds();
        return registros.filter(r => ids.includes(r.id));
    }
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes((busca?.value || '').toLowerCase()));
  }

  function updateQuality() {
      if (!pie) return;
      const total = Number(totalInspec.value || 0);
      const fails = getRowsForScope().length;
      if (total === 0) {
          const ctx = pie.getContext('2d');
          ctx.clearRect(0,0,pie.width,pie.height);
          if(qualEmoji) qualEmoji.textContent = '😐';
          if(qualText) qualText.textContent = 'Qualidade Indefinida';
          if(pieCenter) pieCenter.textContent = '—';
          if(qualAux) qualAux.innerHTML = 'Informe o <b>Total Inspecionado</b> para calcular.';
          if(qualDetalhe) qualDetalhe.textContent = '—';
          return;
      }
      const badPct = Math.min(100, Math.max(0, (fails / total) * 100));
      const goodPct = 100 - badPct;
      drawPie(goodPct);
      
      let emoji, rotulo, centerColor;
      if (goodPct >= 95) { emoji = '😃'; rotulo = 'Excelente'; }
      else if (goodPct >= 85) { emoji = '🙂'; rotulo = 'Muito Bom'; }
      else if (goodPct >= 75) { emoji = '😐'; rotulo = 'Regular'; }
      else { emoji = '😟'; rotulo = 'Ruim'; centerColor = 'var(--danger)'; }

      if (pieCenter) {
        pieCenter.textContent = `${goodPct.toFixed(0)}%`;
        pieCenter.style.color = centerColor || 'var(--text)';
      }
      if(qualEmoji) qualEmoji.textContent = emoji;
      if(qualText) qualText.textContent = `${rotulo} (${goodPct.toFixed(1)}% aproveitamento)`;
      if(qualDetalhe) qualDetalhe.textContent = `Falhas contadas: ${fails} de ${total} itens inspecionados (${badPct.toFixed(1)}% de falhas).`;
  }

  function drawPie(goodPct) {
      const canvas = pie;
      const ctx = canvas.getContext('2d');
      const R = canvas.width / 2;
      const startAngle = -0.5 * Math.PI; // Começa no topo
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // 1. Desenha o arco de falha (fundo neutro)
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, startAngle, startAngle + 2 * Math.PI);
      ctx.fillStyle = '#334155'; // var(--muted)
      ctx.fill();
  
      // 2. Desenha o arco de sucesso (verde) por cima
      const goodAngle = (goodPct / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, startAngle, startAngle + goodAngle);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  function escapeHTML(s) { return s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }

  function resetForm() {
    const om = form.om.value;
    const qtdlote = form.qtdlote.value;
    form.reset();
    form.dataset.editing = '';
    btnGravar.querySelector('.btn-text').textContent = 'Gravar';
    form.om.value = om; 
    form.qtdlote.value = qtdlote;
    form.designador.focus();
  }
  
  function updateSelectionState() {
    const checkedCount = selectedIds().length;
    btnExcluir.disabled = checkedCount === 0;
    btnGerarRequisicao.disabled = checkedCount === 0;
    const totalCheckboxes = document.querySelectorAll('.rowSel').length;
    if (totalCheckboxes > 0 && checkedCount === totalCheckboxes) {
        selAll.checked = true;
        selAll.indeterminate = false;
    } else if (checkedCount > 0) {
        selAll.checked = false;
        selAll.indeterminate = true;
    } else {
        selAll.checked = false;
        selAll.indeterminate = false;
    }
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingId = form.dataset.editing;
    const data = getFormData();
    if (!data.om || !data.qtdlote || !data.designador || !data.tipodefeito) {
        showToast('Por favor, preencha todos os campos obrigatórios (*).', 'error');
        return;
    }
    try {
    if (editingId) {
      const updateData = { om: data.om, qtdlote: data.qtdlote, serial: data.serial, designador: data.designador, tipodefeito: data.tipodefeito, pn: data.pn, descricao: data.descricao, obs: data.obs };
      await fetchAutenticado(`${API_URL}/${editingId}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const index = registros.findIndex(r => r.id === editingId);
      if (index !== -1) { registros[index] = { ...registros[index], ...updateData }; }
      showToast('Registro atualizado com sucesso!');
      resetForm();
      render();
    } else {
      data.id = uid();
      data.createdat = new Date().toISOString();
      data.status = 'aberto';
      data.operador = user.name || user.username;
      await fetchAutenticado(API_URL, { method: 'POST', body: JSON.stringify(data) });
      showToast('Registro gravado com sucesso!');
      resetForm();
      await carregarRegistros();
    }
    } catch (error) {
        showToast(`Erro ao salvar o registro: ${error.message}`, 'error');
    }
  });

  btnExcluir.addEventListener('click', async () => {
    const idsParaExcluir = selectedIds();
    if (idsParaExcluir.length === 0) return;
    const conf = confirm(`Excluir ${idsParaExcluir.length} registro(s)? Esta ação não pode ser desfeita.`);
    if (!conf) return;
    try {
        await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids: idsParaExcluir }) });
        registros = registros.filter(r => !idsParaExcluir.includes(r.id));
        showToast(`${idsParaExcluir.length} registro(s) excluído(s).`);
        render();
    } catch (error) {
        showToast(`Erro ao excluir registros: ${error.message}`, 'error');
    }
  });

  btnGerarRequisicao.addEventListener('click', async () => {
    const todosIdsSelecionados = selectedIds();
    if (todosIdsSelecionados.length === 0) return;

    const defeitosPermitidos = ['Componente Ausente', 'Componente Danificado', 'Componente Incorreto'];
    const registrosSelecionados = registros.filter(r => todosIdsSelecionados.includes(r.id));
    const registrosValidos = registrosSelecionados.filter(r => defeitosPermitidos.includes(r.tipodefeito));

    if (registrosValidos.length === 0) {
        showToast('Nenhum dos itens selecionados é elegível para requisição (Componente Ausente, Danificado ou Incorreto).', 'info');
        return;
    }

    try {
        setLoading(true);
        const response = await fetchAutenticado(`${API_BASE_URL}/api/requisicoes`, {
            method: 'POST',
            body: JSON.stringify({ registroIds: registrosValidos.map(r => r.id) })
        });
        showToast(`${response.requisicaoIds.length} requisição(ões) gerada(s) com sucesso!`, 'success');
    } catch (error) { showToast(`Erro ao gerar requisição: ${error.message}`, 'error'); } finally { setLoading(false); }
  });

  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    const registroParaEditar = registros.find(r => r.id === id);
    if (registroParaEditar) {
        form.om.value = registroParaEditar.om || '';
        form.qtdlote.value = registroParaEditar.qtdlote || '';
        form.serial.value = registroParaEditar.serial || '';
        form.designador.value = registroParaEditar.designador || '';
        form.tipodefeito.value = registroParaEditar.tipodefeito || '';
        form.pn.value = registroParaEditar.pn || '';
        form.descricao.value = registroParaEditar.descricao || '';
        form.obs.value = registroParaEditar.obs || '';
        form.dataset.editing = id;
        btnGravar.querySelector('.btn-text').textContent = 'Atualizar';
        window.scrollTo(0, 0);
        form.designador.focus();
    }
  });

  if (btnDemo) btnDemo.addEventListener('click', async () => {
    if (!isAdmin) { showToast('Apenas administradores podem lançar dados de demonstração.', 'error'); return; }
    const allDefectTypes = [
        'Curto-circuito', 'Solda Fria', 'Excesso de Solda', 'Insuficiência de Solda', 'Tombstone', 'Bilboard', 'Solder Ball',
        'Componente Ausente', 'Componente Danificado', 'Componente Deslocado', 'Componente Incorreto', 'Componente Invertido', 'Polaridade Incorreta'
    ];

    setLoading(true);
    try {
        const demoRecords = [];
        for (let i = 0; i < 15; i++) {
            const demoDate = new Date();
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            demoDate.setDate(demoDate.getDate() - daysAgo);

            demoRecords.push({
                id: uid(),
                om: `DEMO-OM-${Math.floor(Math.random() * 3) + 1}`,
                qtdlote: 150,
                serial: `SN-DEMO-${Date.now() + i}`,
                designador: `C${Math.floor(Math.random() * 500)}`,
                tipodefeito: allDefectTypes[Math.floor(Math.random() * allDefectTypes.length)],
                pn: `200-0${Math.floor(Math.random() * 900) + 100}`,
                descricao: 'Componente de Demonstração',
                createdat: demoDate.toISOString(),
                status: 'aberto',
                operador: user.name || user.username,
            });
        }
        const newRecords = await fetchAutenticado(`${API_URL}/batch`, { method: 'POST', body: JSON.stringify(demoRecords) });
        registros.unshift(...newRecords);
        render();
        showToast(`15 novos registros de demonstração foram salvos no banco de dados.`, 'info');
    } catch (error) {
        showToast(`Erro ao criar dados de demonstração: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
  });
  
  [totalInspec, escopoQualidade].forEach(el => { if(el) el.addEventListener('input', updateQuality); });
  
  // Busca com debounce
  if (busca) {
    busca.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    });
  }

  // Ordenação por cabeçalho
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.key = key;
        sortState.dir = key === 'createdat' ? 'desc' : 'asc';
      }
      render();
    });
  });

  if (tbody) {
    tbody.addEventListener('change', (e) => { 
      if (e.target.classList.contains('rowSel')) { 
        updateSelectionState();
        if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
      }
    });
  }
  if (selAll) {
    selAll.addEventListener('change', () => {
      const isChecked = selAll.checked;
      document.querySelectorAll('.rowSel').forEach(checkbox => { checkbox.checked = isChecked; });
      updateSelectionState();
      if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
    });
  }

  if (btnReqCSV) {
    btnReqCSV.addEventListener('click', () => {
      const idsSelecionados = selectedIds();
      if (idsSelecionados.length === 0) {
        showToast('Selecione os registros para exportar.', 'info');
        return;
      }
      const dadosParaExportar = registros.filter(r => idsSelecionados.includes(r.id));
      const header = ['OM', 'Data', 'Serial', 'Designador', 'Defeito', 'PN', 'Descricao', 'Observacoes'];
      let csvContent = header.join(',') + '\n';
      dadosParaExportar.forEach(r => {
        const row = [r.om, formatDate(r.createdat), r.serial || '', r.designador, r.tipodefeito, r.pn || '', r.descricao || '', (r.obs || '').replace(/,/g, ';')];
        csvContent += row.join(',') + '\n';
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_reparo_${new Date().toLocaleDateString('pt-BR')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  if (btnPDF) {
    btnPDF.addEventListener('click', () => {
      const idsSelecionados = selectedIds();
      if (idsSelecionados.length === 0) {
        showToast('Selecione os registros para exportar.', 'info');
        return;
      }
      const dadosParaExportar = registros.filter(r => idsSelecionados.includes(r.id));
      const doc = new jsPDF();
      doc.text('Relatório de Falhas para Reparo', 14, 16);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);
      const head = [['OM', 'Data', 'Serial', 'Designador', 'Defeito', 'Obs']];
      const body = dadosParaExportar.map(r => [r.om, formatDate(r.createdat), r.serial || '-', r.designador, r.tipodefeito, r.obs || '-']);
      doc.autoTable({ startY: 30, head: head, body: body, theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, });
      doc.save(`relatorio_reparo_${new Date().toLocaleDateString('pt-BR')}.pdf`);
    });
  }

  if (typeof carregarRegistros === 'function') carregarRegistros();
});