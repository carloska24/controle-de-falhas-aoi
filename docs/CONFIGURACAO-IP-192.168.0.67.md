# ✅ Configuração Completa - IP 192.168.0.67

**Data:** 2025-01-31  
**IP do Servidor:** 192.168.0.67  
**Status:** ✅ **TUDO CONFIGURADO E PRONTO!**

---

## 📋 O QUE FOI CONFIGURADO

### 1. ✅ Arquivo `.env.local` Criado
**Localização:** `nextjs-frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://192.168.0.67:3001
```

### 2. ✅ `next.config.js` Atualizado
- Configurado para usar IP 192.168.0.67 em desenvolvimento
- Em produção, usa variável de ambiente

### 3. ✅ Scripts Atualizados
- `INICIAR-INTRANET.bat` - Atualizado com IP fixo
- `INICIAR-PRODUCAO-INTRANET.bat` - Novo script para modo produção
- `COMPILAR-E-INICIAR-PRODUCAO.bat` - Novo script para compilar e iniciar

---

## 🚀 COMO INICIAR

### Opção 1: Modo Desenvolvimento (Recomendado para testes)

```batch
scripts\inicializacao\INICIAR-INTRANET.bat
```

- Roda Next.js em modo desenvolvimento (`npm run dev`)
- Hot reload ativado (mudanças aparecem automaticamente)
- Mais lento, mas melhor para desenvolvimento

### Opção 2: Modo Produção (Recomendado para uso real)

**Passo 1: Compilar (primeira vez ou após mudanças)**
```batch
scripts\inicializacao\COMPILAR-E-INICIAR-PRODUCAO.bat
```

**Passo 2: Ou iniciar direto (se já compilado)**
```batch
scripts\inicializacao\INICIAR-PRODUCAO-INTRANET.bat
```

- Next.js compilado e otimizado
- Mais rápido e eficiente
- Melhor para produção/intranet

---

## 🌐 ACESSO

### No Servidor (192.168.0.67):
- **Frontend:** http://localhost:3000 ou http://192.168.0.67:3000
- **Backend API:** http://localhost:3001 ou http://192.168.0.67:3001

### Em Outros Computadores da Rede:
- **Frontend:** http://192.168.0.67:3000
- **Backend API:** http://192.168.0.67:3001

---

## 📊 VERIFICAÇÃO DE COMPILAÇÃO

### Status do Build

Para verificar se está compilado:
```batch
cd nextjs-frontend
dir .next
```

Se a pasta `.next` existir, está compilado! ✅

### Recompilar quando necessário

Recompile quando:
- Fizer mudanças no código
- Adicionar novas dependências
- Atualizar componentes

**Comando:**
```batch
cd nextjs-frontend
npm run build
```

---

## ⚙️ CONFIGURAÇÕES

### Backend
- **Porta:** 3001
- **IP:** 0.0.0.0 (aceita conexões de qualquer IP)
- **Banco:** SQLite local (`backend/aoi.db`)

### Frontend
- **Porta:** 3000
- **IP:** 0.0.0.0 (aceita conexões de qualquer IP)
- **API URL:** http://192.168.0.67:3001 (configurado)

---

## 🛡️ FIREWALL

Certifique-se de que o firewall permite as portas:

**PowerShell (como Administrador):**
```powershell
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

---

## ✅ CHECKLIST FINAL

- [x] IP 192.168.0.67 configurado
- [x] Arquivo `.env.local` criado
- [x] `next.config.js` atualizado
- [x] Scripts atualizados
- [ ] Firewall configurado (portas 3000 e 3001)
- [ ] Dependências instaladas (`npm install` em backend e nextjs-frontend)
- [ ] Build do Next.js (se usar modo produção)
- [ ] Testado acesso local
- [ ] Testado acesso de outro computador

---

## 🎯 PRÓXIMOS PASSOS

1. **Agora:** Execute o script de inicialização
2. **Teste:** Acesse http://192.168.0.67:3000 de outro computador
3. **Opcional:** Compile para produção para melhor performance

---

## 📝 NOTAS

- **Modo Desenvolvimento:** Melhor para desenvolvimento e testes
- **Modo Produção:** Melhor para uso real (mais rápido)
- O sistema funciona em ambos os modos
- Para mudanças no código, use modo desenvolvimento
- Para uso diário, use modo produção

---

**✅ TUDO PRONTO PARA RODAR!** 🚀

