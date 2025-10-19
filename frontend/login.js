// 📁 login.js (VERSÃO COM NOVOS ÍCONES E ANIMAÇÃO SMD)

document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // CONFIGURAÇÕES E SELETORES DO DOM
    // =================================================================
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    // Usa `window.API_BASE_URL` definido por `config.js`. Se estiver vazio, usa caminho relativo.
    let API_BASE_URL = typeof window.API_BASE_URL !== 'undefined' ? window.API_BASE_URL : '';
    if (!API_BASE_URL) {
        // Fallback: assume backend rodando na porta 3001 no mesmo host (útil em dev)
        API_BASE_URL = (typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : (isLocal ? ('http://' + window.location.hostname + ':3001') : '')) || '';
    }

    const loginForm = document.querySelector('#loginForm');
    const usernameInput = document.querySelector('#username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const animationContainer = document.querySelector('#animation-container');

    // Animação de fundo
    // Densidade ajustada: menos itens em telas pequenas, mais em telas grandes
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const numberOfComponents = vw < 480 ? 24 : vw < 1024 ? 36 : 48;
    // Mix favorece R/C, reduzindo ICs para evitar poluição visual
    const componentTypes = [ 
        'smd-resistor','smd-resistor','smd-resistor','smd-resistor',
        'smd-capacitor','smd-capacitor','smd-capacitor','smd-capacitor','smd-capacitor',
        'smd-led','smd-diode',
        'smd-ic' // raro
    ];
    const fragment = document.createDocumentFragment(); // Cria um container temporário
    for (let i = 0; i < numberOfComponents; i++) {
        const component = document.createElement('div');
        const randomType = componentTypes[Math.floor(Math.random() * componentTypes.length)];
        component.classList.add('smd-component', randomType);

        // Adiciona variação de cor para capacitores
        if (randomType === 'smd-capacitor' && Math.random() > 0.5) {
            component.classList.add('blue');
        }

        let sizeW, sizeH;
    if (randomType === 'smd-ic') { sizeW = Math.random() * 18 + 18; sizeH = sizeW; } 
    else if (randomType === 'smd-diode') { sizeW = Math.random() * 8 + 8; sizeH = sizeW * 0.5; }
    else { sizeW = Math.random() * 10 + 7; sizeH = sizeW * 0.5; }

        component.style.width = `${sizeW}px`;
        component.style.height = `${sizeH}px`;
        component.style.left = `${Math.random() * 100}%`;
        component.style.zIndex = Math.floor(Math.random() * 10); // Adiciona profundidade
        component.style.opacity = Math.random() * 0.7 + 0.3; // Opacidade aleatória para profundidade

    const duration = Math.random() * 10 + 10; // levemente mais rápido
        const delay = -(Math.random() * duration); 
        component.style.setProperty('--start-rot', `${Math.random() * 360}deg`); // Rotação inicial
        component.style.setProperty('--end-rot', `${Math.random() * 720 - 360}deg`); // Rotação final

        component.style.animationDuration = `${duration}s`;
        component.style.animationDelay = `${delay}s`;
        fragment.appendChild(component); // Adiciona ao container temporário
    }
    animationContainer.appendChild(fragment); // Adiciona todos de uma só vez ao DOM

    // Layout agora é centrado apenas com CSS responsivo (sem escala JS)

    // Lógica do Formulário
    const formError = document.getElementById('formError');

    function showError(msg) {
        if (!formError) { alert(msg); return; }
        formError.textContent = msg;
        formError.classList.add('show');
        formError.style.display = 'block';
        formError.setAttribute('tabindex', '-1');
        formError.focus();
    }

    function clearError() {
        if (!formError) return;
        formError.textContent = '';
        formError.classList.remove('show');
        formError.style.display = 'none';
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        const username = usernameInput.value;
        const password = passwordInput.value;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        clearError();
        submitButton.disabled = true;
        submitButton.textContent = 'Entrando...';
        try {
            const url = API_BASE_URL ? `${API_BASE_URL}/api/auth/login` : `/api/auth/login`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) { 
                const msg = data && data.error ? data.error : 'Erro ao autenticar. Verifique usuário e senha.';
                throw new Error(msg);
            }

            // O backend agora retorna apenas os dados do usuário e define o cookie HttpOnly.
            // Armazenamos apenas os metadados do usuário (não sensíveis) localmente para controle de UI.
            if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

            // Lógica de Redirecionamento Baseada na Função (Role)
            switch (data.user.role) {
                case 'admin':
                    window.location.href = 'admin.html';
                    break;
                case 'reparo':
                    window.location.href = 'reparo.html';
                    break;
                case 'qualidade':
                    window.location.href = 'relatorio-qualidade.html';
                    break;
                case 'almoxarifado':
                    window.location.href = 'almoxarifado.html';
                    break;
                case 'operator':
                default:
                    window.location.href = 'index.html';
                    break;
            }
        } catch (error) {
            showError(`Falha no login: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });

    // Alternância de exibição de senha (olho/macaquinho)
    if (togglePassword && passwordInput) {
        const eyeIcon = document.getElementById('eyeIcon');
        const monkeyIcon = document.getElementById('monkeyIcon');

        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (eyeIcon) eyeIcon.style.display = isPassword ? 'none' : 'inline';
            if (monkeyIcon) monkeyIcon.style.display = isPassword ? 'inline' : 'none';
        });
    }
});