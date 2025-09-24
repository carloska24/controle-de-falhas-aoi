document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const loginForm = document.querySelector('#loginForm');

    // --- ANIMAÇÃO PROFISSIONAL ---
    const animationContainer = document.querySelector('#animation-container');
    const numberOfComponents = 40;
    
    // Lista de tipos de componentes para sorteio (agora sem cores)
    const componentTypes = [
        'smd-resistor', 'smd-resistor', 'smd-resistor', 'smd-resistor',
        'smd-capacitor', 'smd-capacitor', 'smd-capacitor',
        'smd-led', 'smd-led',
        'smd-ic'
    ];

    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        
        const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
        component.classList.add('smd-component', randomType);

        let sizeW, sizeH;
        if (randomType === 'smd-ic') {
            sizeW = Math.random() * 20 + 20; // CIs são maiores
            sizeH = sizeW;
        } else {
            sizeW = Math.random() * 10 + 6; // Componentes menores
            sizeH = sizeW * 0.5; // Todos retangulares (formato 2:1)
        }
        
        component.style.width = `${sizeW}px`;
        component.style.height = `${sizeH}px`;
        component.style.left = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 12 + 10; // Duração entre 10s e 22s
        const delay = Math.random() * 20;

        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;

        animationContainer.appendChild(component);
    }

    // --- LÓGICA DO LOGIN (sem alterações) ---
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.querySelector('#password');
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
            if (!response.ok) { throw new Error(data.error || 'Erro desconhecido'); }
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'index.html';
        } catch (error) {
            alert(`Falha no login: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});