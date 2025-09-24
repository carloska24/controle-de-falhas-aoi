document.addEventListener('DOMContentLoaded', () => {
    // Endereço da nossa API de autenticação no Render
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const loginForm = document.querySelector('#loginForm');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede que a página recarregue

        const email = usernameInput.value;
        const password = passwordInput.value;

        // Desabilita o botão para evitar múltiplos cliques
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Se a resposta do servidor não for de sucesso (ex: 401, 500)
                throw new Error(data.error || 'Erro desconhecido');
            }

            // --- SUCESSO NO LOGIN ---
            // Guardamos o "crachá" (token) no localStorage do navegador
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirecionamos para a página principal da aplicação
            window.location.href = 'index.html';

        } catch (error) {
            // --- FALHA NO LOGIN ---
            alert(`Falha no login: ${error.message}`);
            
            // Reabilita o botão e restaura o texto
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});