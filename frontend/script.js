// 📁 script.js (VERSÃO COM 'GRAVAR', 'EXCLUIR' E 'EDITAR')

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
  const btnGravar = form.querySelector('button[type="submit"]'); // MODIFICADO: Adicionado seletor para o botão
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
        // Excluímos campos que não pertencem ao modelo do 'registro' para evitar enviá-los no PUT
        if (['om', 'qtdlote', 'serial', 'designador', 'tipodefeito', 'pn', 'descricao', 'obs'].includes(key)) {
            data[key.toLowerCase()] = value.trim();
        }
    });
    data.qtdlote = Number(data.qtdlote);
    return data;
  }
  
  function render() {
      // ... (código existente sem alterações) ...
  }
  
  function updateMetrics(visibleRows) {
      // ... (código existente sem alterações) ...
  }
  
  function updateQuality() {
      // ... (código existente sem alterações) ...
  }
  function drawPie(badPct) { /* ... Lógica do gráfico ... */ }

  function resetForm() {
      const om = form.om.value;
      const qtdlote = form.qtdlote.value;
      form.reset();
      form.dataset.editing = ''; // MODIFICADO: Limpa o modo de edição
      btnGravar.textContent = '➕ Gravar'; // MODIFICADO: Restaura o texto do botão
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
    const editingId = form.dataset.editing;
    const data = getFormData();
    
    if (!data.om || !data.qtdlote || !data.designador || !data.tipodefeito) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    try {
        if (editingId) {
            // MODIFICADO: Lógica de Edição implementada
            await fetchAutenticado(`${API_URL}/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            // Atualiza o registro na lista local
            const index = registros.findIndex(r => r.id === editingId);
            if (index !== -1) {
                registros[index] = { ...registros[index], ...data };
            }
        } else {
            // Lógica de Gravação
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

  btnLimpar.addEventListener('click', resetForm);
  
  btnExcluir.addEventListener('click', async () => {
    // ... (código existente sem alterações) ...
  });
  
  // NOVO: LÓGICA DE EDIÇÃO COM DUPLO CLIQUE
  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;

    const id = tr.dataset.id;
    const registroParaEditar = registros.find(r => r.id === id);

    if (registroParaEditar) {
        // Preenche o formulário com os dados do registro
        form.om.value = registroParaEditar.om || '';
        form.qtdlote.value = registroParaEditar.qtdlote || '';
        form.serial.value = registroParaEditar.serial || '';
        form.designador.value = registroParaEditar.designador || '';
        form.tipodefeito.value = registroParaEditar.tipodefeito || '';
        form.pn.value = registroParaEditar.pn || '';
        form.descricao.value = registroParaEditar.descricao || '';
        form.obs.value = registroParaEditar.obs || '';

        // Entra em "modo de edição"
        form.dataset.editing = id;
        btnGravar.textContent = '💾 Atualizar Registro';
        window.scrollTo(0, 0); // Rola a página para o topo para ver o formulário
        form.designador.focus();
    }
  });

  [totalInspec, escopoQualidade].forEach(el => {
      // ... (código existente sem alterações) ...
  });

  tbody.addEventListener('change', (e) => { 
    // ... (código existente sem alterações) ...
  });
  
  busca.addEventListener('input', render);
  
  carregarRegistros();
});