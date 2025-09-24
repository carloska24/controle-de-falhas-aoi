document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const loginForm = document.querySelector('#loginForm');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password');

    // --- LÓGICA DO LOGIN (sem alterações) ---
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

    // --- ANIMAÇÃO APRIMORADA ---
    const animationContainer = document.querySelector('#animation-container');
    const numberOfComponents = 40; // Aumentamos a quantidade para preencher mais a tela
    
    // Nossa lista de "trajes" para os componentes
    const componentTypes = [
        'smd-resistor', 
        'smd-capacitor', 
        'smd-led-red', 
        'smd-led-green',
        'smd-led-blue'
    ];

    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        
        // Sorteia um tipo de componente da nossa lista
        const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
        component.classList.add('smd-component', randomType);

        // Gera tamanhos, posições e velocidades aleatórias
        const size = Math.random() * 12 + 6; // Tamanho maior, entre 6px e 18px
        component.style.width = `${size}px`;
        component.style.height = `${size * (Math.random() * 0.5 + 0.5)}px`; // Proporções mais variadas
        component.style.left = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 12 + 8; // Duração da queda entre 8s e 20s
        const delay = Math.random() * 15; // Atraso maior para um efeito mais espaçado

        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;

        animationContainer.appendChild(component);
    }
});