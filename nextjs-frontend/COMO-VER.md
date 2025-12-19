# 🚀 Como Ver o Frontend Next.js

## Passo a Passo Rápido

### ✅ PASSO 1: Instalar Dependências

Abra o PowerShell na pasta do projeto e execute:

```powershell
cd nextjs-frontend
npm install
```

**Isso vai demorar uns 2-3 minutos** na primeira vez (baixa todas as bibliotecas).

---

### ✅ PASSO 2: Garantir que o Backend está Rodando

O backend precisa estar rodando na **porta 3001**.

Abra um **NOVO terminal/PowerShell** e execute:

```powershell
cd backend
npm run dev
```

Você deve ver algo como:
```
Servidor rodando na porta 3001
```

**DEIXE ESTE TERMINAL ABERTO!**

---

### ✅ PASSO 3: Rodar o Frontend Next.js

No primeiro terminal (ainda na pasta `nextjs-frontend`), execute:

```powershell
npm run dev
```

Você deve ver:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
- Ready in X.XXs
```

---

### ✅ PASSO 4: Abrir no Navegador

1. Abra seu navegador (Chrome, Edge, Firefox)
2. Acesse: **http://localhost:3000/login**

Você verá:
- ✨ **Componentes SMD caindo ao fundo** (animação preservada!)
- 🎨 **Design escuro** (igual ao original)
- 📝 **Formulário de login** funcional

---

### ✅ PASSO 5: Fazer Login

Use as mesmas credenciais do sistema original:
- **Usuário:** `DevAdmin` (ou qualquer admin que você tenha)
- **Senha:** `123456` (senha padrão em dev)

Após login como admin, você será redirecionado para:
- **http://localhost:3000/admin** - Página admin migrada!

---

## 📸 O Que Você Verá

### Página de Login (`/login`)
- ✅ Logo animado no topo
- ✅ **Componentes eletrônicos caindo ao fundo** (resistores, capacitores, LEDs, etc.)
- ✅ Formulário de login estilizado
- ✅ Botão de mostrar/ocultar senha

### Página Admin (`/admin`)
- ✅ Tabela de usuários
- ✅ Formulário de cadastro
- ✅ Botões de editar, resetar senha, excluir
- ✅ Toast notifications animadas

---

## ⚠️ Problemas Comuns

### Erro: "Cannot find module"
```powershell
# Execute novamente:
cd nextjs-frontend
npm install
```

### Erro: "Port 3000 is already in use"
```powershell
# Ou feche o processo que está usando a porta 3000
# Ou mude a porta no package.json:
# "dev": "next dev -p 3001"  (mas aí conflita com backend)
```

### Erro: "ECONNREFUSED" ao fazer login
- Verifique se o **backend está rodando** na porta 3001
- Confirme que vê a mensagem no terminal do backend

### Erro de CORS
- O backend precisa ter `CORS_ORIGIN` configurado
- Em dev, geralmente funciona automaticamente

---

## 🎯 Resumo dos Comandos

```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend Next.js
cd nextjs-frontend
npm install          # Só na primeira vez
npm run dev
```

Depois abra: **http://localhost:3000/login**

---

## ✨ Diferencial Visual

Você verá:
- Mesma animação de componentes caindo
- Mesmo design escuro
- **MAS** com componentes React (mais organizados no código)
- Toasts animados (notificações mais suaves)
- Ícones mais nítidos

---

**Está pronto para testar! 🚀**

