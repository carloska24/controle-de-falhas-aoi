# Fluxo do Sistema — Controle de Falhas AOI

Este documento descreve o fluxo atual da aplicação "Controle de Falhas AOI" — do ponto de vista do frontend, backend, regras de negócio, páginas e endpoints. Serve como referência para desenvolvedores e para alinhar mudanças futuras.

Data: 2025-10-19

## Sumário
- Visão Geral
- Stack e arquivos importantes
- Autenticação e papéis
- Fluxo principal (login → registro de falhas → requisições → fechamento de OM)
- Páginas do frontend e responsabilidades
- Endpoints principais do backend
- Regras de negócio importantes
- Seeds, debug e diferenças Dev/Prod
- Segurança e recomendações

---

## Visão Geral

A aplicação é um sistema full‑stack para registrar defeitos detectados por AOI (Automated Optical Inspection), gerenciar usuários e gerar requisições de almoxarifado. Tem uma UI estática (HTML/CSS/JS puros) em `frontend/` e um backend Node.js/Express em `backend/`. Em dev usa SQLite; em produção habitualmente usa PostgreSQL.

O fluxo típico: usuário faz login → registra falhas enquanto opera OMs → cria requisições de materiais a partir de registros → almoxarifado processa requisições → OM é finalizada e relatórios gerados.

## Stack e arquivos importantes

- Backend: Node.js, Express 5, bibliotecas: `bcrypt`, `jsonwebtoken`, `zod`, `express-rate-limit`, `pg` (Postgres), `sqlite3` (SQLite). Arquivo principal: `backend/server.js`.
- Frontend: HTML/CSS/JS puro. Entradas importantes: `frontend/login.html`, `frontend/index.html`, `frontend/admin.html`, `frontend/almoxarifado.html`, `frontend/reparo.html`, `frontend/relatorio-*.html`.
- Config dev/prod: `backend/.env` (não commitado) e `frontend/config.js` (adicionado nesta branch para centralizar `API_BASE_URL`).

## Autenticação e papéis

- Autenticação: JWT (token gerado pelo backend em `/api/auth/login`). Frontend armazena token em `localStorage` (`authToken`) e usuário em `localStorage.user`.
- Papéis (roles): `admin`, `operator`, `reparo`, `qualidade`, `almoxarifado`.
  - `admin`: acesso completo — ver/editar/gerenciar usuários, semear DevAdmin, limpar DEMO, exportar SQLite, logout-admin que limpa dados DEMO.
  - `operator`: registrar falhas, criar requisições (via UI principal), ver relatórios limitados.
  - `reparo`: páginas e relatórios focados em reparo (p.ex., `reparo.html`).
  - `qualidade`: ver relatórios de qualidade (`relatorio-qualidade.html`).
  - `almoxarifado`: criar/atualizar requisições e marcar itens entregues (`almoxarifado.html`).

No backend há middlewares `authenticateToken`, `isAdmin` e `hasRole(...)` que aplicam autorização nas rotas.

## Fluxo principal (passo a passo)

1. Login
   - Página: `frontend/login.html` com `frontend/login.js`.
   - Requisição: POST `/api/auth/login` (body: `{ username, password }`).
   - Resposta: `{ token, user }`. Frontend salva o token e redireciona conforme `user.role`.

2. Página principal / Registro de falhas
   - Página de registro: normalmente `index.html` ou páginas específicas de captura.
   - Fluxo: usuário preenche formulário de registro (campos: `id`, `om`, `qtdlote`, `serial`, `designador`, `tipodefeito`, `pn`, `descricao`, `obs`, `createdat`, `status`, `operador`) e envia ao backend via POST `/api/registros`.
   - Backend valida via Zod (`registroCreateSchema`). Regras: OMs DEMO (`om` iniciando com `DEMO-`) só podem ser criadas por admin.

3. Batch de registros
   - Endpoint: POST `/api/registros/batch` aceita array de registros e insere em transação.

4. Criação de requisições (Almoxarifado)
   - Endpoint: POST `/api/requisicoes` com body `{ registroIds: string[] }`.
   - Lógica de agregação: backend busca registros por IDs, agrupa por OM, depois agrega por PN+descrição. Se `designador` tiver múltiplos designadores separados por vírgula, soma a quantidade e adiciona designadores na descrição entre parênteses.
   - Resultado: cria uma requisição por OM com `items: [{ pn, descricao, quantidade_requisitada, quantidade_entregue }]`.

5. Gestão de requisições
   - Listar: GET `/api/requisicoes` (admin vê tudo; outros veem sem `DEMO-%`).
   - Atualizar status: PUT `/api/requisicoes/:id/status` (roles `admin` e `almoxarifado`).
   - Atualizar itens: PUT `/api/requisicoes/:id/itens` para ajustar `quantidade_entregue` e recalcular status (`pendente`, `parcialmente_entregue`, `entregue`).

6. OM (Operação de Montagem) — timers e finalização
   - Endpoints para controlar OM em memória: POST `/api/om/start`, PUT `/api/om/pause`, PUT `/api/om/resume`, PUT `/api/om/finalizar`.
   - O estado é mantido em memória (`oms` object) e quando finalizada a OM é gravada em tabela `oms_finalizadas` com `omNumber`, start/end/pausedTime e `qtdlote`.

7. Relatórios
   - `GET /api/relatorio-falhas` — agrupa registros por OM com campos necessários para relatório de inspeção.
   - `GET /api/om/relatorio` — retorna OMs finalizadas e tempo/defeitos.

