<div align="center">

<img src="https://skillicons.dev/icons?i=nodejs,ts,nextjs,postgres,prisma&theme=dark&perline=5" />

# 🏭 Controle de Falhas AOI

**Sistema Web Completo de Controle de Qualidade em Produção**

[![Deploy - Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://controle-de-falhas-aoi-xstx.onrender.com/health)
[![Deploy - Frontend](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://controle-de-falhas-aoi.vercel.app)
[![GitHub](https://img.shields.io/badge/Código-GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/carloska24/controle-de-falhas-aoi)
[![License](https://img.shields.io/badge/Licença-ISC-blue?style=for-the-badge)](./LICENSE)

> Sistema fullstack de produção, desenvolvido do zero, para gerenciamento de falhas em linha AOI (Automated Optical Inspection) industrial — com autenticação por roles, dashboards em tempo real, relatórios, timers de OM e muito mais.

</div>

---

## 🌐 Demo Online

**🔗 Acesse agora:** [controle-de-falhas-aoi.vercel.app](https://controle-de-falhas-aoi.vercel.app)

| Usuário | Senha | Perfil |
|:--------|:------|:-------|
| `DevNaPratica` | `123456` | Administrador |

> O backend está hospedado no Render (plano gratuito). Na primeira requisição pode haver uma demora de ~30s enquanto o servidor "acorda".

---

## 📸 Telas do Sistema

| Tela | Descrição |
|:-----|:----------|
| 🔐 Login | Autenticação com animações Framer Motion e design responsivo |
| ⚙️ Operador | Lançamento de falhas em tempo real com timer de OM (pausa/retomada) |
| 📊 Qualidade | Dashboard com gráficos Pareto, trending e métricas de produção |
| 🔧 Reparo | Fila de itens com defeito para equipe de reparo |
| 📦 Almoxarifado | Gerenciamento de requisições de materiais |
| 🏭 SMT | Conferência de produção para líderes SMT |
| 🛡️ Admin | Gestão completa de usuários, roles e dados do sistema |
| 📈 Relatórios | Relatórios avançados de qualidade e reparos com exportação em PDF |

---

## 🚀 Tecnologias Utilizadas

### Backend
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nodejs,express,postgres,prisma&theme=dark" />
  </a>
</div>

| Tecnologia | Versão | Uso |
|:-----------|:-------|:----|
| **Node.js** | 18+ | Runtime JavaScript |
| **Express** | ^5.1.0 | Framework HTTP |
| **Prisma ORM** | ^7.4.1 | ORM com adapter nativo (`@prisma/adapter-pg`) |
| **PostgreSQL** | — | Banco de dados relacional |
| **JWT** (`jsonwebtoken`) | ^9.0.2 | Autenticação com HttpOnly cookies |
| **bcrypt** | ^6.0.0 | Hash seguro de senhas |
| **Zod** | ^3.25.76 | Validação de schemas e inputs |
| **express-rate-limit** | ^7.5.1 | Proteção contra brute force |
| **morgan** | ^1.10.1 | Logger de requisições HTTP |
| **cors** | ^2.8.5 | Controle de CORS por variável de ambiente |
| **cookie-parser** | ^1.4.6 | Leitura de HttpOnly cookies |
| **dotenv** | ^16.6.1 | Gestão de variáveis de ambiente |

### Frontend
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind&theme=dark" />
  </a>
</div>

| Tecnologia | Versão | Uso |
|:-----------|:-------|:----|
| **Next.js** | ^16.3.0 | Framework React com App Router |
| **React** | ^18.3.1 | Biblioteca de UI |
| **TypeScript** | ^5 | Tipagem estática em todo o projeto |
| **Tailwind CSS** | ^3.4.4 | Estilização utilitária responsiva |
| **Framer Motion** | ^11.3.5 | Animações e transições |
| **TanStack Table** | ^8.21.3 | Tabelas avançadas com sorting e filtros |
| **Chart.js** + **react-chartjs-2** | ^4.4.4 | Gráficos interativos (Pareto, Linha) |
| **chartjs-adapter-date-fns** | ^3.0.0 | Adaptador de datas para os gráficos |
| **jsPDF** | ^3.0.4 | Exportação de relatórios em PDF |
| **html2canvas** | ^1.4.1 | Captura de tela para gerar PDF |
| **lucide-react** | ^0.400.0 | Biblioteca de ícones |
| **date-fns** | ^4.1.0 | Manipulação de datas |
| **clsx** + **tailwind-merge** | — | Utilitários de classes CSS |

### Infraestrutura e Testes
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=vercel,git,github&theme=dark" />
  </a>
</div>

- **Vercel** — Deploy automático do frontend com CI/CD via GitHub
- **Render** — Hospedagem do backend Node.js com PostgreSQL gerenciado
- **Jest** + **Supertest** — Testes automatizados da API
- **Auto Deploy** — Push na `main` = novo deploy automático

---

## 🏗️ Arquitetura do Projeto

```
controle-de-falhas-aoi/
│
├── 📁 backend/
│   ├── server.js                   # Entry point: CORS, middlewares, rotas
│   ├── prisma/
│   │   ├── schema.prisma           # Modelos do banco de dados
│   │   ├── seed.js                 # Seed com usuários iniciais
│   │   └── migrations/             # Histórico de migrações
│   ├── prisma.config.ts            # Configuração do Prisma v7
│   └── src/
│       ├── controllers/            # Lógica de negócio
│       │   ├── authController.js   # Login / Logout / Me
│       │   ├── omController.js     # Timer de OM (start/pause/resume/finish)
│       │   ├── registroController.js # CRUD de falhas
│       │   ├── requisicaoController.js # Gestão de requisições
│       │   ├── userController.js   # CRUD de usuários (admin)
│       │   └── debugController.js  # Geração de dados demo
│       ├── routes/                 # Definição dos endpoints
│       ├── middleware/             # Auth (JWT), RBAC, Logger
│       ├── config/
│       │   └── prisma.js           # Prisma Client com adapter pg
│       └── utils/
│           └── schemas.js          # Validações Zod
│
└── 📁 frontend/
    ├── app/
    │   ├── login/                  # Tela de autenticação animada
    │   ├── operador/               # Painel do operador + timer de OM
    │   ├── qualidade/              # Dashboard com gráficos
    │   ├── reparo/                 # Fila de reparos
    │   ├── almoxarifado/           # Gestão de estoque/requisições
    │   ├── admin/                  # Painel administrativo
    │   ├── smt/                    # Conferência SMT
    │   └── relatorios/             # Relatórios de qualidade e reparo
    ├── components/                 # Componentes reutilizáveis
    ├── hooks/                      # Custom Hooks (useToast, useDebounce, useOptimisticUpdate)
    ├── lib/
    │   └── api.ts                  # Cliente HTTP centralizado com gestão de auth
    ├── types/                      # Types e interfaces TypeScript
    └── utils/                      # Funções utilitárias
```

---

## 🔐 Sistema de Autenticação e RBAC

**RBAC (Role-Based Access Control)** com 6 perfis de acesso:

| Role | Acesso |
|:-----|:-------|
| `admin` | Acesso total — usuários, dados, relatórios, debug |
| `operator` | Lançamento de falhas, gerenciamento de OMs, requisições |
| `qualidade` | Dashboards, relatórios e métricas de qualidade |
| `reparo` | Fila de itens com defeito para reparo |
| `almoxarifado` | Requisições e gestão de materiais |
| `lider_smt` | Conferência SMT + edição de registros |

Autenticação via **JWT** armazenado em **HttpOnly cookie** — protegido contra XSS.

---

## 🛠️ Rodando Localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL instalado localmente (ou use `DATABASE_URL` apontando para Render)
- Git

### 1. Clone o repositório

```bash
git clone https://github.com/carloska24/controle-de-falhas-aoi.git
cd controle-de-falhas-aoi
```

### 2. Configure e inicie o Backend

```bash
cd backend

# Crie o arquivo de variáveis de ambiente
cp .env.example .env
# Edite o .env com sua DATABASE_URL e JWT_SECRET
```

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://usuario:senha@localhost:5432/aoi_db
JWT_SECRET=seu-segredo-super-forte-aqui
```

```bash
npm install          # Instala dependências
npm run build        # Gera Prisma Client + cria tabelas + seed
npm run dev          # Inicia com nodemon (hot reload)
```

### 3. Configure e inicie o Frontend

```bash
cd ../frontend
npm install
npm run dev          # Inicia na porta 3000
```

> Em desenvolvimento, o Next.js faz proxy automático de `/api/*` para `localhost:3001`. Não precisa de `NEXT_PUBLIC_API_URL`.

### 4. Acesse o sistema

| Serviço | URL |
|:--------|:----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |
| Health DB | http://localhost:3001/health/db |

---

## ☁️ Deploy em Produção

### Backend (Render)

| Campo | Valor |
|:------|:------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

**Variáveis de Ambiente:**

| Variável | Descrição |
|:---------|:----------|
| `DATABASE_URL` | URL do PostgreSQL do Render |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | URL exata do frontend na Vercel (sem barra final) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `None` (obrigatório para cross-origin com cookies) |

### Frontend (Vercel)

| Campo | Valor |
|:------|:------|
| Root Directory | `frontend` |
| Framework Preset | Next.js (detectado automaticamente) |

**Variável de Ambiente:**

| Variável | Valor |
|:---------|:------|
| `NEXT_PUBLIC_API_URL` | URL do backend no Render (ex: `https://seu-backend.onrender.com`) |

---

## 📡 Endpoints da API

### Auth
| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:----:|
| `POST` | `/api/auth/login` | Login com username e senha | ❌ |
| `POST` | `/api/auth/logout` | Logout + limpeza de dados demo | ✅ |
| `GET` | `/api/auth/me` | Retorna dados do usuário autenticado | ✅ |

### Registros (Falhas)
| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:----:|
| `GET` | `/api/registros` | Lista registros (com filtros) | ✅ |
| `POST` | `/api/registros/batch` | Cria registros em lote | ✅ |
| `PUT` | `/api/registros/:id` | Atualiza um registro | ✅ |
| `PUT` | `/api/registros/:id/status` | Atualiza status de um registro | ✅ |
| `PUT` | `/api/registros/status/:status` | Atualiza status em lote | ✅ |
| `DELETE` | `/api/registros/:id` | Remove um registro | ✅ |
| `DELETE` | `/api/registros` | Remove registros em lote | ✅ |

### OMs (Ordens de Manufatura)
| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:----:|
| `POST` | `/api/om/start` | Inicia timer de OM | ✅ |
| `GET` | `/api/om/:omNumber` | Busca dados de uma OM | ✅ |
| `PUT` | `/api/om/pause` | Pausa timer de OM | ✅ |
| `PUT` | `/api/om/resume` | Retoma timer de OM pausada | ✅ |
| `PUT` | `/api/om/finalizar` | Finaliza OM | ✅ |
| `GET` | `/api/oms` | Lista OMs ativas ou pausadas | ✅ |
| `GET` | `/api/oms/finalizadas` | Lista OMs finalizadas | ✅ |
| `GET` | `/api/om-time/:omNumber` | Tempo decorrido de uma OM | ✅ |
| `GET` | `/api/relatorio-falhas` | Relatório de falhas por OM | ✅ 🔒 |

### Requisições
| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:----:|
| `GET` | `/api/requisicoes` | Lista requisições | ✅ |
| `POST` | `/api/requisicoes` | Cria requisição de material | ✅ |
| `PUT` | `/api/requisicoes/:id/status` | Atualiza status | ✅ |
| `PUT` | `/api/requisicoes/:id/itens` | Atualiza itens | ✅ |
| `DELETE` | `/api/requisicoes/:id` | Remove requisição | ✅ |

### Usuários (Admin)
| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:----:|
| `GET` | `/api/users` | Lista usuários | ✅ 🔒 |
| `POST` | `/api/users` | Cria usuário | ✅ 🔒 |
| `PUT` | `/api/users/:id` | Atualiza usuário | ✅ 🔒 |
| `DELETE` | `/api/users/:id` | Remove usuário | ✅ 🔒 |

> 🔒 = apenas `admin`

---

## ✨ Funcionalidades em Destaque

- 🔐 **Autenticação JWT** com HttpOnly cookies — seguro contra XSS e CSRF
- ⏱️ **Timer de OM em tempo real** com suporte a pausas e retomada
- 📊 **Gráfico de Pareto** — identifica os defeitos mais frequentes
- 📈 **Gráfico de Trending** — evolução temporal das falhas por turno
- 🖨️ **Exportação de Relatórios** em PDF via jsPDF + html2canvas
- 🎨 **Animações** com Framer Motion em toda a interface (login, cards, gráficos)
- 📱 **Design Responsivo** — funciona em desktop, tablet e mobile
- 🛡️ **Rate Limiting** no endpoint de login — proteção contra brute force
- ✅ **Validação de inputs** com Zod — schemas tipados no backend
- ⚡ **Optimistic Updates** — UI atualiza antes da confirmação do servidor
- 🌱 **Seed automático** no build — banco já sobe com usuário admin
- 🧪 **Testes automatizados** com Jest + Supertest

---

## 👨‍💻 Desenvolvido por

<div align="center">

**Carlos Alexandre Duarte Pereira**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/carlos-duarte-0b4591206)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:carloska24@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/carloska24)

*Backend Developer | Node.js · TypeScript · PostgreSQL · Next.js*

</div>

---

<div align="center">

⭐ **Se esse projeto te ajudou ou impressionou, deixa uma estrela!** ⭐

</div>
