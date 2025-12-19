# 🎯 COMO VER O FRONTEND NEXT.JS - GUIA RÁPIDO

## ⚡ COMANDOS RÁPIDOS (Copie e Cole)

### 1️⃣ Primeiro Terminal - Backend (SE NÃO ESTIVER RODANDO)

```powershell
cd C:\Workspace\controle-de-falhas-aoi\backend
npm run dev
```

**✅ Deixe este terminal aberto!**

---

### 2️⃣ Segundo Terminal - Frontend Next.js

```powershell
cd C:\Workspace\controle-de-falhas-aoi\nextjs-frontend
npm run dev
```

Você verá algo assim:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

---

### 3️⃣ Abrir no Navegador

**Acesse:** http://localhost:3000/login

---

## 🎨 O QUE VOCÊ VERÁ

### Na Página de Login:
- ✨ **Componentes eletrônicos caindo ao fundo** (resistores, capacitores, LEDs)
- 🎯 Logo animado no topo
- 📝 Formulário de login estilizado
- 👁️ Botão para mostrar/ocultar senha

### Após Login (Admin):
- 📊 Tabela de usuários
- ➕ Formulário de cadastro
- ✏️ Botões de editar/resetar/excluir
- 🔔 Notificações animadas (toasts)

---

## 🔑 CREDENCIAIS DE TESTE

- **Usuário:** `DevAdmin`
- **Senha:** `123456`

---

## ✅ CHECKLIST

Antes de começar, verifique:

- [ ] Backend está rodando na porta 3001?
- [ ] Dependências instaladas? (`npm install` já foi feito ✅)
- [ ] Dois terminais abertos? (um para backend, outro para frontend)

---

## 🆘 SE DER ERRO

### "Port 3000 is already in use"
```powershell
# Fecha o processo ou usa outra porta
# Edite package.json: "dev": "next dev -p 3001"
```

### "Cannot connect to backend"
- Verifique se backend está rodando
- Abra: http://localhost:3001/health (deve retornar {"status":"ok"})

### "Module not found"
```powershell
cd C:\Workspace\controle-de-falhas-aoi\nextjs-frontend
npm install
```

---

**Está tudo pronto! Só rodar os comandos acima! 🚀**

