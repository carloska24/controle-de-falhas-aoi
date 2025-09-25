document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // BLOCO DE SEGURANÇA E CONFIGURAÇÕES GLOBAIS
  // =================================================================
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  let sort = { key: 'createdat', dir: 'desc' };
  let filterText = '';
  const NOME_EMPRESA = 'CADSERVICE';
  const SETOR_PADRAO = 'Qualidade / Manufatura';

  // =================================================================
  // SELETORES DO DOM
  // =================================================================
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
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  const mDistrib = document.querySelector('#mDistrib');
  const pie = document.querySelector('#pieChart');
  const pieCenter = document.querySelector('#pieCenter');
  const qualTitle = document.querySelector('#qualTitle');
  const qualEmoji = document.querySelector('#qualTitle .quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('#qualAux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const mostrarTexto = document.querySelector('#mostrarTexto');

  // Adiciona dinamicamente a informação do usuário e o botão de Sair
  const rightToolbar = document.querySelector('.card.noprint .toolbar .right');
  if (rightToolbar && user) {
    const userDisplay = document.createElement('span');
    userDisplay.style.marginRight = '10px';
    userDisplay.textContent = `Logado: ${user.email}`;
    
    const btnLogout = document.createElement('button');
    btnLogout.id = 'btnLogout';
    btnLogout.className = 'btn outline';
    btnLogout.textContent = 'Sair';
    
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
    
    rightToolbar.prepend(btnLogout);
    rightToolbar.prepend(userDisplay);
  }

  // =================================================================
  // FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
  // =================================================================
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

  // =================================================================
  // FUNÇÕES DA APLICAÇÃO
  // =================================================================
  async function carregarRegistros() {
    try {
      registros = await fetchAutenticado(API_URL) || [];
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
    }
  }

  function getFormData() {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key.toLowerCase()] = typeof value === 'string' ? value.trim() : value;
    }
    if (data.qtdlote) data.qtdlote = Number(data.qtdlote);
    return data;
  }

  function validate(data) {
    const errors = [];
    if (!data.om) errors.push('OM é obrigatória.');
    if (!data.qtdlote || data.qtdlote < 1) errors.push('Qtd de Placas do Lote deve ser >= 1.');
    if (!data.designador) errors.push('Designador é obrigatório.');
    if (!data.tipodefeito) errors.push('Tipo de Defeito é obrigatório.');
    return errors;
  }
  
  function render() {
    const f = filterText.toLowerCase();
    let rows = registros.filter(r => 
        Object.values(r).join(' ').toLowerCase().includes(f)
    );
    rows.sort((a, b) => {
        const key = sort.key; const dir = sort.dir;
        let av = a[key] ?? ''; let bv = b[key] ?? '';
        if (key === 'createdat') {
            return (new Date(a.createdat).getTime() - new Date(b.createdat).getTime()) * (dir === 'asc' ? 1 : -1);
        }
        return av.toString().localeCompare(bv.toString()) * (dir === 'asc' ? 1 : -1);
    });
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}" title="Duplo clique para editar">
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
    updateMetrics(rows);
    updateSelectionState();
    updateQuality();
  }
  
  function updateMetrics(visibleRows) {
    mTotal.textContent = visibleRows.length;
    mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
    const byDef = visibleRows.reduce((acc, r) => {
        acc[r.tipodefeito] = (acc[r.tipodefeito] || 0) + 1;
        return acc;
    }, {});
    const top = Object.entries(byDef).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}: ${v}`);
    mDistrib.textContent = top.length ? top.join(' • ') : '—';
  }

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

  function drawPie(badPct) {
    const ctx = pie.getContext('2d'); const w = pie.width, h = pie.height, cx = w/2, cy = h/2, r = Math.min(w,h)/2-4;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath(); ctx.fillStyle = '#22c55e'; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    const rad = (badPct/100) * Math.PI*2;
    if (rad > 0.001) { ctx.beginPath(); ctx.fillStyle = '#e5e7eb'; const s = -Math.PI/2; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,s+rad); ctx.fill(); }
    ctx.beginPath(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }
  
  function resetForm() { form.reset(); form.dataset.editing = ''; document.querySelector('#om').focus(); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escapeHTML(s) { return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  
  function selectedIds() { 
    return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); 
  }
  
  function updateSelectionState() { 
    btnExcluir.disabled = selectedIds().length === 0; 
  }

  function getRowsForScope() {
    const scope = escopoQualidade.value;
    if (scope === 'selecionados') return registros.filter(r => selectedIds().includes(r.id));
    const f = busca.value.toLowerCase();
    if (!f) return [...registros];
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
  }
  
  function toCSV(arr, headers) { const sep = ','; const esc = v => { const s = (v ?? '').toString(); return /[,"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }; const head = headers.join(sep); const lines = arr.map(o => headers.map(h => esc(o[h])).join(sep)); return [head, ...lines].join('\n'); }
  function downloadFile(content, filename, mime) { const blob = new Blob([content], {type:mime}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 500); }
  function dateStamp() { const d = new Date(); const pad = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

  function abrirRelatorioReparo(rows) { /* ...código da função... */ }
  function agruparParaRequisicao(rows) { /* ...código da função... */ }
  function abrirRequisicaoPDF(rows) { /* ...código da função... */ }
  
  // =================================================================
  // EVENT LISTENERS
  // =================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errs = validate(data);
    if (errs.length) return alert('Verifique os campos:\n- ' + errs.join('\n- '));
    try {
      let method = 'POST';
      let url = API_URL;
      if (form.dataset.editing) {
        method = 'PUT';
        url = `${API_URL}/${form.dataset.editing}`;
      } else {
        data.id = uid();
        data.createdat = new Date().toISOString();
        data.status = 'Registrado';
        data.operador = user.email;
      }
      await fetchAutenticado(url, { method, body: JSON.stringify(data) });
      await carregarRegistros();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(`Ocorreu um erro ao salvar o registro: ${error.message}`);
    }
  });

  btnLimpar.addEventListener('click', resetForm);

  btnExcluir.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length || !confirm(`Excluir ${ids.length} registro(s)?`)) return;
    try {
      await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids }) });
      await carregarRegistros();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert(`Ocorreu um erro ao excluir os registros: ${error.message}`);
    }
  });

  btnDemo.addEventListener('click', async () => {
    if (!confirm('Adicionar registros de exemplo?')) return;
    // ... (lógica do modo demo)
  });

  btnBackup.addEventListener('click', () => {
    const rows = getRowsForScope();
    if (!rows.length) return alert('Não há dados para fazer backup.');
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, `backup_aoi_${dateStamp()}.json`, 'application/json;charset=utf-8;');
  });

  btnPDF.addEventListener('click', () => {
    abrirRelatorioReparo(getRowsForScope());
  });
  
  btnReqPDF.addEventListener('click', () => {
    abrirRequisicaoPDF(getRowsForScope());
  });

  btnReqCSV.addEventListener('click', () => {
    const rows = getRowsForScope();
    if (!rows.length) return alert('Não há registros para exportar.');
    const headers = ['OM', 'Designador', 'Defeito', 'Status', 'Operador', 'PN'];
    const csvData = rows.map(r => ({'OM': r.om, 'Designador': r.designador, 'Defeito': r.tipodefeito, 'Status': r.status, 'Operador': r.operador, 'PN': r.pn}));
    const csvContent = toCSV(csvData, headers);
    downloadFile(csvContent, `reparo_export_${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
  });

  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const r = registros.find(reg => reg.id === tr.dataset.id);
    if (!r) return;
    for(const key in r) {
        const el = form.elements[key.toLowerCase()];
        if (el) el.value = r[key] ?? '';
    }
    form.dataset.editing = r.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  busca.addEventListener('input', () => { filterText = busca.value; render(); });
  
  selAll.addEventListener('change', (e) => { 
    document.querySelectorAll('.rowSel').forEach(cb => cb.checked = e.target.checked);
    updateSelectionState(); 
  });

  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState(); 
      updateQuality();
    }
  });

  [totalInspec, escopoQualidade, mostrarTexto].forEach(el => el?.addEventListener('input', updateQuality));
  
  // =================================================================
  // INICIALIZAÇÃO
  // =================================================================
  carregarRegistros();
});