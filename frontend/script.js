document.addEventListener('DOMContentLoaded', () => {

  // BLOCO DE SEGURANÇA
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  // LÓGICA DO CABEÇALHO
  const userEmailDisplay = document.querySelector('#userEmailDisplay');
  const btnLogout = document.querySelector('#btnLogout');

  if (userEmailDisplay && user) {
      userEmailDisplay.textContent = user.email;
  }
  if (btnLogout) {
      btnLogout.addEventListener('click', () => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = 'login.html';
      });
  }

  // CONFIGURAÇÕES GLOBAIS
  const API_URL = 'https://controle-de-falhas-aoi.onrender.com/api/registros';
  let registros = [];
  
  // SELETORES DO DOM
  const form = document.querySelector('#formRegistro');
  const btnLimpar = document.querySelector('#btnLimpar');
  const btnExcluir = document.querySelector('#btnExcluir');
  const btnDemo = document.querySelector('#btnDemo');
  const tbody = document.querySelector('#tbody');

  // FUNÇÃO CENTRAL DE API
  async function fetchAutenticado(url, options = {}) {
      const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      options.headers = { ...defaultHeaders, ...options.headers };
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      if (response.status === 204) return null;
      return response.json();
  }

  // FUNÇÕES DA APLICAÇÃO
  async function carregarRegistros() {
    try {
      registros = await fetchAutenticado(API_URL) || [];
      render();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function render() {
      // (aqui entra a função render completa)
  }

  // EVENT LISTENERS
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    try {
      let method = 'POST', url = API_URL;
      if (form.dataset.editing) {
        method = 'PUT';
        url = `${API_URL}/${form.dataset.editing}`;
      } else {
        data.id = Date.now().toString(); // uid()
        data.createdat = new Date().toISOString();
        data.operador = user.email;
      }
      await fetchAutenticado(url, { method, body: JSON.stringify(data) });
      await carregarRegistros();
      form.reset();
    } catch (error) {
      alert(`Erro ao salvar: ${error.message}`);
    }
  });

  btnLimpar.addEventListener('click', () => form.reset());

  btnExcluir.addEventListener('click', async () => {
    const ids = selectedIds();
    if (!ids.length || !confirm('Excluir?')) return;
    try {
      await fetchAutenticado(API_URL, { method: 'DELETE', body: JSON.stringify({ ids }) });
      await carregarRegistros();
    } catch (error) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  });
  
  btnDemo.addEventListener('click', async () => {
      // (Lógica do modo demo)
  });

  carregarRegistros(); // Inicialização
});