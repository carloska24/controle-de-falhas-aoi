# Documentação Técnica — Sistema de Controle de Falhas AOI

**Empresa:** CADService Produtos Eletrônicos  
**Sistema:** Controle de Falhas AOI  
**Versão:** 1.0  
**Autor:** Carlos Alexandre Duarte Pereira  
**Data:** Agosto 2026  

---

## 1. Visão Geral do Sistema

O **Sistema de Controle de Falhas AOI** é uma aplicação web desenvolvida sob medida para a **CADService Produtos Eletrônicos**, empresa fabricante de produtos eletrônicos localizada em Campinas - SP.

O sistema foi criado para **digitalizar e centralizar** o processo de controle de qualidade das linhas de produção SMD (Surface-Mount Technology), substituindo planilhas manuais e registros em papel.

### 1.1 Problema Resolvido

Antes do sistema, o processo era:
- Registros manuais em papel ou planilhas desconectadas
- Sem controle de tempo por Ordem de Manufatura (OM)
- Cálculo manual e demorado de DPMO e índice Sigma
- Sem rastreabilidade de defeitos por componente ou período

### 1.2 Solução Implementada

- Plataforma web centralizada acessível de qualquer dispositivo na rede
- Timer preciso por OM com pause/resume
- Cálculo automático de DPMO, Sigma e Pareto de defeitos
- Controle de acesso por perfil (RBAC)
- Relatórios exportáveis em PDF

---

## 2. Arquitetura do Sistema

### 2.1 Visão de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIOS DO SISTEMA                      │
│  Operador │ Qualidade │ Reparo │ Almoxarifado │ Admin        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND — Next.js 16                        │
│              Hospedado na Vercel (Cloud)                    │
│                                                             │
│  /login      /operador    /qualidade    /reparo             │
│  /admin      /almoxarifado  /relatorios  /smt               │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (HTTPS)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND — Node.js + Express 5                │
│              Hospedado no Render (Cloud)                    │
│                                                             │
│  /api/auth      /api/registros    /api/om                   │
│  /api/users     /api/requisicoes  /api/relatorio-falhas     │
└─────────────────────┬───────────────────────────────────────┘
                      │ Prisma ORM
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              BANCO DE DADOS — PostgreSQL 15                 │
│              Hospedado no Render (Cloud)                    │
│                                                             │
│  users │ registros │ oms_ativas │ oms_pausadas              │
│  oms_finalizadas │ requisicoes                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Containers

| Container | Tecnologia | Hospedagem | Responsabilidade |
|:----------|:-----------|:-----------|:-----------------|
| **Frontend** | Next.js 16 + React 18 + TypeScript | Vercel | Interface do usuário, dashboards, formulários |
| **Backend API** | Node.js 18 + Express 5 | Render | Lógica de negócio, autenticação, REST API |
| **Banco de Dados** | PostgreSQL 15 + Prisma ORM | Render | Persistência de dados |

---

## 3. Backend — Detalhamento Técnico

### 3.1 Estrutura de Pastas

```
backend/
├── server.js              # Ponto de entrada — configura app, middlewares e inicia servidor
├── prisma/
│   └── schema.prisma      # Modelos do banco de dados
├── src/
│   ├── controllers/       # Lógica de negócio por domínio
│   │   ├── authController.js
│   │   ├── omController.js
│   │   ├── registroController.js
│   │   ├── requisicaoController.js
│   │   └── userController.js
│   ├── routes/            # Definição dos endpoints REST
│   │   ├── authRoutes.js
│   │   ├── omRoutes.js
│   │   ├── registroRoutes.js
│   │   ├── requisicaoRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/
│   │   ├── auth.js        # JWT + RBAC (authenticateToken, hasRole)
│   │   └── logger.js      # Morgan HTTP logger
│   ├── config/
│   │   └── prisma.js      # Instância singleton do PrismaClient
│   └── utils/
│       └── schemas.js     # Schemas Zod para validação de entrada
├── tests/                 # Testes Jest + Supertest
└── scripts/               # Smoke tests e scripts de diagnóstico
```

### 3.2 Endpoints da API

#### Autenticação — `/api/auth`

| Método | Endpoint | Descrição | Acesso |
|:-------|:---------|:----------|:-------|
| POST | `/api/auth/login` | Login com usuário e senha — retorna cookie JWT | Público |
| POST | `/api/auth/logout` | Invalida o cookie de sessão | Autenticado |
| GET | `/api/auth/me` | Retorna dados do usuário logado | Autenticado |

#### Registros de Falha — `/api/registros`

