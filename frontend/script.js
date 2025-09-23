document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // CONFIGURAÇÕES E ESTADO GLOBAL
  // =================================================================
  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  let sort = { key: 'createdAt', dir: 'desc' };
  let filterText = '';
  let operatorName = localStorage.getItem('lastOperator') || 'Operador';

  // =================================================================
  // SELETORES DO DOM
  // =================================================================
  const form = document.querySelector('#formRegistro');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const btnReqPDF = document.querySelector('#btnReqPDF'); // Botão reativado
  const btnReqCSV = document.querySelector('#btnReqCSV'); // Botão reativado
  const btnPDF = document.querySelector('#btnPDF');     // Botão reativado
  const btnDemo = document.querySelector('#btnDemo');   // Botão reativado
  const btnBackup = document.querySelector('#btnBackup'); // Botão reativado
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

  // =================================================================
  // FUNÇÕES DE API (Comunicação com o Backend)
  // =================================================================
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

  async function enviarRegistro(data, method, id = null) {
    let url = id ? `${API_URL}/${id}` : API_URL;
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao salvar o registro');
    return response.json();
  }

  async function excluirRegistros(ids) {
    const response = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Falha ao excluir');
    return response.json();
  }

  // =================================================================
  // FUNÇÕES DE UI (Manipulação da Interface)
  // =================================================================
  function render() {
    const f = filterText.toLowerCase();
    let rows = registros.filter(r => 
        Object.values(r).join(' ').toLowerCase().includes(f)
    );

    rows.sort((a, b) => {
        const { key, dir } = sort;
        let av = a[key] ?? '';
        let bv = b[key] ?? '';
        if (key === 'createdAt') {
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * (dir === 'asc' ? 1 : -1);
        }
        return av.toString().localeCompare(bv.toString()) * (dir === 'asc' ? 1 : -1);
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
    mTotal.textContent = visibleRows.length;
    mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
    const byDef = visibleRows.reduce((acc, r) => {
        acc[r.tipoDefeito] = (acc[r.tipoDefeito] || 0) + 1;
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
    pieCenter.textContent = mostrarTexto.value === 'aproveitamento' ? `${goodPct.toFixed(0)}%` : `${badPct.toFixed(0)}%`;
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
    const ctx = pie.getContext('2d'); const w = pie.width, h = pie.height, cx = w/2, cy = h/2, r = Math.min(w,h)/2-4;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath(); ctx.fillStyle = '#22c55e'; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    const rad = (badPct/100) * Math.PI*2;
    if (rad > 0.001) { ctx.beginPath(); ctx.fillStyle = '#e5e7eb'; const s = -Math.PI/2; ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,s+rad); ctx.fill(); }
    ctx.beginPath(); ctx.strokeStyle = '#0b1220'; ctx.lineWidth = 2; ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }
  
  function resetForm() { form.reset(); form.dataset.editing = ''; document.querySelector('#om').focus(); }

  // =================================================================
  // FUNÇÕES AUXILIARES
  // =================================================================
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function escapeHTML(s) { return (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m])); }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { btnExcluir.disabled = selectedIds().length === 0; }
  function getRowsForScope() {
    const scope = escopoQualidade.value;
    if (scope === 'selecionados') return registros.filter(r => selectedIds().includes(r.id));
    const f = filterText.toLowerCase();
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
  }
  
  // =================================================================
  // EVENT LISTENERS
  // =================================================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    const errs = validate(data);
    if (errs.length) return alert('Verifique os campos:\n- ' + errs.join('\n- '));

    try {
      if (form.dataset.editing) {
        await enviarRegistro(data, 'PUT', form.dataset.editing);
      } else {
        data.id = uid();
        data.createdAt = new Date().toISOString();
        data.status = 'Registrado';
        data.operador = operatorName;
        await enviarRegistro(data, 'POST');
      }
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
      await excluirRegistros(ids);
      await carregarRegistros();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Ocorreu um erro ao excluir os registros.');
    }
  });

  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const r = registros.find(reg => reg.id === tr.dataset.id);
    if (!r) return;
    for(const key in r) {
      if(form.elements[key]) form.elements[key].value = r[key] ?? '';
    }
    form.dataset.editing = r.id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  busca.addEventListener('input', () => { filterText = busca.value; render(); });
  selAll.addEventListener('change', (e) => { 
    document.querySelectorAll('.rowSel').forEach(cb => cb.checked = e.target.checked);
    updateSelectionState(); 
    updateQuality();
  });
  tbody.addEventListener('change', (e) => { if (e.target.classList.contains('rowSel')) { updateSelectionState(); updateQuality(); }});
  [totalInspec, escopoQualidade, mostrarTexto].forEach(el => el.addEventListener('input', updateQuality));
  
  // Botões de relatório (funcionalidade básica)
  btnBackup.addEventListener('click', () => {
      const json = JSON.stringify(registros, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_aoi_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
  });

  // =================================================================
  // INICIALIZAÇÃO
  // =================================================================
  carregarRegistros();
});