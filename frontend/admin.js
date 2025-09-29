document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // BLOCO DE SEGURANÇA E CONFIGURAÇÕES GLOBAIS
    // =================================================================
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));

    // Redireciona se não houver token ou se o usuário não for admin
    if (!token || !user || user.role !== 'admin') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return;
    }

    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
    const USERS_API_URL = `${API_BASE_URL}/api/users`;

    // =================================================================
    // SELETORES DO DOM
    // =================================================================
    const userEmailDisplay = document.querySelector('#userEmailDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const registerForm = document.querySelector('#registerForm');
    const usersTbody = document.querySelector('#usersTbody');

    // =================================================================
    // FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
    // =================================================================
    async function fetchAutenticado(url, options = {}) {
        const defaultHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        options.headers = { ...defaultHeaders, ...options.headers };
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Acesso não autorizado ou token expirado.');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Erro de comunicação' }));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }
        if (response.status === 204) return null; // No Content
        return response.json();
    }

    // =================================================================
    // LÓGICA DA PÁGINA
    // =================================================================

    // Preenche informações do usuário e botão de logout
    if (userEmailDisplay) userEmailDisplay.textContent = user.name || user.email;
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Carregar e renderizar usuários
    async function carregarUsuarios() {
        try {
            const users = await fetchAutenticado(USERS_API_URL);
            usersTbody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.role}</td>
                    <td>
                        ${u.role !== 'admin' ? `<button class="btn danger small btn-delete" data-id="${u.id}">Excluir</button>` : ''}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            alert(`Erro ao carregar usuários: ${error.message}`);
        }
    }

    // Event listener para o formulário de cadastro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            await fetchAutenticado(USERS_API_URL, {
                method: 'POST',
                body: JSON.stringify({ name, username, password, role: 'operator' })
            });
            alert('Operador cadastrado com sucesso!');
            registerForm.reset();
            carregarUsuarios(); // Recarrega a lista
        } catch (error) {
            alert(`Erro ao cadastrar operador: ${error.message}`);
        }
    });

    // Event listener para os botões de exclusão (delegação de evento)
    usersTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const userId = e.target.dataset.id;
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                try {
                    await fetchAutenticado(`${USERS_API_URL}/${userId}`, { method: 'DELETE' });
                    alert('Usuário excluído com sucesso!');
                    carregarUsuarios(); // Recarrega a lista
                } catch (error) {
                    alert(`Erro ao excluir usuário: ${error.message}`);
                }
            }
        }
    });

    // Carga inicial dos dados
    carregarUsuarios();
});