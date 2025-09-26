// 📁 script.js (VERSÃO COM FUNCIONALIDADE 'DEMO' ADICIONADA)

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
  const btnDemo = document.querySelector('#btnDemo'); // Seletor do botão Demo
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  const userDisplay = document.querySelector('#userDisplay');
  const btnLogout = document.querySelector('#btnLogout');
  const mTotal = document.querySelector('#mTotal');
  const mOMs = document.querySelector('#mOMs');
  // ... resto dos seletores

  // ... (funções fetchAutenticado, carregarRegistros, getFormData, render, etc., sem alterações)

  // ==================================================================
  // LÓGICA DE SELEÇÃO E ESTADO DO BOTÃO (Sem alterações)
  // ==================================================================
  function updateSelectionState() { /* ...código existente... */ }
  tbody.addEventListener('change', (e) => { /* ...código existente... */ });
  selAll.addEventListener('change', () => { /* ...código existente... */ });
  // ==================================================================

  // --- EVENT LISTENERS PRINCIPAIS ---

  form.addEventListener('submit', async (e) => { /* ...código existente... */ });
  btnLimpar.addEventListener('click', () => { /* ...código existente... */ });
  btnExcluir.addEventListener('click', async () => { /* ...código existente... */ });
  tbody.addEventListener('dblclick', (e) => { /* ...código existente... */ });
  
  // NOVO: LÓGICA DO BOTÃO DEMO
  btnDemo.addEventListener('click', () => {
    const demoData = [
      { id: uid(), om: 'OM-11223', qtdlote: 150, serial: 'SN-A01', designador: 'C101', tipodefeito: 'Componente Ausente', pn: '12345-01', descricao: 'CAP 10uF', obs: 'Verificar alimentador', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
      { id: uid(), om: 'OM-11223', qtdlote: 150, serial: 'SN-A05', designador: 'R203', tipodefeito: 'Solda Fria', pn: '54321-02', descricao: 'RES 10K', obs: 'Perfil de forno', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
      { id: uid(), om: 'OM-44556', qtdlote: 75, serial: 'SN-B02', designador: 'U1', tipodefeito: 'Curto', pn: '98765-03', descricao: 'CI REG TENS', obs: 'Pinos 1 e 2 em curto', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
      { id: uid(), om: 'OM-44556', qtdlote: 75, serial: 'SN-B09', designador: 'Q15', tipodefeito: 'Tombstone', pn: '55555-04', descricao: 'TRANSISTOR BC547', obs: '', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' },
      { id: uid(), om: 'OM-77889', qtdlote: 300, serial: 'SN-C11', designador: 'D5', tipodefeito: 'Componente Errado', pn: '33333-05', descricao: 'DIODO ZENER', obs: 'Invertido com D6', createdat: new Date().toISOString(), status: 'aberto', operador: 'Demo' }
    ];

    // Adiciona os dados de demonstração no início da lista de registros existentes
    registros.unshift(...demoData);
    render();
    alert(`${demoData.length} registros de demonstração foram adicionados.\nEles não serão salvos no banco de dados.`);
  });
  
  busca.addEventListener('input', render);
  carregarRegistros();


  // ----- Funções completas que não foram alteradas (copie e cole para garantir que seu arquivo esteja completo) -----
  
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