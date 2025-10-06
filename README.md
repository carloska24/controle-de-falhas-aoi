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

Instale e suba o servidor:

```powershell
npm --prefix "c:\Users\joaob\controle-de-falhas-aoi\backend" install
npm --prefix "c:\Users\joaob\controle-de-falhas-aoi\backend" run dev
```

O servidor sobe na porta 3000. Em primeiro run, as tabelas são criadas. 
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

## Configurações importantes
- Em produção (`NODE_ENV=production`), o servidor exige `JWT_SECRET` e um `CORS_ORIGIN` válido.
- Rotas de emergência ficam desativadas por padrão e nunca habilitam em produção.

## Scripts backend
- `npm run start` — inicia server
- `npm run dev` — inicia com nodemon e dotenv/config

## Melhorias sugeridas
- Rate limiting em autenticação
- Validação de entrada com Zod/express-validator
- Logs estruturados e auditoria de alterações
- Testes automatizados (unit/integration)
