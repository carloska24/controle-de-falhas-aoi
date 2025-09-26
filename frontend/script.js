// 📁 script.js (VERSÃO CORRIGIDA COM 'GRAVAR', 'EXCLUIR' E 'EDITAR' FUNCIONANDO)

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
  const tbody = document.querySelector('#tbody');
  // ... (outros seletores continuam aqui) ...
  const userDisplay = document.querySelector('#userDisplay');
  const btnLogout = document.querySelector('#btnLogout');

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

  // CORRIGIDO: Revertida para a versão original que captura todos os campos
  function getFormData() {
    const data = {};
    new FormData(form).forEach((value, key) => {
        data[key.toLowerCase()] = value.trim();
    });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }
  
  // As funções render, updateMetrics, etc. permanecem as mesmas da versão anterior
  function render() {
      const f = document.querySelector('#busca').value.toLowerCase();
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
      // ... chamadas para updateMetrics, etc.
  }

  function resetForm() {
      // ... (código da versão anterior sem alterações)
      const om = form.om.value;
      const qtdlote = form.qtdlote.value;
      form.reset();
      form.dataset.editing = '';
      btnGravar.textContent = '➕ Gravar';
      form.om.value = om; 
      form.qtdlote.value = qtdlote;
      form.designador.focus();
  }

  // ... (funções auxiliares uid, escapeHTML, etc. da versão anterior)
  function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  function escapeHTML(s) { return s ? s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') : ''; }
  function formatDate(d) { return d ? new Date(d).toLocaleString('pt-BR') : ''; }
  function selectedIds() { return Array.from(document.querySelectorAll('.rowSel:checked')).map(cb => cb.closest('tr').dataset.id); }

  // --- EVENT LISTENERS ---

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
            // CORRIGIDO: Prepara um objeto limpo APENAS para a atualização
            const updateData = {
                om: data.om,
                qtdlote: data.qtdlote,
                serial: data.serial,
                designador: data.designador,
                tipodefeito: data.tipodefeito,
                pn: data.pn,
                descricao: data.descricao,
                obs: data.obs,
            };

            await fetchAutenticado(`${API_URL}/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            const index = registros.findIndex(r => r.id === editingId);
            if (index !== -1) {
                // Atualiza o registro na lista local mantendo os dados originais que não são do form
                registros[index] = { ...registros[index], ...updateData };
            }
        } else {
            // Lógica de Gravação (agora funciona corretamente)
            data.id = uid();
            data.createdat = new Date().toISOString();
            data.status = 'aberto';
            data.operador = user.name || user.username;
            
            await fetchAutenticado(API_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            registros.unshift(data);
        }
        resetForm();
        render();
    } catch (error) {
        alert(`Erro ao salvar o registro: ${error.message}`);
    }
  });

  // Listener do botão de Limpar
  btnLimpar.addEventListener('click', resetForm);
  
  // Listener do botão de Excluir (sem alterações)
  btnExcluir.addEventListener('click', async () => {
    const idsParaExcluir = selectedIds();
    if (idsParaExcluir.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir ${idsParaExcluir.length} registro(s)?`)) {
        try {
            await fetchAutenticado(API_URL, {
                method: 'DELETE',
                body: JSON.stringify({ ids: idsParaExcluir })
            });
            registros = registros.filter(r => !idsParaExcluir.includes(r.id));
            render();
        } catch (error) {
            alert(`Erro ao excluir registros: ${error.message}`);
        }
    }
  });
  
  // Listener de duplo clique (sem alterações)
  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.dataset.id;
    const registroParaEditar = registros.find(r => r.id === id);
    if (registroParaEditar) {
        form.om.value = registroParaEditar.om || '';
        form.qtdlote.value = registroParaEditar.qtdlote || '';
        form.serial.value = registroParaEditar.serial || '';
        // ... (resto do preenchimento do formulário)
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

  // ... (outros listeners de busca, seleção, etc. que não precisam ser mostrados novamente)
  
  carregarRegistros();
});