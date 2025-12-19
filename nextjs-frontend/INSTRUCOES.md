# 📋 Instruções de Uso - Frontend Next.js

## ✅ O que foi criado

1. **Pasta `nextjs-frontend/`** - Frontend Next.js separado do original
2. **Página de Login** (`/login`) - Com animação SMD preservada ✨
3. **Página de Admin** (`/admin`) - Com componentes React modernos
4. **Comunicação com backend** - Configurado para usar backend Express na porta 3001

## 🎯 Como funciona

### Estrutura
```
projeto/
├── frontend/          ← Frontend original (HTML/CSS/JS)
├── backend/           ← Backend Express (continua igual)
└── nextjs-frontend/   ← NOVO: Frontend Next.js ✨
```

### Comunicação
- **Next.js** roda na porta **3000**
- **Backend Express** continua na porta **3001**
- Next.js faz requisições para `http://localhost:3001/api/*`

## 🚀 Como testar

### 1. Instalar dependências
```bash
cd nextjs-frontend
npm install
```

### 2. Rodar o backend (se não estiver rodando)
```bash
cd ../backend
npm run dev
```
Backend deve estar em http://localhost:3001

### 3. Rodar o frontend Next.js
```bash
# Na pasta nextjs-frontend
npm run dev
```

### 4. Acessar
- http://localhost:3000/login - Página de login
- http://localhost:3000/admin - Página admin (após login)

## ✨ O que está preservado

### ✅ Animação SMD
Os componentes eletrônicos **continuam caindo ao fundo** exatamente como no original!

### ✅ Design Visual
- Mesmas cores escuras
- Mesmo logo
- Mesmos estilos
- Mesma experiência visual

### ✅ Funcionalidades
- Login funciona normalmente
- Autenticação com cookies HttpOnly
- CRUD de usuários
- Redirecionamento por role

## 🔄 Comparação: Original vs Next.js

| Aspecto | Original (HTML) | Next.js |
|---------|----------------|---------|
| **Localização** | `frontend/login.html` | `nextjs-frontend/app/login/page.tsx` |
| **Animação SMD** | ✅ JavaScript puro | ✅ React Component |
| **Backend** | Porta 3001 | Porta 3001 (igual) |
| **Roteamento** | Arquivos HTML separados | Roteamento baseado em arquivos |
| **Componentes** | innerHTML manual | React Components reutilizáveis |

## 📦 Dependências Principais

- `next` - Framework
- `react` / `react-dom` - Biblioteca React
- `framer-motion` - Animações (toast notifications)
- `lucide-react` - Ícones (mesmos visuais do original)
- `tailwindcss` - Estilos

## 🎨 Componentes Criados

1. **SMDAnimation** - Animação de componentes caindo
2. **Toast** - Notificações com animação
3. **useToast** - Hook para gerenciar toasts
4. **fetchAutenticado** - Função para chamadas à API

## ⚠️ Importante

- ✅ Backend **NÃO** muda nada
- ✅ Banco de dados continua igual
- ✅ Estado em memória (OMs) continua funcionando
- ✅ Cookies HttpOnly funcionam normalmente

## 🔮 Próximos Passos (se quiser continuar)

- [ ] Migrar página principal (index)
- [ ] Migrar página de reparo
- [ ] Migrar páginas de relatórios
- [ ] Migrar página de almoxarifado

## 💡 Dica

Você pode rodar **ambos os frontends ao mesmo tempo**:
- Frontend original: `http://localhost:5500` (via http-server)
- Frontend Next.js: `http://localhost:3000`

Eles compartilham o mesmo backend!

---

**Desenvolvido preservando 100% da experiência visual original!** 🎉

