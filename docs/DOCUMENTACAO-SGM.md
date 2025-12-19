# Documentação Geral do Sistema SGM (Controle de Falhas AOI)

> **Objetivo:** Este documento descreve em detalhes a arquitetura, componentes, fluxos funcionais e pontos de integração do sistema SGM — composto pelo backend Express/SQLite/PostgreSQL e pelo frontend Next.js. Serve como referência única para desenvolvedores, analistas e equipes de suporte.

---

## 1. Visão Geral

- **Nome interno:** Sistema de Gestão de Manufatura (SGM) – Controle de Falhas AOI.
- **Pilares principais:**
  - Registro e acompanhamento de falhas detectadas na inspeção ótica automatizada (AOI).
  - Gestão de OMs (Ordens de Montagem) com controle de tempo de inspeção.
  - Workflow de reparos e solicitações ao almoxarifado.
  - Painéis administrativos, relatórios de qualidade e métricas operacionais.
- **Tecnologias chave:**
  - **Backend:** Node.js 18+, Express, SQLite (desenvolvimento) ou PostgreSQL (produção), JWT + cookies HttpOnly.
  - **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Chart.js.
  - **Autenticação:** Cookies HttpOnly (`aoi_token`), JWT, controle de papéis (admin, operator, reparo, qualidade, almoxarifado).

---

## 2. Estrutura de Pastas do Repositório

```
controle-de-falhas-aoi/
├── backend/                # API Express, banco de dados e scripts de manutenção
│   ├── server.js           # Entrada principal da API
│   ├── database.js         # Inicialização do SQLite
│   ├── cache.js            # Cache em memória para relatórios
│   ├── queries/            # Consultas SQL utilitárias
│   ├── scripts/            # Scripts Node/PowerShell de manutenção e administração
│   ├── bin/                # Automação de bootstrap e simulações
│   └── logs/               # Logs persistidos (protegidos em produção)
├── nextjs-frontend/        # Aplicação Next.js (App Router)
│   ├── app/                # Rotas e páginas (login, index, admin, reparo, etc.)
│   ├── components/         # Componentes reutilizáveis (UI, admin, index, etc.)
│   ├── hooks/              # Hooks customizados (ex.: `useToast`)
│   ├── lib/api.ts          # Cliente para comunicação com o backend
│   ├── types/              # Tipagem compartilhada entre páginas
│   └── public/             # Assets estáticos (sons, imagens)
├── docs/                   # Guias operacionais, históricos e esta documentação
├── scripts/                # Automação de setup local/produção
└── INICIAR-*.bat           # Atalhos para execução rápida de serviços
```

---

## 3. Backend Express (`backend/`)

### 3.1. Arquitetura

