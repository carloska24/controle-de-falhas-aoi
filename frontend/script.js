document.addEventListener('DOMContentLoaded', () => {
  const { jsPDF } = window.jspdf;
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  
  const form = document.querySelector('#formRegistro');
  const btnGravar = form.querySelector('button[type="submit"]');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const btnDemo = document.querySelector('#btnDemo');
  const btnPDF = document.querySelector('#btnPDF');
  const btnReqCSV = document.querySelector('#btnReqCSV');
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
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444;">Erro ao carregar dados. Verifique o console (F12).</td></tr>`;
    }
  }

  function getFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => { data[key.toLowerCase()] = value.trim(); });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }

  function render() {
      const f = busca.value.toLowerCase();
      let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
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
      updateMetrics(rowsToRender);
      updateSelectionState();
      updateQuality();
  }
  
  function updateMetrics(visibleRows) {
    if(!mTotal) return;
    mTotal.textContent = visibleRows.length;
    mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
    const counts = visibleRows.reduce((acc, r) => {
      acc[r.tipodefeito] = (acc[r.tipodefeito] || 0) + 1;
      return acc;
    }, {});
    const top3 = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,3);
    if(mDistrib) mDistrib.innerHTML = top3.map(([k,v]) => `<div>${escapeHTML(k)}: <strong>${v}</strong></div>`).join('') || '—';
  }
  
  function getRowsForScope() {
    const scope = escopoQualidade.value;
    if (scope === 'selecionados') {
        const ids = selectedIds();
        return registros.filter(r => ids.includes(r.id));
    }
    return registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(busca.value.toLowerCase()));
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
      if (pieCenter) pieCenter.textContent = `${goodPct.toFixed(0)}%`;
      let emoji, rotulo;
      if (goodPct >= 95) { emoji = '😃'; rotulo = 'Excelente'; }
      else if (goodPct >= 85) { emoji = '🙂'; rotulo = 'Muito Bom'; }
      else if (goodPct >= 75) { emoji = '😐'; rotulo = 'Regular'; }
      else { emoji = '😟'; rotulo = 'Ruim'; }
      if(qualEmoji) qualEmoji.textContent = emoji;
      if(qualText) qualText.textContent = `${rotulo} (${goodPct.toFixed(1)}% aproveitamento)`;
      if(qualDetalhe) qualDetalhe.textContent = `Falhas contadas: ${fails} de ${total} itens inspecionados (${badPct.toFixed(1)}% de falhas).`;
  }

  function drawPie(goodPct) {
      const ctx = pie.getContext('2d');
      const R = pie.width / 2;
      ctx.clearRect(0,0,pie.width,pie.height);
      const goodAngle = (goodPct / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(R, R);
      ctx.arc(R, R, R, -0.5 * Math.PI, goodAngle - 0.5 * Math.PI);
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
    btnGravar.textContent = '➕ Gravar';
    form.om.value = om; 
    form.qtdlote.value = qtdlote;
    form.designador.focus();
  }
  
  function updateSelectionState() {
    const checkedCount = selectedIds().length;
    btnExcluir.disabled = checkedCount === 0;
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
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }
    try {
        if (editingId) {
            const updateData = { om: data.om, qtdlote: data.qtdlote, serial: data.serial, designador: data.designador, tipodefeito: data.tipodefeito, pn: data.pn, descricao: data.descricao, obs: data.obs };
            await fetchAutenticado(`${API_URL}/${editingId}`, { method: 'PUT', body: JSON.stringify(updateData) });
            const index = registros.findIndex(r => r.id === editingId);
            if (index !== -1) { registros[index] = { ...registros[index], ...updateData }; }
        } else {
            data.id = uid();
            data.createdat = new Date().toISOString();
            data.status = 'aberto';
            data.operador = user.name || user.username;
            await fetchAutenticado(API_URL, { method: 'POST', body: JSON.stringify(data) });
            registros.unshift(data);
        }
        resetForm();
        render();
    } catch (error) {
        alert(`Erro ao salvar o registro: ${error.message}`);
    }
  });

  btnExcluir.addEventListener('click', async () => {
    const idsParaExcluir = selectedIds();
    if (idsParaExcluir.length === 0) { return; }
    if (confirm(`Tem certeza que deseja excluir ${idsParaExcluir.length} registro(s)?`)) {
        try {
            await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids: idsParaExcluir }) });
            registros = registros.filter(r => !idsParaExcluir.includes(r.id));
            render();
        } catch (error) {
            alert(`Erro ao excluir registros: ${error.message}`);
        }
    }
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
        btnGravar.textContent = '💾 Atualizar Registro';
        window.scrollTo(0, 0);
        form.designador.focus();
    }
  });

  btnDemo.addEventListener('click', () => {
    const demoData = [
      { id: uid(), om: 'OM-11223', qtdlote: 150, serial: 'SN-A01', designador: 'C101', tipodefeito: 'Componente Ausente', pn: '12345-01', descricao: 'CAP 10uF', obs: 'Verificar alimentador', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
      { id: uid(), om: 'OM-44556', qtdlote: 75, serial: 'SN-B02', designador: 'U1', tipodefeito: 'Curto', pn: '98765-03', descricao: 'CI REG TENS', obs: 'Pinos 1 e 2 em curto', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
    ];
    registros.unshift(...demoData);
    render();
    alert(`${demoData.length} registros de demonstração foram adicionados.\nEles não serão salvos no banco de dados.`);
  });
  
  [totalInspec, escopoQualidade].forEach(el => { if(el) el.addEventListener('input', updateQuality); });
  busca.addEventListener('input', () => { render(); });
  
  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState();
      if(escopoQualidade.value === 'selecionados') updateQuality();
    }
  });
  selAll.addEventListener('change', () => {
      const isChecked = selAll.checked;
      document.querySelectorAll('.rowSel').forEach(checkbox => { checkbox.checked = isChecked; });
      updateSelectionState();
      if(escopoQualidade.value === 'selecionados') updateQuality();
  });
  
  btnReqCSV.addEventListener('click', () => {
    const idsSelecionados = selectedIds();
    if (idsSelecionados.length === 0) {
      alert('Por favor, selecione os registros que deseja exportar para CSV.');
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

  btnPDF.addEventListener('click', () => {
    const idsSelecionados = selectedIds();
    if (idsSelecionados.length === 0) {
      alert('Por favor, selecione os registros que deseja exportar para PDF.');
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
  
  carregarRegistros();
});