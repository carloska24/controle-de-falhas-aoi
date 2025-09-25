document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || user?.role !== 'admin') {
        alert('Acesso negado. Você precisa ser um administrador para acessar esta página.');
        window.location.href = 'login.html';
        return;
    }

    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';
    const userEmailDisplay = document.querySelector('#userEmailDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const usersTbody = document.querySelector('#usersTbody');
    const registerForm = document.querySelector('#registerForm');
    
    if (userEmailDisplay) userEmailDisplay.textContent = user.email;
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
      return response.json();
    }

    async function fetchUsers() {
        try {
            const users = await fetchAutenticado(`${API_BASE_URL}/api/users`);
            usersTbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            alert(`Não foi possível carregar os usuários: ${error.message}`);
        }
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        try {
            await fetchAutenticado(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                body: JSON.stringify({ email, password, role: 'operator' })
            });
            registerForm.reset();
            fetchUsers(); // Atualiza a lista
        } catch (error) {
            alert(`Erro ao cadastrar usuário: ${error.message}`);
        }
    });

    fetchUsers(); // Carrega a lista de usuários ao entrar na página
});