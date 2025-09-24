document.addEventListener('DOMContentLoaded', () => {

  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  let sort = { key: 'createdat', dir: 'desc' };
  let filterText = '';
  let operatorName = localStorage.getItem('lastOperator') || 'Operador';

  const form = document.querySelector('#formRegistro');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
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

  async function carregarRegistros() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Erro ao buscar dados do servidor');
      registros = await response.json();
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
      alert('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
  }

  function getFormData() {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key.toLowerCase()] = typeof value === 'string' ? value.trim() : value;
    }
    if (data.qtdlote) {
        data.qtdlote = Number(data.qtdlote);
    } else {
        data.qtdlote = null;
    }
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
        const { key, dir } = sort;
        let av = a[key] ?? '';
        let bv = b[key] ?? '';
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
  
  // =================================================================
  // LÓGICA DO GRÁFICO (RESTAURADA CORRETAMENTE)
  // =================================================================
  function updateQuality() {
    if (!pie) return;
    const total = Number(totalInspec.value || 0);
    const fails = getRowsForScope().length;
    
    if (total === 0) {
      const ctx = pie.getContext('2d');
      ctx.clearRect(0,0,pie.width,pie.height);
      qualEmoji.textContent = '😐';
      qualText.textContent = 'Qualidade Indefinida';
      pieCenter.textContent = '—';
      qualAux.innerHTML = 'Informe o <b>Total Inspecionado</b> para calcular.';
      qualDetalhe.textContent = '—';
      return;
    }

    const badPct = Math.min(100, Math.max(0, (fails / total) * 100));
    const goodPct = 100 - badPct;

    drawPie(badPct);
    const show = mostrarTexto.value;
    pieCenter.textContent = show === 'aproveitamento' ? `${goodPct.toFixed(0)}%` : `${badPct.toFixed(0)}%`;

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
  // =================================================================

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
    const f = filterText.toLowerCase();
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
  }
  
  form.addEventListener('submit', async (e) => { /* ...código do submit... */ }); // Código omitido por brevidade, use a versão anterior.
  // ... todos os outros event listeners devem ser mantidos como na versão anterior.

  // Para garantir, aqui está o código completo dos listeners e inicialização.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = get