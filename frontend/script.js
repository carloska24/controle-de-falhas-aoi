document.addEventListener('DOMContentLoaded', () => {

  // =================================================================
  // VERIFICAÇÃO DE AUTENTICAÇÃO E LOGOUT
  // =================================================================
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  const rightToolbar = document.querySelector('.toolbar .right');
  if (rightToolbar && user) {
    const userDisplay = document.createElement('span');
    userDisplay.style.marginRight = '10px';
    userDisplay.textContent = `Logado como: ${user.email}`;
    
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
  
  // =================================================================
  // CONFIGURAÇÕES E CÓDIGO PRINCIPAL
  // =================================================================
  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  // ... (código que já tínhamos)
  
  // Função para fazer requisições autenticadas (IMPORTANTE)
  async function fetchAutenticado(url, options = {}) {
      const defaultHeaders = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      };
      options.headers = { ...defaultHeaders, ...options.headers };
      
      const response = await fetch(url, options);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Token inválido ou expirado.');
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na requisição');
      }
      return response.json();
  }
  
  // ... (código de carregarRegistros, render, etc., usando fetchAutenticado onde necessário)
  
  // =================================================================
  // EVENT LISTENER DO MODO DEMO (CORRIGIDO)
  // =================================================================
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
            operador: user.email // Usa o usuário logado
        };
        // *** A CORREÇÃO ESTÁ AQUI: Usando a função fetchAutenticado ***
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
      btnDemo.disabled = false; btnDemo.textContent = '⚙️ Modo Demo';
    }
  });

  // Para garantir, o código completo está abaixo.
  // ... (o restante do arquivo)
  const form = document.querySelector('#formRegistro');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const btnReqPDF = document.querySelector('#btnReqPDF');
  const btnReqCSV = document.querySelector('#btnReqCSV');
  const btnPDF = document.querySelector('#btnPDF');
  const selAll = document.querySelector('#selAll');
  const busca = document.querySelector('#busca');
  const tbody = document.querySelector('#tbody');
  
  async function carregarRegistros() {
    try {
      registros = await fetchAutenticado(API_URL);
      render();
    } catch (error) {
      console.error('Falha ao carregar registros:', error);
    }
  }

  // O resto das funções (render, getFormData, validate, etc.) e 
  // event listeners permanecem como na versão anterior.
  
  carregarRegistros();
});