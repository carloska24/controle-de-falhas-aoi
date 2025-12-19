# 🏗️ Arquitetura do Projeto Next.js

## 📋 Visão Geral

Este projeto usa uma arquitetura **separada** com dois servidores:

### 1. 🎨 Frontend Next.js (Porta 3000)
- **Localização**: `nextjs-frontend/`
- **Função**: Interface do usuário (React/Next.js)
- **Comandos**:
  ```bash
  cd nextjs-frontend
  npm run dev
  ```
- **URL**: http://localhost:3000

### 2. 🔧 Backend Express (Porta 3001)
- **Localização**: `backend/`
- **Função**: API REST, banco de dados, lógica de negócio
- **Comandos**:
  ```bash
  cd backend
  node server.js
  ```
- **URL**: http://localhost:3001

## 🔄 Como Funcionam Juntos

O Next.js faz **proxy/rewrite** das requisições `/api/*` para o backend Express:

```javascript
// next.config.js
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/api/:path*',
    },
  ];
}
```

### Exemplo:
- **Frontend faz requisição**: `http://localhost:3000/api/registros`
- **Next.js redireciona para**: `http://localhost:3001/api/registros`
- **Backend responde** e Next.js retorna para o frontend

## ⚠️ IMPORTANTE

**Você precisa ter AMBOS os servidores rodando:**

1. ✅ Backend Express na porta 3001
2. ✅ Frontend Next.js na porta 3000

## 🚀 Como Iniciar Tudo

### Opção 1: Manual
```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend Next.js
cd nextjs-frontend
npm run dev
```

### Opção 2: Scripts Automatizados
- Execute `INICIAR-TUDO.bat` (se existir)
- Ou use os scripts individuais

## 🌐 URLs

- **Frontend**: http://localhost:3000/index
- **Backend API**: http://localhost:3001/api/*
- **Login**: http://localhost:3000/login
- **Admin**: http://localhost:3000/admin

