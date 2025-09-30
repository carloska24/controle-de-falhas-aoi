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
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const registerForm = document.querySelector('#registerForm');
    const usersTbody = document.querySelector('#usersTbody');
    const toastContainer = document.querySelector('#toastContainer');

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
    // FUNÇÃO DE FEEDBACK (TOAST)
    // =================================================================
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    }
    // Adiciona a animação de saída ao CSS dinamicamente
    document.head.insertAdjacentHTML('beforeend', '<style>@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }</style>');

    // =================================================================
    // LÓGICA DA PÁGINA
    // =================================================================

    // Preenche informações do usuário e configura o botão de logout
    if (userDisplay) userDisplay.textContent = user.name || user.email;
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
                <tr data-user-id="${u.id}">
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.role}</td>
                    <td style="text-align: center;">
                        ${u.role !== 'admin' ? `
                        <button class="btn-icon btn-delete" data-id="${u.id}" aria-label="Excluir usuário">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H5H21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>` : ''}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            showToast(`Erro ao carregar usuários: ${error.message}`, 'error');
        }
    }

    // Event listener para o formulário de cadastro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        try {
            await fetchAutenticado(USERS_API_URL, {
                method: 'POST',
                body: JSON.stringify({ name, username, password, role })
            });
            showToast('Usuário cadastrado com sucesso!');
            registerForm.reset();
            carregarUsuarios(); // Recarrega a lista após o cadastro
        } catch (error) {
            showToast(`Erro ao cadastrar operador: ${error.message}`, 'error');
        }
    });

    // Event listener para os botões de exclusão (delegação de evento)
    usersTbody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const userId = e.target.dataset.id;
            if (confirm('Tem certeza que deseja excluir este usuário?')) {
                try {
                    await fetchAutenticado(`${USERS_API_URL}/${userId}`, { method: 'DELETE' });
                    carregarUsuarios(); // Recarrega a lista após a exclusão
                    showToast('Usuário excluído com sucesso.');
                } catch (error) {
                    showToast(`Erro ao excluir usuário: ${error.message}`, 'error');
                }
            }
        }
    });

    // Lógica para mostrar/ocultar senha
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.classList.toggle('visible', isPassword);
    });

    // Carga inicial dos dados
    carregarUsuarios();
});