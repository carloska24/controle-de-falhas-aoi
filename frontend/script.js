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

  // Detecta se estamos em ambiente local ou de produção para definir a URL da API
  const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
  const API_URL = `${API_BASE_URL}/api/registros`;
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
  const qualEmoji = document.querySelector('.quality-emoji');
  const qualText = document.querySelector('#qualText');
  const qualAux = document.querySelector('#qualAux');
  const qualDetalhe = document.querySelector('#qualDetalhe');
  const totalInspec = document.querySelector('#totalInspec');
  const escopoQualidade = document.querySelector('#escopoQualidade');
  const mostrarTexto = document.querySelector('#mostrarTexto');
  const userEmailDisplay = document.querySelector('#userEmailDisplay');
  const btnLogout = document.querySelector('#btnLogout');

  // Lógica do Cabeçalho
  if (userEmailDisplay && user) { userEmailDisplay.textContent = user.email; }
  if (btnLogout) {
      btnLogout.addEventListener('click', () => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = 'login.html';
      });
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
    const f = busca.value.toLowerCase();
    let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
    rowsToRender.sort((a, b) => {
        const key = sort.key; const dir = sort.dir;
        let av = a[key] ?? ''; let bv = b[key] ?? '';
        if (key === 'createdat') {
            return (new Date(a.createdat).getTime() - new Date(b.createdat).getTime()) * (dir === 'asc' ? 1 : -1);
        }
        return av.toString().localeCompare(bv.toString()) * (dir === 'asc' ? 1 : -1);
    });
    tbody.innerHTML = rowsToRender.map(r => `
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
    updateMetrics(registros);
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
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; }
  
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { btnExcluir.disabled = selectedIds().length === 0; }

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

  function abrirRelatorioReparo(rows) {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Componentes p/ Reparo</title><style>body{font:12px Arial,sans-serif}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #000;padding:6px 8px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>Componentes para Reparo</h1><div>Gerado em: ${new Date().toLocaleString()}</div><table><thead><tr><th>OM</th><th>Serial</th><th>Designador</th><th>Defeito</th><th>PN</th><th>Obs.</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHTML(r.om)}</td><td>${escapeHTML(r.serial??'')}</td><td>${escapeHTML(r.designador??'')}</td><td>${escapeHTML(r.tipodefeito??'')}</td><td>${escapeHTML(r.pn??'')}</td><td>${escapeHTML(r.obs??'')}</td></tr>`).join('')}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),200);<\/script></body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  }

  function agruparParaRequisicao(rows) {
    const map = new Map();
    for (const r of rows) {
      if (r.tipodefeito !== 'Componente Ausente') continue;
      const key = (r.pn && r.pn.trim()) || `Designador ${r.designador}`;
      const entry = map.get(key) || { PN: r.pn || '', Descricao: r.descricao || '', Unidade:'pc', Qtd:0, OMs:new Set(), Designadores:new Set() };
      entry.Qtd += 1;
      if (r.om) entry.OMs.add(r.om);
      if (r.designador) entry.Designadores.add(r.designador);
      map.set(key, entry);
    }
    return Array.from(map.values()).map(e => ({...e, OMs: Array.from(e.OMs).sort().join(', '), Designadores: Array.from(e.Designadores).sort().join(', ')})).sort((a,b)=> (a.PN||a.Descricao).localeCompare(b.PN||b.Descricao));
  }
  
  function abrirRequisicaoPDF(rows) {
    const agg = agruparParaRequisicao(rows);
    if (!agg.length) return alert('Não há "Componentes Ausentes" no escopo selecionado para gerar a requisição.');
    const totalItens = agg.length;
    const totalQtd = agg.reduce((s,x)=>s+x.Qtd,0);
    const oms = new Set(); rows.forEach(r=>r.om && oms.add(r.om));
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Requisição de Materiais</title><style>@page{size:A4 portrait;margin:16mm 14mm}body{font:11px Arial,sans-serif}h1{font-size:18px;margin:0}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:4mm}.meta{margin:4mm 0;display:grid;grid-template-columns:1fr 1fr;gap:4mm}.box{border:1px solid #000;padding:6px 8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:5px 6px;text-align:left;vertical-align:top}th{background:#eee}.center{text-align:center}.right{text-align:right}.signs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8mm;margin-top:10mm}.sign{border-top:1px solid #000;padding-top:2mm;text-align:center}</style></head><body><div class="header"><div><h1>REQUISIÇÃO DE MATERIAIS</h1><div>${NOME_EMPRESA} · ${new Date().toLocaleString()}</div></div><div><span>Para:</span><br/>Almoxarifado</div></div><div class="meta"><div class="box"><b>Solicitante:</b> _________________________<br/><b>Setor:</b> ${SETOR_PADRAO}<br/><b>OM(s):</b> ${Array.from(oms).sort().join(', ')||'—'}</div><div class="box"><b>Itens distintos:</b> ${totalItens}<br/><b>Qtd total solicitada:</b> ${totalQtd} peças<br/><b>Observações:</b> _________________________</div></div><table><thead><tr><th style="width:20px" class="center">#</th><th style="width:120px">PN</th><th>Descrição</th><th style="width:30px" class="center">Unid.</th><th style="width:40px" class="right">Qtd</th><th>Designadores</th></tr></thead><tbody>${agg.map((it,idx)=>`<tr><td class="center">${idx+1}</td><td>${escapeHTML(it.PN||'—')}</td><td>${escapeHTML(it.Descricao||'')}</td><td class="center">${it.Unidade}</td><td class="right">${it.Qtd}</td><td>${escapeHTML(it.Designadores)}</td></tr>`).join('')}</tbody></table><div class="signs"><div class="sign">Solicitante</div><div class="sign">Conferente</div><div class="sign">Almoxarifado / Entrega</div></div><script>window.onload=()=>setTimeout(()=>window.print(),200);<\/script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errs = validate(data);
    if (errs.length) return alert('Verifique os campos:\n- ' + errs.join('\n- '));
    try {
      let method = 'POST', url = API_URL;
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
    const demoData = [ {om:'OM-2025-DEMO1', qtdlote:50, serial:'SN-DEMO1', designador:'R15', tipodefeito:'Componente Ausente', pn:'RC0603FR-0710KL', obs:'Lado TOP'}, {om:'OM-2025-DEMO2', qtdlote:30, serial:'SN-DEMO3', designador:'U1', tipodefeito:'Componente Errado', pn:'ATMEGA328P-AU', obs:'Apenas exemplo'}, {om:'OM-2025-DEMO3', qtdlote:80, serial:'SN-DEMO5', designador:'C7', tipodefeito:'Solda Fria', pn:'CL10B104KB8NNNC', obs:'Reinspeção'} ];
    try {
      btnDemo.disabled = true; btnDemo.textContent = 'Gravando...';
      for(const item of demoData) {
        const fullItem = { ...item, id: uid(), createdat: new Date().toISOString(), status: 'Registrado', operador: user.email };
        await fetchAutenticado(API_URL, { method: 'POST', body: JSON.stringify(fullItem) });
      }
      await carregarRegistros();
    } catch (error) {
      alert(`Falha ao adicionar dados de exemplo: ${error.message}`);
    } finally {
      btnDemo.disabled = false;
      btnDemo.textContent = '⚙️ Modo Demo';
    }
  });

  btnBackup.addEventListener('click', () => {
    const rows = getRowsForScope();
    if (!rows.length) return alert('Não há dados para fazer backup.');
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, `backup_aoi_${dateStamp()}.json`, 'application/json;charset=utf-8;');
  });
  
  btnPDF.addEventListener('click', () => abrirRelatorioReparo(getRowsForScope()));
  btnReqPDF.addEventListener('click', () => abrirRequisicaoPDF(getRowsForScope()));
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

  busca.addEventListener('input', render);
  
  selAll.addEventListener('change', (e) => { 
    tbody.querySelectorAll('.rowSel').forEach(cb => cb.checked = e.target.checked);
    updateSelectionState(); 
  });

  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState(); 
    }
  });

  [totalInspec, escopoQualidade, mostrarTexto].forEach(el => el?.addEventListener('input', updateQuality));
  
  carregarRegistros();
});