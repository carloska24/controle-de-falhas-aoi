document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

    const loginForm = document.querySelector('#loginForm');
    // ... (lógica de login permanece a mesma)

    // --- ANIMAÇÃO PROFISSIONAL ---
    const animationContainer = document.querySelector('#animation-container');
    const numberOfComponents = 35;
    
    // Lista de tipos de componentes para sorteio
    const componentTypes = [
        'smd-resistor', 'smd-resistor', 'smd-resistor', // Mais chance de ser resistor
        'smd-capacitor', 'smd-capacitor',              // Chance média de ser capacitor
        'smd-led-red', 'smd-led-green',                 // Chance menor de ser LED
        'smd-ic'                                       // Chance rara de ser CI
    ];

    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        
        // Sorteia um tipo de componente
        const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
        component.classList.add('smd-component', randomType);

        // Gera tamanhos, posições e velocidades aleatórias
        let sizeW, sizeH;
        if (randomType === 'smd-ic') {
            sizeW = Math.random() * 15 + 15; // CIs são maiores e mais quadrados
            sizeH = sizeW;
        } else if (randomType === 'smd-resistor') {
            sizeW = Math.random() * 8 + 8; // Resistores são mais retangulares
            sizeH = sizeW / 2;
            // Adiciona o código do resistor (ex: 103, 471)
            const resistorValues = ['103', '472', '221', '104', '0R0'];
            const randomValue = resistorValues[Math.floor(Math.random() * resistorValues.length)];
            component.dataset.value = randomValue;
        } else {
            sizeW = Math.random() * 10 + 5; // Outros componentes
            sizeH = sizeW * (Math.random() * 0.5 + 0.6);
        }
        
        component.style.width = `${sizeW}px`;
        component.style.height = `${sizeH}px`;
        component.style.left = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 10 + 10; // Duração entre 10s e 20s
        const delay = Math.random() * 15;

        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;

        animationContainer.appendChild(component);
    }
    
    // Cole a lógica de login aqui
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