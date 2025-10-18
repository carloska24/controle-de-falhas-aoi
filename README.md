# Controle de Falhas AOI

Aplicação full-stack para registro de defeitos AOI, gestão de usuários e fluxo de requisições de almoxarifado.

## Stack
- Backend: Node.js, Express 5, JWT, bcrypt
- DB: PostgreSQL (produção) / SQLite (dev) com auto-provisionamento
- Frontend: HTML/CSS/JS puro

## Rodar localmente (Windows PowerShell)

1) Backend
- Copie `.env.example` para `backend/.env` e ajuste se necessário.
- Se quiser usar SQLite (mais simples), deixe `DATABASE_URL` vazio.
- Se for usar PostgreSQL local, defina `DATABASE_URL` (ex.: `postgres://user:pass@localhost:5432/aoi`).

## Sequência ideal (PowerShell):

- Verifique a versão do Node/NPM (Node v18+ recomendado):

```powershell
node -v
npm -v
```

- Instale dependências do backend (executar a partir da raiz do repo):

```powershell
npm --prefix .\backend install
```

- Inicie o backend em modo dev (nível de desenvolvimento):

```powershell
npm --prefix .\backend run dev
```

- O servidor local usa por padrão SQLite em dev e normalmente sobe na porta 3001.
	Após iniciar, verifique o healthcheck:

```powershell
# Testa health endpoint
Invoke-RestMethod -Uri http://localhost:3001/health
```

Em primeiro run, as tabelas são criadas automaticamente.
- Em SQLite, um admin local é semeado automaticamente: `DevAdmin` / `123456`.
- Em PostgreSQL local, se não houver usuários, também é criado.

2) Frontend

Servir a pasta `frontend` em http://127.0.0.1:5500:

```powershell
npx http-server "c:\Users\joaob\controle-de-falhas-aoi\frontend" -p 5500 -c-1
```

Acesse `http://127.0.0.1:5500/login.html` e entre com:
- Usuário: `DevAdmin`
- Senha: `123456`

## Deploy (Render + Netlify)

Este repo está pronto para:
- Backend (API) no Render (Node Service)
- Frontend (estático) no Netlify (deploy de `frontend/`)

### Netlify (frontend)
1. Conecte o repo no Netlify e selecione o branch `main`.
2. O arquivo `netlify.toml` já define:
	- `publish = "frontend"`
	- `command = ""` (SPA estática, sem build)
3. Com “Auto publishing” ON, todo push em `main` publica automaticamente.

### Render (backend)
1. Crie um serviço “Web Service” Node e conecte a este repositório (branch `main`).
2. Defina variáveis de ambiente (em Settings → Environment):
	- `NODE_ENV=production`
	- `JWT_SECRET` (obrigatório)
	- `CORS_ORIGIN=https://SEU-SITE.netlify.app` (adicione múltiplos separados por vírgula)
	- `DATABASE_URL` (PostgreSQL do Render)
	- (Opcional) `DEMO_AUTO_PURGE_DAYS=7` para purga automática de DEMO antigos
3. Habilite “Auto Deploy” para que cada push publique automaticamente.
4. Teste saúde em: `https://SEU-SERVICO.onrender.com/health`.

### Após um push
- Netlify: acompanhe Deploys até ficar “Published”.
- Render: verifique se o novo deploy foi feito (ou clique em “Manual Deploy”).
- Teste o fluxo: abra o site do Netlify, faça login e confira chamadas para a API do Render sem erro de CORS.

### Dicas de produção
- Em produção, `JWT_SECRET` não pode usar o valor padrão.
- Garanta que todos os domínios clientes estejam em `CORS_ORIGIN`.
- Para limpar dados DEMO ao deslogar admin, o frontend chama `POST /api/admin/logout`.

## Configurações importantes
- Em produção (`NODE_ENV=production`), o servidor exige `JWT_SECRET` e um `CORS_ORIGIN` válido.
- Rotas de emergência ficam desativadas por padrão e nunca habilitam em produção.

## Scripts backend
- `npm run start` — inicia server
- `npm run dev` — inicia com nodemon e dotenv/config

## Build do CSS Tailwind (frontend/react-examples) — PowerShell

Se você quiser gerar o CSS localmente (útil para desenvolvimento do demo de botões):

1. Abra PowerShell e entre na pasta `frontend/react-examples`:

```powershell
cd C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\frontend\react-examples
```

2. Instale dependências (se ainda não instalou):

```powershell
npm install
```

3. Gerar o CSS uma vez:

```powershell
npm run build:css
```

4. Para desenvolvimento em tempo real (recompila ao salvar):

```powershell
npm run watch:css
```

O arquivo gerado ficará em `frontend/react-examples/dist/output.css`. O demo `frontend/tailwind-buttons.html` já está apontando para esse arquivo local.

## Melhorias sugeridas
- Rate limiting em autenticação
- Validação de entrada com Zod/express-validator
- Logs estruturados e auditoria de alterações
- Testes automatizados (unit/integration)