| Método | Endpoint | Descrição | Perfis |
|:-------|:---------|:----------|:-------|
| GET | `/api/registros` | Lista todos os registros | Todos |
| POST | `/api/registros/batch` | Cria múltiplos registros em lote | admin, operator |
| PUT | `/api/registros/:id` | Atualiza um registro | admin, operator, reparo |
| PUT | `/api/registros/:id/status` | Atualiza apenas o status | admin, operator, reparo |
| PUT | `/api/registros/status/:status` | Atualiza status em lote | admin, operator, reparo |
| DELETE | `/api/registros/:id` | Remove um registro | admin, operator, reparo |
| DELETE | `/api/registros` | Remove registros em lote | admin, operator, reparo |

#### Ordens de Manufatura — `/api/om` e `/api/oms`

| Método | Endpoint | Descrição | Perfis |
|:-------|:---------|:----------|:-------|
| POST | `/api/om/start` | Inicia uma OM com timer | admin, operator |
| PUT | `/api/om/pause` | Pausa o timer da OM | admin, operator |
| PUT | `/api/om/resume` | Retoma o timer da OM | admin, operator |
| PUT | `/api/om/finalizar` | Finaliza a OM | admin, operator |
| GET | `/api/om/:omNumber` | Busca dados de uma OM específica | Todos |
| GET | `/api/oms?status=ativa` | Lista OMs ativas | Todos |
| GET | `/api/oms?status=pausada` | Lista OMs pausadas | Todos |
| GET | `/api/oms/finalizadas` | Lista OMs finalizadas | Todos |
| GET | `/api/om-time/:omNumber` | Tempo decorrido de uma OM | Todos |
| GET | `/api/relatorio-falhas` | Relatório completo de falhas | admin, qualidade |

#### Usuários — `/api/users`

| Método | Endpoint | Descrição | Perfis |
|:-------|:---------|:----------|:-------|
| GET | `/api/users` | Lista todos os usuários | admin |
| POST | `/api/users` | Cria novo usuário | admin |
| PUT | `/api/users/:id` | Atualiza usuário | admin |
| DELETE | `/api/users/:id` | Remove usuário | admin |

#### Requisições de Almoxarifado — `/api/requisicoes`

| Método | Endpoint | Descrição | Perfis |
|:-------|:---------|:----------|:-------|
| GET | `/api/requisicoes` | Lista requisições | Todos |
| POST | `/api/requisicoes` | Cria nova requisição | admin, operator |
| PUT | `/api/requisicoes/:id` | Atualiza requisição | admin, almoxarifado |
| DELETE | `/api/requisicoes/:id` | Remove requisição | admin |

#### Health Check

| Método | Endpoint | Descrição |
|:-------|:---------|:----------|
| GET | `/health` | Status da aplicação |
| GET | `/health/db` | Status da conexão com o banco |

### 3.3 Segurança

- **Autenticação:** JWT armazenado em cookie `HttpOnly` (não acessível por JavaScript)
- **Autorização:** Middleware `hasRole()` — verifica perfil antes de cada rota protegida
- **Senhas:** Hash bcrypt (fator de custo 10+)
- **Rate Limiting:** `express-rate-limit` — proteção contra brute-force e abuso de API
- **Validação:** Schemas Zod em todas as rotas de escrita
- **CORS:** Configurado por variável de ambiente `CORS_ORIGIN`

---

## 4. Frontend — Detalhamento Técnico

### 4.1 Estrutura de Páginas

```
frontend/
├── app/
│   ├── login/             # Autenticação com animação SMD ao fundo
│   ├── operador/          # Painel principal do operador de produção
│   ├── qualidade/         # Dashboard analítico de qualidade
│   ├── reparo/            # Kanban de reparos
│   ├── almoxarifado/      # Kanban de requisições de materiais
│   ├── admin/             # Gestão de usuários
│   ├── relatorios/        # Exportação de relatórios em PDF
│   └── smt/               # Controle SMT
├── components/
│   ├── ui/                # Componentes genéricos (Button, Input, Dialog, Badge...)
│   ├── index/             # Componentes de negócio (ProTable, ProForm, ProTimer...)
│   └── admin/             # Componentes específicos do admin
├── hooks/                 # React Hooks customizados (useToast, useAuth...)
├── lib/
│   └── api.ts             # Wrapper fetch para comunicação com backend
└── utils/                 # Funções utilitárias
```

### 4.2 Módulos do Sistema

#### Módulo: Login
- Animação SMD ao fundo (componentes eletrônicos caindo)
- Formulário com validação e feedback de erro
- Autenticação via cookie JWT HttpOnly