- **Entrada:** `server.js` — concentra configuração de middleware, rotas e inicialização de banco.
- **Banco de dados:**
  - **Desenvolvimento padrão:** SQLite (`aoi.db`) com inicialização automática via `database.js`.
  - **Produção/Render:** Suporte a PostgreSQL via variável `PG_CONNECTION_STRING` ou `DATABASE_URL`.
  - Migrações básicas gerenciadas no startup (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN`).
- **Autenticação:** JWT armazenado em cookie HttpOnly (`aoi_token`). Rotas usam `authenticateToken` + middlewares `isAdmin`/`hasRole`.
- **CORS:** Dinâmico em desenvolvimento; produção exige `CORS_ORIGIN` (lista separada por vírgula).
- **Logs:** Middleware Morgan com controle de nível via `LOG_LEVEL` e `SILENCE_LOGS`. Proteção extra contra exposição de arquivos `.log`.
- **Cache:** `cache.js`, Map simples com TTL (60000 ms padrão), usado em relatórios.
- **Persistência Mista de OMs:** Estrutura `oms{}` em memória sincronizada com tabelas `oms_pausadas` e `oms_finalizadas`.

### 3.2. Principais Rotas

| Grupo                          | Endpoints                                                                                                                                                                                   | Descrição                                                                                                                | Autorização                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Debug / Seed (DEV)**         | `/api/debug/*`, `/api/setup/*`                                                                                                                                                              | Reset de admin, seed de registros, inspeções, limpeza de dados demo. Controladas por `DEV_SEED_KEY` ou flags ambientais. | Acessível apenas em `NODE_ENV !== 'production'`, protegido por chaves.            |
| **Autenticação**               | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`                                                                                                                         | Login com validação via Zod, armazenamento de token em cookie, verificação de usuário logado.                            | `login` aberto; demais exigem cookie/token.                                       |
| **Usuários**                   | `GET/POST /api/users`, `PUT/DELETE /api/users/:id`                                                                                                                                          | CRUD de usuários e redefinição de senhas.                                                                                | `admin`                                                                           |
| **Registros de Falhas**        | `GET /api/registros`, `POST /api/registros`, `POST /api/registros/batch`, `DELETE /api/registros`, `PUT /api/registros/:id/status`                                                          | CRUD completo, batch insert (demos), filtros e exclusões em lote.                                                        | Autenticado (admin/operator/reparo/qualidade), exclusões exigem papel autorizado. |
| **Relatórios**                 | `GET /api/relatorio-falhas`, `GET /api/om/relatorio`, `GET /api/relatorio-falhas/export`                                                                                                    | Consultas avançadas com filtros, paginação, cache opcional e exportação.                                                 | Autenticado.                                                                      |
| **OMs (Ordens de Montagem)**   | `POST /api/om/start`, `PUT /api/om/pause`, `PUT /api/om/resume`, `PUT /api/om/finalizar`, `GET /api/om/:omNumber`, `GET /api/oms`, `GET /api/oms/finalizadas`, `GET /api/om-time/:omNumber` | Controle de tempo em lotes, persistência de pausas e finalização com métricas.                                           | Autenticado.                                                                      |
| **Requisições (Almoxarifado)** | `POST /api/requisicoes`, `GET /api/requisicoes`, `PUT /api/requisicoes/:id/status`, `PUT /api/requisicoes/:id/itens`, `DELETE /api/requisicoes/:id`, `DELETE /api/requisicoes/demo`         | Geração a partir de registros, atualização por item, controle de status, limpeza de dados demo.                          | `hasRole('admin','almoxarifado','operator')` (varia por rota).                    |
| **Health & utilidades**        | `GET /health`, `GET /`                                                                                                                                                                      | Verificações e mensagem informativa.                                                                                     | Público.                                                                          |

### 3.3. Estruturas Persistidas

- **Tabela `users`**: `id`, `name`, `username`, `password_hash`, `role`.
- **Tabela `registros`**: chave string (`id`), `om`, `qtdlote`, `serial`, `designador`, `tipodefeito`, `pn`, `descricao`, `obs`, `prioridade`, `createdat`, `status`, `operador`.
- **Tabela `requisicoes`**: `id`, `om`, `items` (JSON/JSONB), `status`, `created_at`, `created_by`.
- **Tabelas `oms_pausadas` & `oms_finalizadas`**: `omNumber`, `startTime`, `endTime`, `pausedTime`, `pauseStartedAt`, `elapsedAtPause`, `qtdlote`.

### 3.4. Scripts e Utilitários

- **`bin/dev_start_and_export.ps1`**: startup e export.
- **`scripts/cleanup_*`**: limpeza de dados demo, OMs em memória, requisições obsoletas.
- **`scripts/legacy` e `scripts/extra`**: base histórica e automações raramente executadas.
- **`queries/`**: scripts Node com SQLs prontas (listar OMs, status, registros etc.), usados para manutenção ou análise.

### 3.5. Considerações de Segurança

- Em produção, exigido `JWT_SECRET` forte; fallback padrão só em dev.
- Cookies `COOKIE_SECURE=true` + `SameSite=None` quando HTTPS.
- Rotas de debug condicionadas a ambiente e chaves (`DEV_SEED_KEY`, `ENABLE_EMERGENCY_ROUTES`).
- Proteção anti-exposição de logs via middleware específico.

---

## 4. Frontend Next.js (`nextjs-frontend/`)

### 4.1. Arquitetura

- **App Router:** Pastas `app/<rota>/page.tsx` representam páginas (login, index, admin, reparo, almoxarifado, qualidade, relatórios).
- **Componentização PRO:** UI moderna com componentes especializados (ex.: `ProForm`, `ProTable`, `ProMetrics`, `ProQuality`).
- **Hooks customizados:** `useToast` para notificações animadas via Framer Motion.
- **Clientes:** `fetchAutenticado` centraliza chamadas à API com credenciais, manipula redirecionamentos em 401/403.
- **State Management:** Modelo local por página (React state + `useTransition`). Sincronização com backend via fetch + atualizações otimistas.
- **Autenticação:** Uso de `localStorage` para persistir dados do usuário após login; redirecionamento condicional no `app/page.tsx`.
- **Estilização:** Tailwind + classes personalizadas; animações com Framer Motion; Chart.js para dashboards de qualidade.

### 4.2. Páginas Principais

1. **`/login`**

   - Form de autenticação com animações, toggle de senha e feedback visual.
   - Após login, redireciona conforme `role`.

2. **`/` (home)**

   - Checa `localStorage.user` e redireciona automaticamente para a rota adequada:
     - `admin` → `/admin`
     - `operator` → `/index`
     - `reparo` → `/reparo`
     - `qualidade` → `/relatorios/qualidade`
     - `almoxarifado` → `/almoxarifado`

3. **`/index` (Operador AOI)**

   - **ProTimer:** monitora tempo da OM (sincroniza com backend a cada 5s quando rodando).
   - **ProForm:** cadastro de falhas com validação, atalhos de teclado (Alt+S iniciar, Space pausar/resumir, Ctrl+Enter finalizar).
   - **ProTable:** lista registros filtrados por OM, exclusão em lote, geração de requisições de materiais.
   - **ProQuality:** resumo de qualidade do lote (percentual de falhas, estatísticas).
   - **ProQuickLinks:** atalhos para almoxarifado, reparo, relatórios.
   - **OM workflow:** controle total (iniciar, pausar, retomar, finalizar, nova OM) integrado com backend.

4. **`/admin`**

   - Gestão de usuários (listar, criar, editar, excluir, redefinir senha).
   - Estatísticas (total de usuários, admins, operadores).
   - Atualizações otimistas para melhor UX; uso de modais (`Dialog`) e `Toast`.

5. **`/reparo`**

   - Painel híbrido (Kanban, tabela, timeline) para acompanhar itens a reparar.
   - Filtros multi-critério (OM, status, prioridade, operador, busca).
   - Ações individuais e em lote: marcar como reparado/cancelado, excluir, exportar CSV.
   - Integração com API `/api/registros/:id/status`.

6. **`/almoxarifado`**
   - Gestão de requisições de materiais.

- Vistas Kanban/Tabela, filtros por OM/status/data.
- Modal detalhado com agrupamento por PN, edição de quantidades entregues.
- Atualização de status (`pendente`, `parcialmente_entregue`, `entregue`) e remoção.
- Alertas sonoros/visuais para pendências e modo demo opcional.

7. **`/qualidade`**

   - Dashboards avançados com Chart.js (Bar, Line, Doughnut, Radar).
   - Cálculo de DPMO e nível Sigma com configuração salva em `localStorage`.
   - Filtros por período, OM, modo demo e exportações.

8. **`/relatorios/*`**
   - **`/relatorios/controle-falhas`**: visão consolidada dos registros com filtros de data/status/OM e export.
   - **`/relatorios/qualidade`**: análises para equipe de qualidade (gráficos, comparativos).
   - **`/relatorios/reparo`**: relatórios específicos de reparo.

### 4.3. Componentes e Libs de Destaque

- **`components/index/`**: Conjunto PRO para página principal (Form, Table, Metrics, Quality, QuickLinks, ProTimer).
- **`components/admin/`**: Tabela de usuários e formulários com validação.
- **`components/ui/`**: Abstrações genéricas (Button, Input, Select, Toast, Dialog, Pagination, DemoBadge).
- **`hooks/useToast.ts`**: Sistema de toasts com animações coordenadas.
- **`types/index.ts`**: Modelos compartilhados (`Registro`, `OM`, `Requisicao`, etc.).
- **`lib/api.ts`**: Gestão de base URL e interceptação de respostas (limpeza de storage em 401/403).

### 4.4. Fluxo de Autenticação no Frontend

1. Usuário acessa `/login`, submete credenciais.
2. `fetchAutenticado` envia `POST /api/auth/login`.
3. Backend valida, grava cookie `aoi_token`, retorna payload `{ user: { name, role, ... } }`.
4. Frontend persiste `localStorage.user` e redireciona conforme o papel.
5. Em cada rota protegida, `useEffect` verifica `localStorage.user`; se ausente, redireciona para `/login`.
6. Requests subsequentes usam cookies automaticamente (`credentials: 'include'`).

---

## 5. Perfis de Usuário e Permissões

| Papel          | Acesso Principal                      | Rotas do Frontend                                                        | Observações                                                            |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `admin`        | Painel administrativo, controle total | `/admin`, `/index`, `/reparo`, `/almoxarifado`, `/qualidade`, relatórios | Pode gerenciar usuários e dados demo.                                  |
| `operator`     | Lançamento de falhas e acompanhamento | `/index`, `/reparo`, `/almoxarifado`, relatórios básicos                 | Pode gerar requisições.                                                |
| `reparo`       | Workflow de reparo                    | `/reparo`                                                                | Visualiza registros relevantes, altera status para reparado/cancelado. |
| `qualidade`    | Dashboards e relatórios               | `/relatorios/qualidade`, `/relatorios/controle-falhas`                   | Acesso às métricas de qualidade e análises.                            |
| `almoxarifado` | Gestão de requisições                 | `/almoxarifado`                                                          | Atualiza quantidades entregues e status.                               |

- A atribuição do `role` ocorre na tabela `users`. Backend valida a cada request via JWT.

---

## 6. Fluxos Funcionais Principais

### 6.1. Registro de Falhas (Operador AOI)

1. Operador loga e é direcionado ao `/index`.
2. Preenche OM + Qtde lote → Inicia OM (`/api/om/start`).
3. Para cada falha:
   - Preenche formulário, valida campos obrigatórios.
   - `POST /api/registros` grava registro com `id` gerado no cliente.
   - Tabela atualiza (fetch + update otimista) e métricas são recalculadas.
4. Pode pausar (`PUT /api/om/pause`) e retomar (`PUT /api/om/resume`) OM.
5. Ao concluir, finaliza OM (`PUT /api/om/finalizar`) — tempos salvos em `oms_finalizadas`.
6. Tempo total exibido no painel e persistido para relatórios.

### 6.2. Geração de Requisição de Material

1. Operador seleciona registros na tabela (`ProTable`).
2. Clica em “Gerar requisição” → `POST /api/requisicoes` com `registroIds`.
3. Backend verifica duplicidade (mesma OM e PN pendente) e cria entradas em `requisicoes`.
4. Almoxarifado visualiza em `/almoxarifado` e atualiza status/conteúdo conforme atendimento.

### 6.3. Workflow de Reparo

1. Técnicos acessam `/reparo`.
2. Painel mostra itens por status (Abertos, Em andamento, Reparado, Cancelado).
3. Podem filtrar por OM, prioridade, operador, etc.
4. Atualizam status via `PUT /api/registros/:id/status` ou ações em lote.
5. Exportação CSV gera visão offline para auditoria.

### 6.4. Gestão de Usuários (Admin)

1. Admin acessa `/admin`.
2. Visualiza estatísticas, lista paginada de usuários.
3. Criação/edição via `POST/PUT /api/users` (senhas hash no backend).
4. Exclusão via `DELETE /api/users/:id`.
5. Reset de senha: PUT com `password` novo.

### 6.5. Dashboards de Qualidade

1. Qualidade acessa `/qualidade`.
2. Página carrega registros (`GET /api/registros`), aplica filtros (datas, OM).
3. Calcula KPIs, DPMO e nível Sigma conforme configuração salva.
4. Gráficos atualizados dinamicamente com Chart.js.
5. Pode salvar configuração DPMO no `localStorage`.

---

## 7. Variáveis de Ambiente Importantes

| Variável                               | Descrição                                     | Backend | Frontend |
| -------------------------------------- | --------------------------------------------- | ------- | -------- |
| `JWT_SECRET`                           | Segredo JWT (produção obrigatório)            | ✅      | —        |
| `DEV_SEED_KEY`                         | Chave para rotas de seed em dev               | ✅      | —        |
| `PORT`                                 | Porta da API (padrão 3001)                    | ✅      | —        |
| `CORS_ORIGIN`                          | Lista de origens permitidas (produção)        | ✅      | —        |
| `COOKIE_SECURE` / `COOKIE_SAMESITE`    | Configuração para cookies cross-site          | ✅      | —        |
| `LOG_LEVEL`, `SILENCE_LOGS`            | Verbosidade de logs                           | ✅      | —        |
| `ENABLE_EMERGENCY_ROUTES`              | Habilita rotas de reset emergencial (dev)     | ✅      | —        |
| `PG_CONNECTION_STRING`, `DATABASE_URL` | Conexão PostgreSQL                            | ✅      | —        |
| `DEMO_AUTO_PURGE_DAYS`                 | Purga automática de dados demo                | ✅      | —        |
| `NEXT_PUBLIC_API_URL`                  | URL base da API quando frontend está separado | —       | ✅       |

---

## 8. Scripts de Execução

- **Backend**

  - `npm run dev` (hot reload via nodemon)
  - `npm test` (Jest com opções `--detectOpenHandles`)
  - `scripts/bin/start-backend.bat` (Windows)
  - `bin/dev_start_and_export.ps1` (PowerShell)

- **Frontend**

  - `npm run dev` (Next.js em porta 3000)
  - Vários atalhos `.bat` na raiz (`INICIAR-AMBOS-SERVIDORES.bat`, `INICIAR-FRONTEND.bat`, etc.) para facilitar ambiente local.

- **Raiz**
  - `INICIAR-AMBOS-SERVIDORES.bat`: dispara backend + frontend em paralelo.
  - Pastas `scripts/inicializacao` e `scripts/instalacao`: automações de setup em novos ambientes.

---

## 9. Boas Práticas e Pontos de Atenção

- **Controle de dados demo:** Sempre limpe antes de ambientes produtivos (`/api/registros/demo`, `/api/requisicoes/demo`, scripts `cleanup_*`).
- **Sincronização OM ↔ Registros:** O número da OM é chave central; mantenha consistência ao importar dados.
- **Validações:** Backend usa Zod para validar payloads. Frontend replica validações essenciais (campos obrigatórios, formatos).
- **Atualizações otimistas:** Diversas telas aplicam atualizações otimistas (Admin, Registros). Em caso de erro, lembre-se de implementar rollback para estados locais.
- **Cache em relatórios:** Ajustar TTL e invalidação conforme necessidade (atualmente 60s, com limitações para debug).
- **Logs:** Em produção, ajustar `LOG_LEVEL=error` para reduzir ruído; setar `SILENCE_LOGS=true` quando quiser silenciar console.log.
- **Deploy:** Verificar `NODE_ENV`, variáveis de banco, origem do frontend e proteção de rotas de debug.

---

## 10. Próximos Passos Sugestivos para Evolução

- Implementar RBAC detalhado no frontend (esconder botões com base em `role`, além de validações backend).
- Adicionar testes automatizados mais abrangentes (e2e com Playwright ou Cypress para fluxos críticos).
- Estruturar cache distribuído (Redis) em ambiente com múltiplas instâncias.
- Parametrizar métricas de qualidade para suportar diferentes linhas de produção.
- Criar documentação de API (OpenAPI já existente em `backend/openapi.json`, precisa ser atualizada e publicada).
- Automatizar geração de relatórios (PDF/Excel) para envio periódico.

---

## 11. Referências Internas

- `docs/Resumo do Sistema.MD`: Visão original do fluxo das telas.
- `docs/system-flow.md`: Fluxo esquemático legado (deve ser atualizado).
- `docs/STATUS-PROJETO.md`: Histórico de entregas e pendências.
- `nextjs-frontend/EXPLICACAO-ARQUITETURA.md`: Detalhes adicionais sobre a migração para Next.js.
- `backend/README.md`: Instruções detalhadas para execução, variáveis e testes.

---

**Última atualização:** _(preencher ao fazer novas revisões)_  
Responsável: GPT-5 Codex (assistente) – baseado na estrutura vigente em novembro/2025.



