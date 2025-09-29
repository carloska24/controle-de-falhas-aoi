// 📁 login.js (VERSÃO COM NOVOS ÍCONES E ANIMAÇÃO SMD)

document.addEventListener('DOMContentLoaded', () => {
<<<<<<< HEAD
    // =================================================================
    // CONFIGURAÇÕES E SELETORES DO DOM
    // =================================================================
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://controle-de-falhas-aoi.onrender.com';
    
    const loginForm = document.querySelector('#loginForm');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const monkeyIcon = document.getElementById('monkeyIcon');
    const animationContainer = document.querySelector('#animation-container');
    
    // Alternância de exibição de senha (olho/macaquinho)
    if (togglePassword && passwordInput && eyeIcon && monkeyIcon) {
        togglePassword.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeIcon.style.display = 'none';
                monkeyIcon.style.display = 'inline';
            } else {
                passwordInput.type = 'password';
                eyeIcon.style.display = 'inline';
                monkeyIcon.style.display = 'none';
            }
        });
    }

    // Animação de fundo
=======
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';
    const loginForm = document.querySelector('#loginForm');
    const animationContainer = document.querySelector('#animation-container');
    const passwordInput = document.querySelector('#password');
    const togglePassword = document.querySelector('#togglePassword');
    const usernameInput = document.querySelector('#username');
    
    // SUA LÓGICA DE ANIMAÇÃO MANTIDA
>>>>>>> cf1a0302190a645e88a985811af995e3fba74c04
    const numberOfComponents = 40;
    const componentTypes = [ 'smd-resistor','smd-resistor','smd-capacitor','smd-capacitor','smd-led','smd-ic' ];
    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
        component.classList.add('smd-component', randomType);
        let sizeW, sizeH;
        if (randomType === 'smd-ic') { sizeW = Math.random() * 20 + 20; sizeH = sizeW; } 
        else { sizeW = Math.random() * 10 + 6; sizeH = sizeW * 0.5; }
        component.style.width = `${sizeW}px`;
        component.style.height = `${sizeH}px`;
        component.style.left = `${Math.random() * 100}%`;
        const duration = Math.random() * 12 + 10;
        const delay = -(Math.random() * duration); 
        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;
        animationContainer.appendChild(component);
    }
    
<<<<<<< HEAD
    // Lógica do Formulário
=======
    // LÓGICA DE LOGIN ATUALIZADA
>>>>>>> cf1a0302190a645e88a985811af995e3fba74c04
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const username = usernameInput.value;
        const password = passwordInput.value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Erro desconhecido'); }
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // LÓGICA DE REDIRECIONAMENTO INTELIGENTE
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            alert(`Falha no login: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });

    // SUA LÓGICA DO ÍCONE DE EMOJI MANTIDA
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
});