8. Administração (admin)
   - Gestão de usuários: GET `/api/users`, POST `/api/users`, PUT `/api/users/:id`, DELETE `/api/users/:id` (protegidas por `isAdmin`).
   - Debug/seed: endpoints em dev (p.ex. `/api/debug/seed-admin`) e uma rota de reset em `/api/setup/initial-admin` que está condicionada a `ENABLE_EMERGENCY_ROUTES` e `!isProduction`.

## Páginas do frontend (resumo)

- `login.html` — autenticação; armazena token e redireciona por role.
- `index.html` — página principal de registro/visualização (operador) — formulário de registro e listagem de registros.
- `admin.html` — painel de administração: criação de usuários, edição inline, reset de senha, exclusão. Usei DOM APIs para evitar XSS e adicionei modal para confirmações.
- `almoxarifado.html` — criar/listar requisições, atualizar itens/status.
- `reparo.html` — fluxo de reparo (páginas específicas para reparo de itens).
- `relatorio-*.html` — páginas para relatórios (inspeções, qualidade, reparo, etc.).
- `frontend/react-examples/` — exemplos e build do Tailwind (uso local para botões e utilitários).

Arquivos úteis:
- `frontend/login.js`, `frontend/admin.js`, `frontend/utils.js` (helpers), `frontend/style.css`.

## Endpoints principais (resumo)

- Auth: POST `/api/auth/login`.
- Users: GET `/api/users`, POST `/api/users`, PUT `/api/users/:id`, DELETE `/api/users/:id`.
- Registros: GET `/api/registros`, POST `/api/registros`, POST `/api/registros/batch`, PUT `/api/registros/:id`, PUT `/api/registros/:id/status`, DELETE `/api/registros` (deleta por ids), DELETE `/api/registros/demo`.
- Requisições: POST `/api/requisicoes`, GET `/api/requisicoes`, PUT `/api/requisicoes/:id/status`, PUT `/api/requisicoes/:id/itens`, DELETE `/api/requisicoes/:id`, DELETE `/api/requisicoes/demo`.
- OM: POST `/api/om/start`, GET `/api/om/:omNumber`, PUT `/api/om/pause`, PUT `/api/om/resume`, PUT `/api/om/finalizar`, GET `/api/om/relatorio`.
- Relatórios: GET `/api/relatorio-falhas`.
- Admin utilities: GET/POST `/api/debug/*` (seed, list users), POST `/api/admin/logout` (limpa DEMO quando admin faz logout), GET `/api/admin/export-sqlite`.

## Regras de negócio importantes

- Registros DEMO (OM começando com `DEMO-`) podem ser semeados via rotas debug. Apenas `admin` pode criar registros com `om` iniciando por `DEMO-` através das rotas normais.
- Ao criar requisições a partir de registros, o backend agrupa por OM e agrega itens por PN + descrição. Designadores separados por vírgula somam quantidade.
- Exclusão de usuários impede que um admin exclua a si mesmo (checado no backend).
- Validação é feita com Zod em muitas rotas (login, userCreate, registroCreate, requisicaoItens, etc.).

## Seeds, debug e diferenças Dev/Prod

- Em dev (SQLite), o backend auto-provisiona tabelas e pode semear `DevAdmin/123456` se não existirem usuários.
- Em produção, `NODE_ENV=production` exige `JWT_SECRET` e geralmente `CORS_ORIGIN`. Rotas de emergência são bloqueadas por padrão.
- Rotas de debug (e.g., `/api/debug/seed-admin`) estão protegidas por chaves (`DEV_SEED_KEY`) e rate limiter.

## Segurança — Observações e recomendações

- Atualmente o frontend salva JWT em `localStorage`. Isso é simples, mas vulnerável a XSS. Alternativa mais segura: usar cookie HttpOnly+SameSite e adaptar backend para setar cookie no login.
- O backend tem diversos endpoints de debug/seed/maintenance — garantir que `ENABLE_EMERGENCY_ROUTES` e chaves estejam corretamente configurados e que `NODE_ENV=production` bloqueie tudo.
- Há um middleware que bloqueia pedidos a arquivos `.log` por padrão — bom para evitar exposição de logs via static serve.
- Recomendações imediatas:
  1. Não expor rotas debug em produção (verificação automática via `NODE_ENV`).
  2. Mudar token para cookie HttpOnly se possível (requer infra/alturas CORS/HTTPS).
  3. Escapar/usar DOM APIs no frontend (já aplicado ao admin table).
  4. Implementar testes básicos e CI para proteger mudanças.

## Padrões operacionais e deploy

- Frontend pode ser servido como estático (Netlify) apontando para `/frontend` (netlify.toml já aponta `publish = "frontend"`).
- Backend tipicamente deploya no Render (serviço Node) com `DATABASE_URL` e variáveis: `JWT_SECRET`, `CORS_ORIGIN`, `DEMO_AUTO_PURGE_DAYS`.
- Para desenvolvimento local recomenda-se usar SQLite (deixar `DATABASE_URL` vazio) e rodar: `npm --prefix .\backend install` e `npm --prefix .\backend run dev`.

## Próximos passos sugeridos (priorizados)

1. Hardening backend: desabilitar rotas debug/seed em produção e garantir checagens de env (alto impacto).
2. Mudar armazenamento de token para cookie HttpOnly (médio-alto esforço) — PoC e documentação necessária.
3. Testes automatizados (Jest/jsdom + supertest para API) e pipeline CI.
4. Melhorias UX: modais (já implementado no admin), loader em botões, validações ao editar/cadastrar.

---

Se algo aqui não refletir o comportamento que você espera, diga quais pontos preciso ajustar e eu atualizo este documento. Posso também transformar isto em um README mais curto ou em tarefas/PRs para implementar cada alteração.
