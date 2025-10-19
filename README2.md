# Controle de Falhas AOI — README2

Este README2 documenta o projeto de forma prática e detalhada: arquitetura, como executar localmente, onde o banco é salvo, tabelas principais, endpoints importantes, e dicas para deploy e segurança.

## Visão Geral

- Projeto: Controle de Falhas AOI — aplicação full‑stack para registro de defeitos detectados por AOI, gestão de usuários, requisições de almoxarifado e relatórios.
- Stack:
  - Backend: Node.js + Express
  - DB: SQLite (dev) / PostgreSQL (prod)
  - Frontend: HTML/CSS/JS estático (Tailwind opcional via `frontend/react-examples`)

## Estrutura do repositório (resumo)

- `/backend` — código do servidor Express, inicialização do DB e scripts.
  - `server.js` — arquivo principal do servidor (inicia DB, define rotas, serve frontend).
  - `database.js` — bootstrap do SQLite (arquivo `aoi.db`) e função `initializeDatabase()`.
  - `package.json` — scripts (`npm run dev`, `npm start`) e dependências.
  - `aoi.db` — arquivo SQLite criado automaticamente em desenvolvimento (no mesmo diretório `backend`).
- `/frontend` — arquivos estáticos (HTML/JS/CSS). Páginas principais: `login.html`, dashboards, relatórios, etc.
- `README.md` — documento original com instruções resumidas de execução e deploy.
- `README2.md` — este arquivo (narrativa expandida e técnica).

## Onde o banco é salvo (detalhes importantes)

- Em desenvolvimento (padrão): SQLite. O backend carrega `backend/database.js` que abre uma conexão em:

  - `backend/aoi.db` — arquivo SQLite na pasta `backend`.

  Esse arquivo é criado automaticamente na primeira execução do servidor (após `initializeDatabase()`), e contém as tabelas usadas pela aplicação (users, registros, requisicoes, etc.).

- Em produção (ou se `DATABASE_URL` estiver definido): PostgreSQL. Quando `process.env.DATABASE_URL` estiver presente, o `server.js` conecta via `pg` (Pool) e cria/tenta garantir as tabelas equivalentes em PostgreSQL.

- Comportamento resumido do `server.js` quanto ao DB:
  - Se `NODE_ENV === 'production'` e `DATABASE_URL` presente → conecta ao PostgreSQL com SSL (Render padrão).
  - Else if `DATABASE_URL` presente (mas não produção) → conecta ao PostgreSQL local sem SSL.
  - Else → usa o módulo `backend/database.js` (SQLite) e o arquivo `backend/aoi.db`.

## Esquema (tabelas principais)

As tabelas são criadas automaticamente (SQLite ou PostgreSQL). Resumo das tabelas mais importantes:

- `users`
  - id (PK)
  - name
  - username (unique)
  - password_hash
  - role (admin | operator | reparo | qualidade | almoxarifado)

- `registros`
  - id (string PK)
  - om (string)
  - qtdlote (integer)
  - serial
  - designador
  - tipodefeito
  - pn
  - descricao
  - obs
  - createdat (timestamp/text)
  - status
  - operador

- `requisicoes`
  - id (auto-increment / serial)
  - om
  - items (TEXT in SQLite / JSONB in Postgres)
  - status
  - created_at
  - created_by

- `oms_finalizadas` (criada dinamicamente pelo servidor para persistir OMs finalizadas)
  - omNumber (PK)
  - startTime (int ms epoch)
  - endTime (int ms epoch)
  - pausedTime (int ms total pause in ms)
  - qtdlote (integer)

Observação: em SQLite o campo `items` em `requisicoes` é armazenado como texto contendo JSON; em PostgreSQL usa `JSONB`.

## Endpoints importantes (resumo prático)

- Autenticação
  - POST /api/auth/login — recebe { username, password } → retorna { token, user }

- Usuários (admin)
  - GET /api/users
  - POST /api/users
  - PUT /api/users/:id
  - DELETE /api/users/:id

- Registros (defeitos)
  - GET /api/registros
  - POST /api/registros
  - POST /api/registros/batch
  - PUT /api/registros/:id
  - PUT /api/registros/:id/status
  - DELETE /api/registros
  - DELETE /api/registros/demo

- Requisições (almoxarifado)
  - POST /api/requisicoes
  - GET /api/requisicoes
  - PUT /api/requisicoes/:id/status
  - PUT /api/requisicoes/:id/itens
  - DELETE /api/requisicoes/:id
  - DELETE /api/requisicoes/demo

- OM lifecycle (persistência em memória + gravação de finalizadas em DB)
  - POST /api/om/start — corpo { omNumber }
  - PUT /api/om/pause — corpo { omNumber }
  - PUT /api/om/resume — corpo { omNumber }
  - PUT /api/om/finalizar — corpo { omNumber }
  - GET /api/om/:omNumber — retorna status e elapsed
  - GET /api/om/relatorio — lista OMs finalizadas com tempo e defeitos

