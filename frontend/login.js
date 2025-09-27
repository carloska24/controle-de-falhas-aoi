// 📁 login.js (VERSÃO COM ÍCONE CORRIGIDO)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="color: var(--text-dim);" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>`;
    const eyeSlashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="color: var(--text-dim);" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/></svg>`;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.querySelector('#username').value;
        const password = document.querySelector('#password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao tentar fazer login.');
            }
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redireciona para a página principal para TODOS os usuários
            window.location.href = 'index.html';

        } catch (error) {
            alert(`Falha no login: ${error.message}`);
        }
    });

    const togglePassword = document.querySelector('#togglePassword');
    if (togglePassword) {
        togglePassword.innerHTML = eyeIcon;
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.querySelector('#password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.innerHTML = type === 'password' ? eyeIcon : eyeSlashIcon;
        });
    }
});