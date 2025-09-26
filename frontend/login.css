/* 📁 login.css (VERSÃO ATUALIZADA E PADRONIZADA) */

@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');

/* USA AS MESMAS VARIÁVEIS GLOBAIS DO style.css */
:root {
    --bg: #0f172a;
    --panel: #1e293b;
    --text: #e5e7eb;
    --text-dim: #94a3b8;
    --primary: #22c55e; /* Cor principal padronizada */
    --border-color: #334155;
    --metal-contact: #aeb2b5;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: 'Roboto', sans-serif;
    background-color: var(--bg);
    color: var(--text);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
}

#animation-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
.smd-component { position: absolute; top: -50px; opacity: .6; animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; }
.smd-resistor { background: linear-gradient(to right, var(--metal-contact) 15%, #1a1a1a 15%, #1a1a1a 85%, var(--metal-contact) 85%); }
.smd-capacitor { background: linear-gradient(to right, var(--metal-contact) 15%, #6d4c41 15%, #6d4c41 85%, var(--metal-contact) 85%); }
@keyframes fall {
    from { transform: translateY(0) rotate(0deg); }
    to { transform: translateY(105vh) rotate(360deg); }
}

.logo-svg-container { margin: 0 auto 10px auto; width: 150px; }
.logo-svg-container .icon-shape { fill: var(--panel); stroke: var(--primary); stroke-width: 8; }
.logo-svg-container .icon-code { stroke: var(--primary); filter: drop-shadow(0 0 8px hsla(145, 63%, 49%, 0.6)); } /* Ajustado para a cor primária */
.logo-svg-container .logo-text .dev-part { font-family: 'Roboto Mono', monospace; font-weight: 500; font-size: 28px; fill: var(--text); }
.logo-svg-container .logo-text .pratica-part { font-family: 'Poppins', sans-serif; font-weight: 400; font-size: 28px; fill: var(--primary); }

.login-container { z-index: 1; display: flex; flex-direction: column; width: 100%; max-width: 400px; padding: 20px; }
.login-card { background-color: rgba(30, 41, 59, .8); backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid var(--border-color); padding: 32px; box-shadow: 0 10px 30px rgba(0, 0, 0, .3); }
.card-header { text-align: center; margin-bottom: 24px; }
.card-header h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-top: 0; }
.card-header p { color: var(--text-dim); font-size: 14px; margin-top: 4px; } /* Ajustado para uma cor mais neutra */

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; color: var(--text-dim); font-size: 14px; }
.form-group input {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background-color: var(--bg);
    color: var(--text);
    font-size: 16px;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
}
.form-group input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3); /* Sombra de foco verde */
}

.btn-login {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background-color: var(--primary); /* Cor principal padronizada */
    color: #000; /* Texto escuro para melhor contraste com o verde */
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color .2s;
}
.btn-login:hover { background-color: #16a34a; }

.admin-login { text-align: center; margin-top: 24px; }
.admin-login a { color: var(--text-dim); font-size: 13px; text-decoration: none; }
.admin-login a:hover { text-decoration: underline; color: var(--text); }

.login-footer { text-align: center; margin-top: 32px; color: var(--text-dim); }
.login-footer p { font-size: 12px; }
.logo-footer { font-size: 16px; font-weight: 900; color: #4b5563; letter-spacing: -.5px; margin-top: 4px; }

.password-wrapper { position: relative; display: flex; align-items: center; }
.password-wrapper input { padding-right: 40px; }
.toggle-password { position: absolute; right: 12px; cursor: pointer; user-select: none; opacity: .7; }