- Relatórios / utilitários
  - GET /api/relatorio-falhas — agrupa falhas por OM
  - (Dev) GET /api/debug/* — rotas de debug/seed (somente em dev)
  - (Opcional/Dev) GET /__frontend_path — endpoint adicionado para diagnosticar qual pasta frontend está sendo servida

## Configuração de ambiente (variáveis)

Principais variáveis no `backend/.env` (ou no painel do Render):

- NODE_ENV — `production` ou `development` (se não setado, é dev)
- PORT — porta do servidor (default 3000)
- JWT_SECRET — segredo para tokens JWT (obrigatório em produção)
- DATABASE_URL — string de conexão PostgreSQL (se presente, usa Postgres)
- CORS_ORIGIN — lista de origens permitidas em produção (se não definido, app retorna erro em produção)
- EXPOSE_LOGS — se true e requisição local, permite expor arquivos `.log` (apenas dev)
- DEMO_AUTO_PURGE_DAYS — número de dias para purgar registros DEMO automaticamente
- DEV_SEED_KEY — chave para rotas de seed/dev

## Rodando localmente (passo a passo – PowerShell)

1) Instalar dependências do backend
```powershell
npm --prefix .\backend install
```

2) Iniciar backend (modo dev com nodemon)
```powershell
cd .\backend
npm run dev
```
- Saída esperada: "Servidor rodando na porta 3000/3001 (acessível na rede local)" e mensagens confirmando `Ambiente de desenvolvimento detectado. Usando SQLite.`
- O arquivo `backend/aoi.db` será criado automaticamente.

3) Abrir o frontend no navegador
- Por conveniência, o servidor já serve os arquivos estáticos (`/frontend`) quando o backend está rodando. Abra:
  - http://localhost:3001/login.html  (ou http://localhost:3000/login.html conforme PORT)
- Se preferir servir o frontend separadamente (por exemplo com `http-server`), aponte para a pasta `frontend/`.

4) Primeiro login (dev)
- Usuário: DevAdmin
- Senha: 123456
- Caso prefira, use as rotas de seed em `/api/debug/seed-admin?key=local-dev-2024` para criar o admin.

## Notas sobre persistência de OM e pausas

- O mecanismo de OM (start/pause/resume/finalizar) mantém o estado em memória (`const oms = {}`) durante a execução do servidor.
- Quando uma OM é finalizada, uma função grava um resumo em `oms_finalizadas` (tabela criada se necessário) usando `dbRun` — portanto, OMs finalizadas ficam persistidas no banco (SQLite ou Postgres) mesmo após reinício.
- A granularidade de pausas é tratada em memória (startTime, pausedTime, pauseStartedAt) e o total de pausa é somado no momento da finalização e salvo em `oms_finalizadas.pausedTime`.

## Perguntas operacionais para você (decisões a tomar)

1. Você quer manter um único banco para toda a aplicação (users, registros, requisicoes, oms_finalizadas) — padrão atual — ou separar bancos por serviço (microserviços) ou por ambiente (ex.: um DB apenas para relatórios)?
2. Prefere usar SQLite localmente (arquivo `backend/aoi.db`) e PostgreSQL apenas em produção? Ou deseja configurar PostgreSQL local também (definindo `DATABASE_URL`)?
3. Quer que eu aplique um middleware extra que bloqueia acesso a arquivos `.log`? (Já existe lógica para isso, mas posso reforçar.)

## Segurança e boas práticas

- Nunca comitar `aoi.db` ou `.env` com credenciais no repo. Adicione `backend/aoi.db` e `backend/.env` ao `.gitignore` se ainda não estiverem.
- Em produção, defina uma `JWT_SECRET` forte e uma lista estrita em `CORS_ORIGIN`.
- Considere backups periódicos do banco Postgres (se usar Postgres). Para SQLite, o arquivo `aoi.db` pode ser copiado, mas cuidado com consistência e locks.
- Faça migrações de schema versionadas se planeja evoluir o modelo (ex.: usar um diretório `migrations/` e `node-pg-migrate` ou `knex`).

## Operações de manutenção

- Fazer dump do SQLite (backup): pare o servidor e copie `backend/aoi.db` para um local seguro.
- Para PostgreSQL: use `pg_dump`/`pg_restore` conforme a necessidade.

### Exportar o SQLite rapidamente

Existem duas formas convenientes de exportar uma cópia do banco SQLite local:

1) Usando o script incluído (local):

```powershell
# Executa o script que copia backend/aoi.db para backend/aoi-export-<timestamp>.db
npm --prefix .\backend run export:sqlite
```

2) Via endpoint HTTP (admin only):

```
GET /api/admin/export-sqlite
Authorization: Bearer <TOKEN_ADMIN>
```

Esse endpoint só está disponível quando o servidor estiver usando SQLite local (ou seja, sem `DATABASE_URL`). Ele exige autenticação JWT de um usuário com role `admin` e retorna o arquivo .db como um download. Internamente o servidor cria uma cópia temporária e faz stream para o cliente.

## Arquitetura futura (opções)

- Se for crescer o sistema, recomendo mover para PostgreSQL em todos os ambientes e introduzir migrações e testes automatizados.
- Separar o serviço de relatórios (leitura intensiva) pode ajudar a manter o banco de produção enxuto; relatórios podem ser gerados a partir de um replica/ETL.

---

Se quiser, eu ajusto este README2 com exemplos de comandos PowerShell específicos para backup/restore do SQLite, scripts para dump/restore do Postgres, ou adiciono um arquivo `scripts/` com utilitários para exportar dados. Também posso aplicar mudanças no código (ex.: reforçar bloqueio de .log, adicionar endpoint para export CSV de pausas, criar uma rota para baixar `aoi.db` localmente apenas para admins) — diga o que prefere.