#### Módulo: Operador
- Timer de OM com shimmer effect (inicio, pausa, retomada, finalização)
- Formulário de lançamento de falhas (designador, PN, tipo de defeito, observações)
- Tabela interativa de registros com filtros e paginação
- Métricas em tempo real na barra lateral

#### Módulo: Qualidade
- Dashboard com gráficos Chart.js (Pareto de defeitos, tendência temporal, análise por OM)
- Cálculo automático de DPMO e índice Sigma (padrão IPC)
- Configuração de parâmetros (componentes por placa, pads SMD)
- Exportação de relatórios em PDF

#### Módulo: Reparo
- Kanban interativo com drag-and-drop
- Cards de falhas com designador, PN e prioridade destacados
- Atualização otimista de status com rollback em erro
- Empty-state contextual por coluna

#### Módulo: Almoxarifado
- Kanban de requisições de materiais (pendente → separando → entregue)
- Modal de requisição com busca interna e ações em lote
- Controle de quantidade por item
- Notificação sonora de novos pedidos (toggle on/off com persistência)
- Atalhos: `Ctrl+S` (salvar), `Esc` (fechar), confirmação de saída com alterações

#### Módulo: Admin
- Tabela de usuários com criação, edição e remoção
- Definição de perfis (roles)
- Proteção total — apenas admin tem acesso

---

## 5. Banco de Dados

### 5.1 Modelo de Dados

```
┌──────────────────────────────────────────────────────┐
│ users                                                │
├──────────────────────────────────────────────────────┤
│ id (PK)       Int  — autoincrement                   │
│ name          String                                 │
│ username      String (unique)                        │
│ password_hash String                                 │
│ role          String — admin|operator|reparo|         │
│                        qualidade|almoxarifado        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ registros                                            │
├──────────────────────────────────────────────────────┤
│ id (PK)       String (UUID)                          │
│ om            String — Ordem de Manufatura           │
│ qtdlote       Int?   — Quantidade do lote            │
│ serial        String? — Serial da placa              │
│ designador    String? — Componente com defeito       │
│ tipodefeito   String? — Categoria do defeito         │
│ pn            String? — Part Number                  │
│ descricao     String? — Descrição do defeito         │
│ obs           String? — Observações adicionais       │
│ createdat     String — Timestamp de criação          │
│ status        String? — pendente|reparado|...        │
│ operador      String? — Nome do operador             │
│ prioridade    String? — normal|urgente|...           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ oms_ativas                                           │
├──────────────────────────────────────────────────────┤
│ omNumber (PK) String — Número da OM                  │
│ startTime     BigInt? — Timestamp de início (ms)     │
│ pausedTime    BigInt? — Tempo total pausado (ms)     │
│ qtdlote       Int?                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ oms_pausadas                                         │
├──────────────────────────────────────────────────────┤
│ omNumber (PK) String                                 │
│ startTime     BigInt?                                │
│ pausedTime    BigInt?                                │
│ pauseStartedAt BigInt? — Quando pausou              │
│ elapsedAtPause BigInt? — Tempo decorrido ao pausar  │
│ qtdlote       Int?                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ oms_finalizadas                                      │
├──────────────────────────────────────────────────────┤
│ omNumber (PK) String                                 │
│ startTime     BigInt?                                │
│ endTime       BigInt? — Timestamp de finalização     │
│ pausedTime    BigInt?                                │
│ qtdlote       Int?                                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ requisicoes                                          │
├──────────────────────────────────────────────────────┤
│ id (PK)       Int — autoincrement                    │
│ om            String — OM vinculada                  │
│ items         String — JSON dos itens requisitados   │
│ status        String? — pendente|separando|entregue  │
│ created_at    String?                                │
│ created_by    String? — Quem criou a requisição      │
└──────────────────────────────────────────────────────┘
```

### 5.2 Índices de Performance

```
registros:
  - idx_registros_om          → busca por OM
  - idx_registros_status      → filtro por status
  - idx_registros_createdat   → ordenação temporal
  - idx_registros_operador    → filtro por operador
  - idx_registros_om_status   → combinado (OM + status)

requisicoes:
  - idx_requisicoes_om
  - idx_requisicoes_status
  - idx_requisicoes_created_at
```

---

## 6. Perfis de Acesso (RBAC)

| Perfil | Módulos Acessíveis |
|:-------|:-------------------|
| **admin** | Todos os módulos + gestão de usuários, dados e configurações |
| **operator** | Operador (lançamento de falhas, timer OM) |
| **reparo** | Reparo (fila kanban, atualização de status) |
| **qualidade** | Qualidade (dashboard, métricas, relatórios, DPMO) |
| **almoxarifado** | Almoxarifado (kanban de requisições) |

