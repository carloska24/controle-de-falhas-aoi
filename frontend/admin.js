// 📁 admin.js (VERSÃO FINAL E CORRIGIDA)

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const registerSection = document.getElementById('registerSection');
    const usersSection = document.getElementById('usersSection');
    const userDisplay = document.querySelector('#userDisplay');
    const btnLogout = document.querySelector('#btnLogout');
    const usersTbody = document.querySelector('#usersTbody');
    const registerForm = document.querySelector('#registerForm');

    // Função de Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Função de busca de usuários (só funciona se logado)
    async function fetchUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar usuários.');
            const users = await response.json();
            
            if (usersTbody) {
                usersTbody.innerHTML = users.map(u => `
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.username}</td>
                        <td>${u.role}</td>
                        <td>
                            <button class="btn danger btn-delete" data-id="${u.id}" ${user && user.id === u.id ? 'disabled title="Não pode excluir a si mesmo"' : ''}>Excluir</button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            alert(`Não foi possível carregar os usuários: ${error.message}`);
        }
    }
    
    // Cadastro de Usuário
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.querySelector('#name').value;
            const username = document.querySelector('#username').value;
            const password = document.querySelector('#password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({ name, username, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro desconhecido.');

                alert(`Usuário ${username} cadastrado com sucesso!`);
                registerForm.reset();
                if (token) { // Se já estiver logado, atualiza a lista
                    fetchUsers();
                } else { // Se for o primeiro usuário, avisa para fazer login
                    alert('Agora você pode fazer o login.');
                    window.location.href = 'login.html';
                }
            } catch (error) {
                alert(`Erro ao cadastrar usuário: ${error.message}`);
            }
        });
    }
    
    // Exclusão de Usuário
    if (usersTbody) {
        usersTbody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const id = e.target.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o usuário com ID ${id}?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (!response.ok) throw new Error('Falha ao excluir.');
                        fetchUsers();
                    } catch (error) {
                        alert(`Erro ao excluir usuário: ${error.message}`);
                    }
                }
            }
        });
    }

    // LÓGICA PRINCIPAL: Decide o que mostrar na página
    if (token && user && user.role === 'admin') {
        // MODO ADMIN LOGADO
        if (userDisplay) userDisplay.textContent = user.name || user.username;
        fetchUsers();
    } else {
        // MODO CRIAÇÃO DO PRIMEIRO ADMIN (OU USUÁRIO NÃO-ADMIN)
        // Esconde a lista de usuários e o botão Sair
        if(usersSection) usersSection.style.display = 'none';
        if(userDisplay) userDisplay.style.display = 'none';
        if(btnLogout) btnLogout.style.display = 'none';
        
        // Se tentar acessar sem ser admin, mas já existirem usuários, bloqueia
        // (Isso requer uma pequena mudança no backend)
    }
});
