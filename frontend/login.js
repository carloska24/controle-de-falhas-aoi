// 📁 login.js (VERSÃO FINAL COM LÓGICA DE LOGIN E ANIMAÇÃO)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm');
    
    // ENDEREÇO DO SEU SERVIDOR NO RENDER
    const API_BASE_URL = 'https://controle-de-falhas-aoi.onrender.com';

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

            // Salva o token e os dados do usuário no localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redireciona para a página principal
            window.location.href = 'index.html';

        } catch (error) {
            alert(`Falha no login: ${error.message}`);
        }
    });

    // Lógica para mostrar/esconder a senha
    const togglePassword = document.querySelector('#togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.querySelector('#password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }
    
    // ==========================================================
    // CÓDIGO PARA GERAR A ANIMAÇÃO DOS COMPONENTES SMD
    // ==========================================================
    const animationContainer = document.querySelector('#animation-container');
    if(animationContainer) {
        const componentTypes = ['smd-resistor', 'smd-capacitor'];
        for (let i = 0; i < 40; i++) { // Cria 40 componentes
            const component = document.createElement('div');
            component.classList.add('smd-component');
            
            // Escolhe um tipo de componente aleatoriamente
            const type = componentTypes[Math.floor(Math.random() * componentTypes.length)];
            component.classList.add(type);

            // Define tamanho e posição aleatórios
            const size = Math.random() * 15 + 5; // Tamanho entre 5px e 20px
            component.style.width = `${size}px`;
            component.style.height = `${size * 0.6}px`;
            component.style.left = `${Math.random() * 100}vw`;

            // Define velocidade e atraso aleatórios para a animação
            component.style.animationDuration = `${Math.random() * 5 + 5}s`; // Duração entre 5s e 10s
            component.style.animationDelay = `${Math.random() * 5}s`; // Atraso de até 5s

            animationContainer.appendChild(component);
        }
    }
});