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
  let filterText = '';

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
  
  const rightToolbar = document.querySelector('.card.noprint .toolbar .right');
  if (rightToolbar && user) {
    const userDisplay = document.createElement('span');
    userDisplay.style.marginRight = '10px';
    userDisplay.textContent = `Logado: ${user.email}`;
    const btnLogout = document.createElement('button');
    btnLogout.id = 'btnLogout';
    btnLogout.className = 'btn outline';
    btnLogout.textContent = 'Sair';
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
    rightToolbar.prepend(btnLogout);
    rightToolbar.prepend(userDisplay);
  }

  async function fetchAutenticado(url, options = {}) {
      const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      options.headers = { ...defaultHeaders, ...options.headers };
      const response = await fetch(url, options);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
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
    }
  }

  function render() {
      // (aqui entra a função render completa)
  }
  
  // (aqui entram todas as outras funções: getFormData, validate, updateMetrics, etc.)

  // Event Listeners
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    try {
      let method = 'POST';
      let url = API_URL;
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
      form.reset();
      form.dataset.editing = '';
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  });

  btnExcluir.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length || !confirm(`Excluir ${ids.length} registro(s)?`)) return;
    try {
      await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids }) });
      await carregarRegistros();
    } catch (error) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  });

  // ========== O CÓDIGO CORRIGIDO ESTÁ AQUI ==========
  btnDemo.addEventListener('click', async () => {
    if (!confirm('Adicionar 5 registros de exemplo no banco de dados? Esta ação não pode ser desfeita.')) return;
    const demoData = [
      {om:'OM-2025-DEMO1', qtdlote:50, serial:'SN-DEMO1', designador:'R15', tipodefeito:'Componente Ausente', pn:'RC0603FR-0710KL', obs:'Lado TOP'},
      {om:'OM-2025-DEMO1', qtdlote:50, serial:'SN-DEMO2', designador:'C3', tipodefeito:'Componente Ausente', pn:'CL10B104KB8NNNC', obs:''},
      {om:'OM-2025-DEMO2', qtdlote:30, serial:'SN-DEMO3', designador:'U1', tipodefeito:'Componente Errado', pn:'ATMEGA328P-AU', obs:'Apenas exemplo'},
      {om:'OM-2025-DEMO2', qtdlote:30, serial:'SN-DEMO4', designador:'R1', tipodefeito:'Componente Ausente', pn:'RC0603FR-0710KL', obs:''},
      {om:'OM-2025-DEMO3', qtdlote:80, serial:'SN-DEMO5', designador:'C7', tipodefeito:'Solda Fria', pn:'CL10B104KB8NNNC', obs:'Reinspeção necessária'},
    ];
    try {
      btnDemo.disabled = true; btnDemo.textContent = 'Gravando...';
      for(const item of demoData) {
        const fullItem = { 
          ...item, 
          id: uid(), 
          createdat: new Date().toISOString(), 
          status: 'Registrado', 
          operador: user.email 
        };
        // CORREÇÃO: Usando a função fetchAutenticado que já envia o token
        await fetchAutenticado(API_URL, { 
            method: 'POST', 
            body: JSON.stringify(fullItem) 
        });
      }
      alert('Registros de exemplo adicionados com sucesso!');
      await carregarRegistros();
    } catch (error) {
      console.error("Erro ao adicionar dados de exemplo:", error);
      alert(`Falha ao adicionar dados de exemplo: ${error.message}`);
    } finally {
      btnDemo.disabled = false;
      btnDemo.textContent = '⚙️ Modo Demo';
    }
  });
  
  // (aqui entram todos os outros listeners e a chamada inicial carregarRegistros())
  
  carregarRegistros();
});