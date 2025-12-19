const express = require('express');
const router = express.Router();
// OMs tem rotas publicas e autenticadas, no codigo original muitas eram publicas (post/put) ou nao usavam middleware
// Vou manter o padrao, mas idealmente deveriam ser autenticadas.
// Rotas de start/pause/resume/finish usam POST/PUT
// Rotas de relatorio usam GET

const omController = require('../controllers/omController');
const { authenticateToken } = require('../middleware/auth');

// Funcional
router.post('/start', omController.startOM);
router.get('/:omNumber', omController.getOM); // Este conflita com /finalizadas se nao for especifico.
// Mas no server.js original:
// /api/om/start
// /api/om/:omNumber
// /api/om/pause
// ...
// /api/oms/finalizadas é outro endpoint.
// Vou remapear aqui para ficar clean, mas mantendo compatibilidade com o frontend
// O frontend chama /api/om/:omNumber
// Entao precisamos cuidar da ordem.

router.put('/pause', omController.pauseOM);
router.put('/resume', omController.resumeOM);
router.put('/finalizar', omController.finishOM);

// Relatorios e Infos Extras
// Nota: no server.js era /api/om-time/:omNumber agora sera /api/om/time/:omNumber se eu montar router em /api/om
// OU manter rotas separadas no server.js.
// Para facilitar, vou exportar roteadores diferentes ou montar tudo em /api se eu quiser ser purista.
// Mas o padrao REST é /api/om e /api/relatorios.
// O server.js tinha uma mistura.

// Vou criar um router apenas para /api/om
// E exportar funcoes isoladas se necessario, ou mover tudo.
// As rotas de relatorio estavam em /api/relatorio-falhas e /api/om/relatorio

module.exports = router;
