# 🏭 Controle de Falhas AOI

Sistema completo de controle de falhas em produção com autenticação, dashboards e relatórios em tempo real.

## 📋 Sobre o Projeto

Sistema desenvolvido para controlar falhas em produção com duas versões:

- **Legado:** HTML + CSS + JavaScript (pasta `frontend/`)
- **Nova:** Next.js + React + TypeScript (pasta `nextjs-frontend/`)

Ambas compartilham o mesmo **backend Express** na porta 3001.

## 🚀 Início Rápido

### Instalação

```bash
# Clonar repositório
cd C:\Workspace\controle-de-falhas-aoi

# Instalar dependências do backend
cd backend
npm install

# Instalar dependências do frontend (Next.js)
cd ../nextjs-frontend
npm install
```

### Executar o Sistema

#### Backend (Express)

```bash
cd backend
npm start
# ou
npm run dev
```

#### Frontend Next.js (Recomendado)

```bash
cd nextjs-frontend
npm run dev
```

#### Frontend Legado

```bash
# Abra frontend/index.html no navegador ou use um servidor local
```

## 📁 Estrutura do Projeto

```
controle-de-falhas-aoi/
├── backend/           # API Express + SQLite
│   ├── server.js      # Servidor principal
│   ├── database.js    # Configuração do SQLite
│   └── queries/       # Queries de banco de dados
├── frontend/          # Frontend legado (HTML/CSS/JS)
├── nextjs-frontend/   # Frontend moderno (Next.js)
└── Comandos Windows10/ # Scripts de otimização do Windows
```

## 🔐 Autenticação

- **Login:** `/login`
- **Roles:** admin, operator, reparo, qualidade, almoxarifado
- **Backend:** https://controle-de-falhas-aoi.onrender.com

### Credenciais de Desenvolvimento

- **Login:** DevNaPratica
- **Senha:** 123456
- **Role:** Administrador

## 📚 Documentação

- **Status do Projeto:** `STATUS-PROJETO.md`
- **Comandos do Cursor:** `Instrucoes Cursor/`
- **Backend:** `backend/README.md`
- **Next.js:** `nextjs-frontend/README.md`

## 🛠️ Tecnologias

### Backend

- Node.js + Express
- SQLite3
- JWT Authentication
- PM2 / NSSM (serviço Windows)

### Frontend Legado

- HTML5 + CSS3
- JavaScript Vanilla
- Chart.js

### Frontend Next.js

- Next.js 16
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion

## 🌐 Deploy

### Netlify (Frontend)

https://stately-fairy-2fee40.netlify.app

### Render (Backend)

https://controle-de-falhas-aoi.onrender.com

## 📝 Deploy Local

```bash
# Pasta principal
cd C:\Users\cad02\Desktop\projeto-aoi
git add .
git commit -m "DESCRIÇÃO"
git push
```

## 📊 Funcionalidades

- ✅ Autenticação e autorização
- ✅ Lançamento de falhas
- ✅ Dashboard com métricas
- ✅ Relatórios de qualidade
- ✅ Gestão de usuários (admin)
- ✅ Exportação de dados
- ✅ Timer de OM com shimmer effect
- ✅ Animações com Framer Motion

## 🔧 Scripts Úteis

### Sistema AOI

- `INICIAR-AMBOS-SERVIDORES.bat` - Inicia backend e frontend
- `instalar-servico.ps1` - Instala como serviço Windows
- `parar-servico.ps1` - Para o serviço
- `limpar-sistema.ps1` - Limpa logs e cache

### Otimização do Windows

- **`Comandos Windows10/EXECUTAR-OTIMIZACAO.bat`** ← Otimizar Windows
- `Comandos Windows10/otimizar-windows.ps1` - Script interativo
- `Comandos Windows10/otimizar-windows-auto.ps1` - Script automático

📖 Veja mais em: [`Comandos Windows10/README-OTIMIZACAO.md`](Comandos%20Windows10/README-OTIMIZACAO.md)

## 🆘 Suporte

Para informações detalhadas, consulte:

- `STATUS-PROJETO.md` - Status completo do projeto
- `Instrucoes Cursor/` - Guias de desenvolvimento
- `docs/` - Documentação adicional

---

**Desenvolvido para:** Controle de Falhas em Produção AOI  
**Versão:** 1.0  
**Última atualização:** Novembro 2025
