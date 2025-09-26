document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || user?.role !== 'admin') {
        alert('Acesso negado. Você precisa ser um administrador para acessar esta página.');
        window.location.href = 'login.html';
        return;
    }

    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const usersTbody = document.querySelector('#usersTbody');
    const registerForm = document.querySelector('#registerForm');
    
    if (userDisplay) userDisplay.textContent = user.name || user.username;
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
      if (response.status === 204) return null;
      return response.json();
    }

    async function fetchUsers() {
        try {
            const users = await fetchAutenticado(`${API_BASE_URL}/api/users`);
            usersTbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.role}</td>
                    <td>
                        <button class="btn-delete" data-id="${u.id}" ${user.id === u.id ? 'disabled title="Não pode excluir a si mesmo"' : ''}>Excluir</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            alert(`Não foi possível carregar os usuários: ${error.message}`);
        }
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.querySelector('#name').value;
        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;
        try {
            await fetchAutenticado(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                body: JSON.stringify({ name, username, password, role: 'operator' })
            });
            registerForm.reset();
            fetchUsers();
        } catch (error) {
            alert(`Erro ao cadastrar usuário: ${error.message}`);
        }
    });

    usersTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            if (confirm(`Tem certeza que deseja excluir o usuário com ID ${id}?`)) {
                try {
                    await fetchAutenticado(`${API_BASE_URL}/api/users/${id}`, {
                        method: 'DELETE'
                    });
                    fetchUsers();
                } catch (error) {
                    alert(`Erro ao excluir usuário: ${error.message}`);
                }
            }
        }
    });

    fetchUsers();
});