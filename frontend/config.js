// frontend/config.js
// Define uma variável global `window.API_BASE_URL` quando não definida.
// Em desenvolvimento local, aponta para http://localhost:3001 por convenção.
(function(){
    try {
        if (!window.API_BASE_URL) {
            const host = window.location.hostname || '';
            if (host === '127.0.0.1' || host === 'localhost') {
                window.API_BASE_URL = 'http://' + host + ':3001';
            } else {
                // Em produção, deixe vazio por padrão — o código poderá usar caminhos relativos
                window.API_BASE_URL = '';
            }
        }
    } catch (e) {
        // Não quebre a página se algo inesperado acontecer
        console.warn('[config] falha ao definir API_BASE_URL', e && e.message);
    }
})();
