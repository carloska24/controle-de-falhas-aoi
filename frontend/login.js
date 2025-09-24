document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const loginForm = document.querySelector('#loginForm');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password');

    // --- LÓGICA DO LOGIN (já existente) ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const email = usernameInput.value;
        const password = passwordInput.value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Erro desconhecido');
            }
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } catch (error) {
            alert(`Falha no login: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });

    // --- CÓDIGO NOVO PARA A ANIMAÇÃO ---
    const animationContainer = document.querySelector('#animation-container');
    const numberOfComponents = 30; // Quantos componentes queremos na tela

    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        component.classList.add('smd-component');

        // Gera tamanhos, posições e velocidades aleatórias
        const size = Math.random() * 8 + 4; // Tamanho entre 4px e 12px
        component.style.width = `${size}px`;
        component.style.height = `${size / 2}px`;
        component.style.left = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 10 + 8; // Duração da queda entre 8s e 18s
        const delay = Math.random() * 10; // Atraso para começar a cair

        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;

        animationContainer.appendChild(component);
    }
});