// 📁 script.js (VERSÃO COM CORREÇÃO DEFINITIVA PARA HABILITAR O BOTÃO EXCLUIR)

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
  
  // Seletores de elementos da página
  const form = document.querySelector('#formRegistro');
  const btnGravar = form.querySelector('button[type="submit"]');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  const userDisplay = document.querySelector('#userDisplay');
  const btnLogout = document.querySelector('#btnLogout');
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  const mDistrib = document.querySelector('#mDistrib');
  // ... outros seletores que você possa ter

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
      updateSelectionState();
  }
  
  function updateMetrics(visibleRows) { /* ...código existente... */ }
  function resetForm() { /* ...código existente... */ }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  function escapeHTML(s) { return s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  
  // ==================================================================
  // CORREÇÃO DEFINITIVA DA LÓGICA DE SELEÇÃO E ESTADO DO BOTÃO
  // ==================================================================
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
  
  // Listener para os checkboxes da tabela (delegação de evento)
  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState();
    }
  });

  // Listener para o checkbox "Selecionar Todos"
  selAll.addEventListener('change', () => {
      const isChecked = selAll.checked;
      document.querySelectorAll('.rowSel').forEach(checkbox => {
          checkbox.checked = isChecked;
      });
      updateSelectionState();
  });
  // ==================================================================

  // --- EVENT LISTENERS PRINCIPAIS ---

  form.addEventListener('submit', async (e) => { /* ...código existente... */ });
  btnLimpar.addEventListener('click', resetForm);
  
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
  
  tbody.addEventListener('dblclick', (e) => { /* ...código existente... */ });
  busca.addEventListener('input', render);
  
  carregarRegistros();

  // ----- Funções omitidas para brevidade, mas que devem estar no seu arquivo -----
  // (As funções abaixo não mudaram, então use as da versão anterior)
  function updateMetrics(visibleRows) {
    if(!mTotal) return;
    mTotal.textContent = visibleRows.length;
    mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
    const counts = visibleRows.reduce((acc, r) => {
      acc[r.tipodefeito] = (acc[r.tipodefeito] || 0) + 1;
      return acc;
    }, {});
    const top3 = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,3);
    const mDistrib = document.querySelector('#mDistrib');
    if(mDistrib) mDistrib.innerHTML = top3.map(([k,v]) => `<div>${escapeHTML(k)}: <strong>${v}</strong></div>`).join('') || '—';
  }

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
});