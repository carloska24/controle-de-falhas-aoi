document.addEventListener('DOMContentLoaded', () => {
  // Todo o código agora está aqui dentro para garantir que o HTML esteja pronto.

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // --- Seletores do DOM ---
  const form = $('#formRegistro');
  const btnLimpar = $('#btnLimpar');
  const btnExcluir = $('#btnExcluir');
  const selAll = $('#selAll');
  const busca = $('#busca');
  const tbody = $('#tbody');
  const mTotal = $('#mTotal');
  const mOMs = $('#mOMs');
  const mDistrib = $('#mDistrib');
  
  // Seletores da Qualidade (Gráfico)
  const pie = $('#pieChart');
  const pieCenter = $('#pieCenter');
  const qualTitle = $('#qualTitle');
  const qualEmoji = $('#qualTitle .quality-emoji');
  const qualText = $('#qualText');
  const qualAux = $('#qualAux');
  const qualDetalhe = $('#qualDetalhe');
  const totalInspec = $('#totalInspec');
  const escopoQualidade = $('#escopoQualidade');
  const mostrarTexto = $('#mostrarTexto');

  // --- Configurações da API ---
  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = []; // Cache local dos registros
  let sort = { key: 'createdAt', dir: 'desc' };
  let filterText = '';
  let operatorName = localStorage.getItem('lastOperator') || '';


  // --- Funções da API ---
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

  // --- Funções Auxiliares ---
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escapeHTML(s) { return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }
  function formatDate(d) {
      if (!d) return '';
      const date = new Date(d);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
  
  // --- Lógica do Formulário ---
  function getFormData() {
    const data = Object.fromEntries(new FormData(form).entries());
    // Normalizações leves
    Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string') data[key] = data[key].trim();
    });
    data.qtdLote = data.qtdLote ? Number(data.qtdLote) : null;
    return data;
  }

  function validate(data) {
    const errors = [];
    if (!data.om) errors.push('OM é obrigatória.');
    if (!data.qtdLote || data.qtdLote < 1) errors.push('Qtd de Placas do Lote deve ser >= 1.');
    if (!data.designador) errors.push('Designador é obrigatório.');
    if (!data.tipoDefeito) errors.push('Tipo de Defeito é obrigatório.');
    return errors;
  }
  
  function resetForm() { form.reset(); $('#om').focus(); form.dataset.editing = ''; }

  // --- Renderização e UI ---
  function render() {
    const f = filterText.toLowerCase();
    let rows = registros.filter(r => { 
        const hay = [r.om, r.serial, r.designador, r.tipoDefeito, r.pn, r.descricao, r.obs].filter(Boolean).join(' ').toLowerCase(); 
        return hay.includes(f); 
    });

    rows.sort((a, b) => {
        const { key, dir } = sort;
        let av = (a[key] ?? '').toString().toLowerCase();
        let bv = (b[key] ?? '').toString().toLowerCase();
        if (key === 'createdAt') {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (dateA - dateB) * (dir === 'asc' ? 1 : -1);
        }
        return av.localeCompare(bv) * (dir === 'asc' ? 1 : -1);
    });

    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}" title="Duplo clique para editar">
        <td><input type="checkbox" class="checkbox rowSel" /></td>
        <td>${escapeHTML(r.om)}</td>
        <td>${formatDate(r.createdAt)}</td>
        <td>${escapeHTML(r.serial ?? '')}</td>
        <td>${escapeHTML(r.designador ?? '')}</td>
        <td>${escapeHTML(r.tipoDefeito ?? '')}</td>
        <td>${escapeHTML(r.pn ?? '')}</td>
        <td>${escapeHTML(r.obs ?? '')}</td>
      </tr>
    `).join('');

    updateMetrics(rows);
    updateSelectionState();
    updateQuality();
  }
  
  function updateMetrics(visibleRows) {
    const total = visibleRows.length;
    const oms = new Set(visibleRows.map(r => r.om)).size;
    const byDef = {}; visibleRows.forEach(r => byDef[r.tipoDefeito] = (byDef[r.tipoDefeito] || 0) + 1);
    const top = Object.entries(byDef).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}: ${v}`);
    mTotal.textContent = total; mOMs.textContent = oms; mDistrib.textContent = top.length ? top.join(' • ') : '—';
  }

  function selectedIds() { return $$('.rowSel:checked', tbody).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { 
      const any = selectedIds().length > 0; 
      btnExcluir.disabled = !any;
  }

  // --- LÓGICA DO GRÁFICO (RESTAURADA) ---
  function getRowsForScope() {
    const scope = escopoQualidade.value;
    const ids = selectedIds();
    if (scope === 'selecionados') return registros.filter(r => ids.includes(r.id));
    if (scope === 'visiveis') { 
        const f = filterText.toLowerCase(); 
        return registros.filter(r => { 
            const hay = [r.om, r.serial, r.designador, r.tipoDefeito, r.pn, r.descricao].filter(Boolean).join(' ').toLowerCase(); 
            return hay.includes(f); 
        }); 
    }
    return [...registros];
  }

  function updateQuality() {
    if (!pie) return; // Checagem de segurança
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
    pieCenter.textContent = show==='aproveitamento' ? `${goodPct.toFixed(0)}%` : `${badPct.toFixed(0)}%`;

    const aproveit = goodPct;
    let emoji, rotulo;
    if (aproveit >= 95) { emoji = '😃'; rotulo = 'Excelente'; }
    else if (aproveit >= 85) { emoji = '🙂'; rotulo = 'Muito Bom'; }
    else if (aproveit >= 75) { emoji = '😐'; rotulo = 'Regular'; }
    else { emoji = '😟'; rotulo = 'Ruim'; }
    
    qualEmoji.textContent = emoji;
    qualText.textContent = `${rotulo} (${aproveit.toFixed(1)}% aproveitamento)`;
    qualDetalhe.textContent = `Falhas contadas: ${fails} de ${total} itens inspecionados (${badPct.toFixed(1)}% de falhas).`;
  }

  function drawPie(badPct) {
    const ctx = pie.getContext('2d'); const w = pie.width, h = pie.height; const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 4; ctx.clearRect(0,0,w,h);
    ctx.beginPath(); ctx.fillStyle = '#22c55e'; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.closePath(); ctx.fill();
    const rad = (badPct/100) * Math.PI*2; if (rad > 0.0001) { ctx.beginPath(); ctx.fillStyle = '#e5e7eb'; const start = -Math.PI/2; const end = start + rad; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,end); ctx.closePath(); ctx.fill(); }
    ctx.beginPath(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }

  // --- Event Listeners ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errs = validate(data);
    if (errs.length) {
      alert('Verifique os campos:\n\n- ' + errs.join('\n- '));
      return;
    }

    const isEditing = !!form.dataset.editing;
    const id = form.dataset.editing;
    
    let url = API_URL;
    let method = 'POST';

    if (isEditing) {
      url = `${API_URL}/${id}`;
      method = 'PUT';
    } else {
      data.id = uid();
      data.createdAt = new Date().toISOString();
      data.status = 'Registrado';
      data.operador = operatorName;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Falha ao salvar o registro');
      await carregarRegistros();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Ocorreu um erro ao salvar o registro.');
    }
  });
  
  btnLimpar.addEventListener('click', resetForm);

  btnExcluir.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length || !confirm(`Excluir ${ids.length} registro(s)?`)) return;

    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Falha ao excluir');
      await carregarRegistros();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Ocorreu um erro ao excluir os registros.');
    }
  });

  tbody.addEventListener('dblclick', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    const r = registros.find(x => x.id === id);
    if (!r) return;
    Object.keys(r).forEach(key => {
        const el = form.elements[key];
        if (el) el.value = r[key] ?? '';
    });
    form.dataset.editing = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('#designador').focus();
  });

  busca.addEventListener('input', () => { filterText = busca.value; render(); });
  selAll.addEventListener('change', e => { $$('.rowSel', tbody).forEach(cb => cb.checked = e.target.checked); updateSelectionState(); updateQuality(); });
  tbody.addEventListener('change', e => { if (e.target.classList.contains('rowSel')) { updateSelectionState(); updateQuality(); }});
  [totalInspec, escopoQualidade, mostrarTexto].forEach(el => el.addEventListener('input', updateQuality));

  // --- Inicialização ---
  carregarRegistros();
});