# 🚀 Guia Rápido - Configuração em Novo PC

Este guia ajuda você a configurar o projeto **Controle de Falhas AOI** em um novo computador com a mesma versão que está no PC atual.

---

## ✅ Pré-requisitos

### 1. Node.js (OBRIGATÓRIO)
- **Versão mínima:** Node.js 18 ou superior
- **Download:** https://nodejs.org/
- **Recomendado:** Versão LTS (Long Term Support)

> **💡 Dica:** Após instalar o Node.js, npm será instalado automaticamente.

### 2. Git (Opcional)
- Necessário apenas se você for clonar o repositório
- **Download:** https://git-scm.com/

---

## 📋 Passo a Passo

### Opção 1: Script Automático (RECOMENDADO) ⭐

1. **Copie o projeto** para o novo PC (via pendrive, OneDrive, etc.)

2. **Execute o script:**
   ```
   INSTALAR-TUDO.bat
   ```
   - O script irá:
     - ✅ Verificar Node.js
     - ✅ Instalar dependências do backend
     - ✅ Instalar dependências do frontend (Next.js 16.0.1)
     - ✅ Criar arquivo .env se necessário
     - ✅ Verificar instalação

3. **Inicie os servidores:**
   ```
   INICIAR-AMBOS-SERVIDORES.bat
   ```

### Opção 2: Instalação Manual

#### 1. Verificar Node.js
```powershell
node --version
# Deve mostrar v18.x.x ou superior
```

#### 2. Instalar dependências do Backend
```powershell
cd backend
npm ci
# ou: npm install
cd ..
```

#### 3. Instalar dependências do Frontend
```powershell
cd nextjs-frontend
npm ci
# ou: npm install
cd ..
```

#### 4. Configurar .env do Backend
Se não existir `backend/.env`, copie de `backend/.env.example` ou crie com:
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=local-dev-secret-change-in-production
DEV_SEED_KEY=local-dev-2024
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:3000
```

#### 5. Iniciar servidores

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd nextjs-frontend
npm run dev
```

---

## 📦 Versões Instaladas

### Backend
- **Express:** 5.1.0
- **Node.js:** 18+ (requerido)

### Frontend
- **Next.js:** 16.0.1
- **React:** 18.3.1
- **TypeScript:** 5.x
- **Framer Motion:** 11.3.5
- **Chart.js:** 4.4.4

---

## 🔍 Verificação Pós-Instalação

Execute para verificar se tudo está correto:

```powershell
# Verificar Node.js
node --version

# Verificar Next.js
cd nextjs-frontend
npm list next
cd ..

# Verificar Express
cd backend
npm list express
cd ..
```

---

## 🌐 Acessar o Sistema

Após iniciar os servidores:

- **Frontend:** http://localhost:3000/index
- **Backend API:** http://localhost:3001

---

## ❗ Problemas Comuns

### Erro: "Node.js não encontrado"
- **Solução:** Instale Node.js 18+ de https://nodejs.org/
- Reinicie o terminal após instalar

### Erro: "npm não encontrado"
- **Solução:** Node.js inclui npm. Reinstale Node.js se necessário

### Erro: "Port 3000 already in use"
- **Solução:** Feche outros programas usando a porta 3000
- Ou altere a porta em `nextjs-frontend/package.json`: `"dev": "next dev -p 3001"`

### Erro: "Port 3001 already in use"
- **Solução:** Feche outros programas usando a porta 3001
- Ou altere a porta em `backend/.env`: `PORT=3002`

### Dependências não instalam
- **Solução:** Verifique sua conexão com a internet
- Tente: `npm cache clean --force`
- Depois: `npm install` novamente

### Banco de dados não encontrado
- **Solução:** O sistema criará um novo banco SQLite vazio automaticamente
- Se precisar restaurar dados, copie `backend/aoi.db` do PC antigo

---

## 📝 Notas Importantes

1. **Primeira execução:** Pode demorar mais devido à compilação do Next.js
2. **Hot Reload:** Mudanças no código recarregam automaticamente
3. **Banco de dados:** Se você tem dados no PC antigo, copie `backend/aoi.db`
4. **Variáveis de ambiente:** Personalize `backend/.env` conforme necessário

---

## 🎯 Estrutura do Projeto

```
controle-de-falhas-aoi/
├── backend/              # Servidor Express (porta 3001)
│   ├── server.js        # Servidor principal
│   ├── package.json     # Dependências do backend
│   └── .env            # Configurações (criar se não existir)
│
├── nextjs-frontend/     # Aplicação Next.js (porta 3000)
│   ├── app/             # Páginas (App Router)
│   ├── components/      # Componentes React
│   └── package.json    # Dependências do frontend
│
├── INSTALAR-TUDO.bat           # Script de instalação ⭐
└── INICIAR-AMBOS-SERVIDORES.bat # Script para iniciar tudo ⭐
```

---

## ✅ Checklist Rápido

Antes de começar a trabalhar, verifique:

- [ ] Node.js 18+ instalado
- [ ] Dependências do backend instaladas (`cd backend && npm ci`)
- [ ] Dependências do frontend instaladas (`cd nextjs-frontend && npm ci`)
- [ ] Arquivo `backend/.env` configurado
- [ ] Servidores iniciados e funcionando
- [ ] Acessa http://localhost:3000/index sem erros

---

**💡 Dica:** Use `INSTALAR-TUDO.bat` para automatizar toda a instalação!

---

**Última atualização:** Janeiro 2025

