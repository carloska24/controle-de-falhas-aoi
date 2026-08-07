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

## 📸 Visão Geral

| Tela | Descrição |
|:-----|:----------|
| 🔐 Login | Autenticação com validação, animações e design responsivo |
| ⚙️ Operador | Lançamento de falhas em tempo real com timer de OM |
| 📊 Qualidade | Dashboard com gráficos de pareto, trending e métricas |
| 🔧 Reparo | Fila de itens com defeito para equipe de reparo |
| 📦 Almoxarifado | Gerenciamento de requisições de materiais |
| 🛡️ Admin | Gestão de usuários, roles e dados do sistema |

---

## 🚀 Tecnologias Utilizadas

### Backend
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nodejs,express,ts,postgres,prisma&theme=dark" />
  </a>
</div>

- **Node.js** + **Express 5** — API REST robusta
- **Prisma ORM 7** + **PostgreSQL** — Banco relacional com adapter nativo
- **JWT** + **bcrypt** — Autenticação segura com HttpOnly cookies
- **Zod** — Validação de schemas e inputs
- **Express Rate Limit** — Proteção contra brute force

### Frontend
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind&theme=dark" />
  </a>
</div>

- **Next.js 16** + **React 18** — Framework moderno com App Router
- **TypeScript** — Tipagem estática em todo o projeto
- **Tailwind CSS** + **Framer Motion** — Design responsivo com animações fluidas
- **TanStack Table** + **Chart.js** — Tabelas avançadas e gráficos interativos
- **jsPDF** + **html2canvas** — Exportação de relatórios em PDF

### Infraestrutura
<div align="left">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=vercel,git,github&theme=dark" />
  </a>
</div>

- **Vercel** — Deploy automático do frontend com CI/CD via GitHub
- **Render** — Hospedagem do backend com PostgreSQL gerenciado
- **GitHub Actions** / **Auto Deploy** — Pipeline automático a cada push

---

## 🏗️ Arquitetura do Sistema

```
controle-de-falhas-aoi/
│
├── 📁 backend/                 # API Node.js + Express
│   ├── server.js               # Entry point com CORS, middlewares
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos do banco de dados
│   │   └── seed.js             # Seed com usuários iniciais
│   └── src/
│       ├── controllers/        # Lógica de negócio
│       ├── routes/             # Definição dos endpoints
│       ├── middleware/         # Auth (JWT), Logger, RBAC
│       ├── config/             # Configuração do Prisma Client
│       └── utils/              # Schemas Zod, helpers
│
└── 📁 frontend/                # Next.js App Router
    ├── app/
    │   ├── login/              # Tela de autenticação
    │   ├── operador/           # Painel do operador
    │   ├── qualidade/          # Dashboard de qualidade
    │   ├── reparo/             # Fila de reparos
    │   ├── almoxarifado/       # Gestão de estoque
    │   ├── admin/              # Painel administrativo
    │   └── relatorios/         # Relatórios avançados
    ├── components/             # Componentes reutilizáveis
    ├── hooks/                  # Custom React Hooks
    ├── lib/                    # Configuração da API, utilitários
    └── types/                  # Types e interfaces TypeScript
```

---

## 🔐 Sistema de Autenticação e Roles

O sistema implementa **RBAC (Role-Based Access Control)** completo:

| Role | Acesso |
|:-----|:-------|
| `admin` | Acesso total — usuários, dados, relatórios, debug |
| `operator` | Lançamento de falhas e gerenciamento de OMs |
| `qualidade` | Dashboards, relatórios e métricas de qualidade |
| `reparo` | Fila de itens com defeito para reparo |
| `almoxarifado` | Requisições e gestão de materiais |
| `lider_smt` | Conferência SMT |

---

## 🛠️ Rodando Localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL instalado (ou use o banco do Render com `.env`)
- Git

### 1. Clone o repositório

```bash
git clone https://github.com/carloska24/controle-de-falhas-aoi.git
cd controle-de-falhas-aoi
```

### 2. Configure o Backend

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
# Instale as dependências
npm install

# Crie as tabelas e popule o banco
npm run build

# Inicie o servidor de desenvolvimento
npm run dev
```

### 3. Configure o Frontend

```bash
cd ../frontend

# Crie o arquivo de variáveis de ambiente
# Em desenvolvimento, o proxy do Next.js já aponta para localhost:3001
# Não precisa de NEXT_PUBLIC_API_URL em dev

# Instale as dependências
npm install

# Inicie o servidor
npm run dev
```

### 4. Acesse o sistema

| Serviço | URL |
|:--------|:----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

---

## ☁️ Deploy em Produção

### Backend (Render)

| Campo | Valor |
|:------|:------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

**Variáveis de Ambiente obrigatórias:**

| Variável | Descrição |
|:---------|:----------|
| `DATABASE_URL` | URL do PostgreSQL do Render |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | URL do frontend na Vercel |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `None` |

### Frontend (Vercel)

| Campo | Valor |
|:------|:------|
| Root Directory | `frontend` |
| Framework Preset | Next.js (detectado automaticamente) |

**Variável de Ambiente:**

| Variável | Descrição |
|:---------|:----------|
| `NEXT_PUBLIC_API_URL` | URL do backend no Render |

---

## 📡 Endpoints da API

| Método | Endpoint | Descrição | Auth |
|:-------|:---------|:----------|:-----|
| `POST` | `/api/auth/login` | Login do usuário | ❌ |
| `POST` | `/api/auth/logout` | Logout + limpeza de dados demo | ✅ |
| `GET` | `/api/auth/me` | Dados do usuário autenticado | ✅ |
| `GET` | `/api/registros` | Lista todos os registros | ✅ |
| `POST` | `/api/registros` | Cria novo registro de falha | ✅ |
| `PUT` | `/api/registros/:id` | Atualiza registro | ✅ |
| `DELETE` | `/api/registros/:id` | Remove registro | ✅ |
| `GET` | `/api/om/:omNumber` | Dados de uma OM | ✅ |
| `POST` | `/api/om/start` | Inicia timer de OM | ✅ |
| `GET` | `/api/requisicoes` | Lista requisições de material | ✅ |
| `GET` | `/api/users` | Lista usuários (admin) | ✅ 🔒 |
| `GET` | `/health` | Health check do servidor | ❌ |
| `GET` | `/health/db` | Health check do banco | ❌ |

---

## ✨ Funcionalidades em Destaque

- 🔐 **Autenticação JWT** com HttpOnly cookies — seguro contra XSS
- ⏱️ **Timer de OM em tempo real** com suporte a pausas
- 📊 **Dashboard Pareto** — identifica os defeitos mais frequentes
- 📈 **Gráfico de Trending** — evolução temporal das falhas
- 🖨️ **Exportação de Relatórios** em PDF com html2canvas + jsPDF
- 🎨 **Animações** com Framer Motion em toda a interface
- 📱 **Design Responsivo** — funciona em mobile, tablet e desktop
- 🛡️ **Rate Limiting** e validação de inputs com Zod
- 🌱 **Seed automático** no deploy — banco já sobe com usuário admin
- 🔄 **CI/CD automático** — push na main = novo deploy

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
