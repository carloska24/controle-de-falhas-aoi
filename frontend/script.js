// 📁 script.js (VERSÃO COM FUNCIONALIDADES 'GRAVAR' E 'EXCLUIR')

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
    new FormData(form).forEach((value, key) => {
        data[key.toLowerCase()] = value.trim();
    });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }
  
  function render() {
      const f = busca.value.toLowerCase();
      let rowsToRender = registros.filter(r => Object.values(r).join(' ').toLowerCase().includes(f));
      
      rowsToRender.sort((a, b) => {
          if (a[sort.key] < b[sort.key]) return sort.dir === 'asc' ? -1 : 1;
          if (a[sort.key] > b[sort.key]) return sort.dir === 'asc' ? 1 : -1;
          return 0;
      });
      
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
      if (!mTotal) return;
      mTotal.textContent = visibleRows.length;
      mOMs.textContent = new Set(visibleRows.map(r => r.om)).size;
      
      const counts = visibleRows.reduce((acc, r) => {
        acc[r.tipodefeito] = (acc[r.tipodefeito] || 0) + 1;
        return acc;
      }, {});
      const top3 = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,3);
      mDistrib.innerHTML = top3.map(([k,v]) => `<div>${escapeHTML(k)}: <strong>${v}</strong></div>`).join('') || '—';
  }
  
  function updateQuality() { /* ... (código existente sem alterações) ... */ }
  function drawPie(badPct) { /* ... (código existente sem alterações) ... */ }

  function resetForm() {
      const om = form.om.value;
      const qtdlote = form.qtdlote.value;
      form.reset();
      form.dataset.editing = '';
      form.om.value = om; 
      form.qtdlote.value = qtdlote;
      form.designador.focus();
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  function escapeHTML(s) { return s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }
  function updateSelectionState() { btnExcluir.disabled = selectedIds().length === 0; }
  function getRowsForScope() { /* ... (código existente sem alterações) ... */ }

  // --- EVENT LISTENERS ---

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isEditing = form.dataset.editing;
    const data = getFormData();
    
    if (!data.om || !data.qtdlote || !data.designador || !data.tipodefeito) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    try {
        if (isEditing) {
            // Lógica de Edição (será implementada a seguir)
            console.log('Modo Edição - a ser implementado');
        } else {
            data.id = uid();
            data.createdat = new Date().toISOString();
            data.status = 'aberto';
            data.operador = user.name || user.username;
            
            // Envia para o servidor
            await fetchAutenticado(API_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            // Adiciona na lista local para renderização imediata
            registros.unshift(data);
        }
        resetForm();
        render();
    } catch (error) {
        alert(`Erro ao salvar o registro: ${error.message}`);
    }
  });

  btnLimpar.addEventListener('click', resetForm);
  
  // NOVO: LÓGICA DE EXCLUSÃO
  btnExcluir.addEventListener('click', async () => {
    const idsParaExcluir = selectedIds();
    if (idsParaExcluir.length === 0) {
        alert('Nenhum registro selecionado para exclusão.');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir ${idsParaExcluir.length} registro(s)? Esta ação não pode ser desfeita.`)) {
        try {
            await fetchAutenticado(API_URL, {
                method: 'DELETE',
                body: JSON.stringify({ ids: idsParaExcluir })
            });

            // Remove os itens excluídos da lista local e renderiza novamente
            registros = registros.filter(r => !idsParaExcluir.includes(r.id));
            render();

        } catch (error) {
            alert(`Erro ao excluir registros: ${error.message}`);
        }
    }
  });

  [totalInspec, escopoQualidade].forEach(el => {
      if(el) el.addEventListener('input', updateQuality);
  });

  tbody.addEventListener('change', (e) => { 
    if (e.target.classList.contains('rowSel')) { 
      updateSelectionState(); 
      if(escopoQualidade && escopoQualidade.value === 'selecionados') updateQuality();
    }
  });
  
  busca.addEventListener('input', render);
  
  carregarRegistros();
});