---

## 7. Infraestrutura e Deploy

### 7.1 Cloud (Produção)

| Componente | Serviço | URL |
|:-----------|:--------|:----|
| Frontend (Next.js) | Vercel | Configurado via GitHub |
| Backend (API) | Render | https://controle-de-falhas-aoi.onrender.com |
| Banco de Dados | Render PostgreSQL | Interno (não exposto) |

### 7.2 CI/CD

- **GitHub Actions** — `.github/workflows/backend-tests.yml`
- A cada `git push` para `main`, o pipeline executa os testes automatizados do backend
- Em caso de sucesso, Vercel e Render fazem deploy automático

### 7.3 Variáveis de Ambiente (Backend)

| Variável | Descrição |
|:---------|:----------|
| `PORT` | Porta do servidor (padrão: 3001) |
| `NODE_ENV` | `development` ou `production` |
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `JWT_SECRET` | Segredo para assinar tokens JWT |
| `CORS_ORIGIN` | Origens permitidas no CORS |
| `COOKIE_SECURE` | `true` em produção (HTTPS) |
| `COOKIE_SAMESITE` | `Lax` (dev) ou `None` (cross-site produção) |

---

## 8. Testes

### 8.1 Suíte de Testes (Backend)

| Arquivo | Tipo | O que testa |
|:--------|:-----|:------------|
| `auth_cookie_flow.spec.js` | Integração | Fluxo completo login → autenticação → logout |
| `performance_registros.test.js` | Performance | Tempo de resposta do endpoint de registros |
| `performance_relatorio_falhas.test.js` | Performance | Tempo de resposta do relatório de falhas |
| `performance_requisicoes.test.js` | Performance | Tempo de resposta das requisições |

### 8.2 Smoke Tests

| Script | O que valida |
|:-------|:-------------|
| `smoke-intranet.js` | Endpoints principais respondendo (health, login, registros) |
| `smoke-rbac-intranet.js` | Controle de acesso por perfil funcionando corretamente |
| `probe-intranet.js` | Diagnóstico de conectividade na rede local |

### 8.3 Comandos

```bash
# Testes unitários e integração
cd backend
npm test -- --detectOpenHandles -i

# Fluxo de autenticação
npm run test:auth

# Smoke test (API online)
npm run smoke:intranet

# RBAC
npm run smoke:rbac
```

---

## 9. Tecnologias Utilizadas

### Backend
| Tecnologia | Versão | Função |
|:-----------|:-------|:-------|
| Node.js | 18+ | Runtime |
| Express | 5.x | Framework web |
| Prisma ORM | 7.x | ORM + migrações |
| PostgreSQL | 15+ | Banco de dados |
| JWT (jsonwebtoken) | 9.x | Autenticação |
| bcrypt | 6.x | Hash de senhas |
| Zod | 3.x | Validação de schemas |
| express-rate-limit | 7.x | Rate limiting |
| Jest + Supertest | 29.x | Testes |

### Frontend
| Tecnologia | Versão | Função |
|:-----------|:-------|:-------|
| Next.js | 16.x | Framework React |
| React | 18.x | UI |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 3.x | Estilização |
| Framer Motion | 11.x | Animações |
| Chart.js | 4.x | Gráficos |
| TanStack Table | 8.x | Tabelas avançadas |
| jsPDF + html2canvas | — | Exportação PDF |
| Lucide React | — | Ícones |
| date-fns | 4.x | Manipulação de datas |

---

## 10. Glossário

| Termo | Definição |
|:------|:----------|
| **AOI** | Automated Optical Inspection — inspeção óptica automatizada de placas eletrônicas |
| **OM** | Ordem de Manufatura — ordem de produção de um lote |
| **SMD** | Surface-Mount Device — tecnologia de montagem de componentes na superfície |
| **DPMO** | Defects Per Million Opportunities — defeitos por milhão de oportunidades |
| **Sigma** | Índice de qualidade IPC (ex: 3σ, 6σ) |
| **RBAC** | Role-Based Access Control — controle de acesso baseado em perfis |
| **JWT** | JSON Web Token — padrão de autenticação sem estado |
| **Pareto** | Análise de Pareto — identifica os defeitos de maior frequência (regra 80/20) |
| **PN** | Part Number — código de identificação do componente |
| **Designador** | Referência do componente na placa (ex: C1, R22, U5) |

---

*Documento gerado em Agosto de 2026 — Carlos Alexandre Duarte Pereira*  
*CADService Produtos Eletrônicos — Campinas, SP*
