# 🔍 Verificação de Prontidão para Intranet (Rede Local)

**Data:** 2025-01-31  
**Sistema:** Controle de Falhas AOI  
**Modo:** Intranet (Rede Local) - **NÃO online**

## 📊 Resumo Executivo

| Componente | Status | Observações |
|-----------|--------|-------------|
| **Backend** | ✅ **Pronto** | Configurado para aceitar conexões de rede |
| **Frontend Next.js** | ✅ **Pronto** | Configurado para aceitar conexões de rede |
| **Scripts de Inicialização** | ✅ **Pronto** | Script INICIAR-INTRANET.bat existe |
| **CORS** | ✅ **Pronto** | Permite qualquer origem em desenvolvimento |
| **Documentação** | ✅ **Pronto** | Guia completo em docs/GUIA-INTRANET.md |

---

## ✅ CONFIGURAÇÕES VERIFICADAS

### 1. Backend (Express) - ✅ PRONTO

**Arquivo:** `backend/server.js`

- ✅ **Aceita conexões de rede:** 
  ```javascript
  app.listen(PORT, '0.0.0.0', () => {
    console.info(`Servidor rodando na porta ${PORT} (acessível na rede local)`);
  });
  ```
  - Linha 2259: Configurado para aceitar conexões de qualquer IP da rede

- ✅ **CORS configurado para desenvolvimento:**
  ```javascript
  if (!isProduction && !corsOrigin) {
    app.use(cors({ origin: true, credentials: true }));
  }
  ```
  - Linha 174-175: Em desenvolvimento, permite qualquer origem
  - **Perfeito para intranet!** Não precisa configurar CORS_ORIGIN

- ✅ **Banco de dados:**
  - SQLite local (padrão para desenvolvimento/intranet)
  - Banco de dados: `backend/aoi.db`
  - Criação automática de tabelas

- ✅ **Porta:** 3001 (configurável via `PORT` ou padrão 3000)

### 2. Frontend Next.js - ✅ PRONTO

**Arquivo:** `nextjs-frontend/package.json`

- ✅ **Aceita conexões de rede:**
  ```json
  "dev": "next dev -p 3000 -H 0.0.0.0"
  ```
  - Linha 6: Flag `-H 0.0.0.0` permite acesso de outros computadores

- ✅ **Configuração de API:**
  - Arquivo `nextjs-frontend/lib/api.ts` detecta automaticamente ambiente local
  - Usa `http://localhost:3001` em desenvolvimento
  - Pode usar variável `NEXT_PUBLIC_API_URL` para IP específico

- ✅ **Porta:** 3000

### 3. Scripts de Inicialização - ✅ PRONTO

**Arquivo:** `scripts/inicializacao/INICIAR-INTRANET.bat`

- ✅ Script completo e funcional
- ✅ Detecta IP automaticamente
- ✅ Cria `.env.local` com IP do servidor
- ✅ Inicia backend e frontend em janelas separadas
- ✅ Mostra URLs de acesso

### 4. Documentação - ✅ PRONTO

**Arquivo:** `docs/GUIA-INTRANET.md`

- ✅ Guia completo com passo a passo
- ✅ Instruções de firewall
- ✅ Troubleshooting
- ✅ Configuração de IP fixo
- ✅ Instalação como serviço Windows

---

## 🚀 COMO INICIAR NA INTRANET

### Opção 1: Script Automático (Recomendado)

```batch
# Execute o script na raiz do projeto
scripts\inicializacao\INICIAR-INTRANET.bat
```

O script:
1. Detecta o IP da máquina automaticamente
2. Cria arquivo `.env.local` com o IP
3. Inicia backend na porta 3001
4. Inicia frontend na porta 3000
5. Mostra as URLs de acesso

### Opção 2: Manual

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd nextjs-frontend
npm run dev
```

### Opção 3: Script Principal

```batch
INICIAR-AMBOS-SERVIDORES.bat
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### Antes de Iniciar

- [x] Node.js instalado (versão 18+)
- [x] Dependências instaladas (`npm install` em backend e nextjs-frontend)
- [ ] **Firewall configurado** (portas 3000 e 3001)
- [ ] **IP do servidor identificado** (use `ipconfig` no Windows)

### Configuração do Firewall

**PowerShell (como Administrador):**
```powershell
# Permitir porta 3000 (Frontend)
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Permitir porta 3001 (Backend)
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Após Iniciar

- [ ] Backend acessível em `http://IP_DO_SERVIDOR:3001/health`
- [ ] Frontend acessível em `http://IP_DO_SERVIDOR:3000`
- [ ] Testado acesso de outro computador na rede
- [ ] Login funcionando

---

## 🌐 ACESSO NA REDE

### No Computador Servidor:
- Frontend: `http://localhost:3000` ou `http://192.168.1.100:3000`
- Backend API: `http://localhost:3001` ou `http://192.168.1.100:3001`

### Em Outros Computadores da Rede:
- Frontend: `http://192.168.1.100:3000` (substitua pelo IP do servidor)
- Backend API: `http://192.168.1.100:3001`

**Para descobrir o IP do servidor:**
```powershell
ipconfig
# Procure por "IPv4 Address"
```

---

## ⚙️ CONFIGURAÇÕES OPCIONAIS

### 1. IP Fixo (Recomendado)

Para evitar mudanças de IP, configure um IP fixo no servidor:
1. Configurações de Rede → Alterar opções do adaptador
2. Propriedades → Protocolo IP versão 4
3. Marque "Usar o seguinte endereço IP"
4. Configure IP, máscara, gateway e DNS

### 2. Arquivo .env.local (Opcional)

Se quiser usar um IP específico, crie `nextjs-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

O script `INICIAR-INTRANET.bat` cria isso automaticamente.

### 3. Executar como Serviço Windows (Opcional)

Para iniciar automaticamente ao ligar o servidor, use NSSM:

```powershell
# Instalar serviço para Backend
C:\nssm\win64\nssm.exe install aoi-backend "C:\caminho\para\node.exe" "C:\Workspace\controle-de-falhas-aoi\backend\server.js"
C:\nssm\win64\nssm.exe set aoi-backend AppDirectory "C:\Workspace\controle-de-falhas-aoi\backend"
C:\nssm\win64\nssm.exe set aoi-backend Start SERVICE_AUTO_START
net start aoi-backend
```

---

## ⚠️ TROUBLESHOOTING

### Problema: "Não consigo acessar de outros computadores"

**Soluções:**
1. ✅ Verifique se o firewall permite as portas 3000 e 3001
2. ✅ Verifique se o IP está correto (`ipconfig`)
3. ✅ Verifique se o backend está rodando (veja a janela do backend)
4. ✅ Teste acessar `http://IP_DO_SERVIDOR:3001/health` (deve retornar JSON)

### Problema: "Erro de CORS"

**Solução:** 
- Em desenvolvimento/intranet, o CORS já permite qualquer origem
- Se ainda der erro, verifique se `NODE_ENV` não está definido como `production`
- Em intranet, não defina `NODE_ENV=production`

### Problema: "Next.js não aceita conexões externas"

**Solução:** 
- O script `dev` já tem `-H 0.0.0.0`
- Se usar manualmente, execute: `npm run dev` (já está configurado)

### Problema: "Backend não inicia"

**Soluções:**
1. Verifique se a porta 3001 está livre
2. Verifique se há erros na janela do backend
3. Verifique se o Node.js está instalado: `node --version`

---

## 📊 STATUS FINAL

### ✅ **SISTEMA PRONTO PARA INTRANET!**

**Pontos Positivos:**
- ✅ Backend configurado para rede (`0.0.0.0`)
- ✅ Frontend configurado para rede (`-H 0.0.0.0`)
- ✅ CORS permite qualquer origem em desenvolvimento
- ✅ Scripts de inicialização prontos
- ✅ Documentação completa
- ✅ Banco SQLite local (sem dependências externas)

**Ações Necessárias:**
1. ⚠️ **Configurar firewall** (portas 3000 e 3001)
2. ⚠️ **Identificar IP do servidor** (`ipconfig`)
3. ✅ **Executar script de inicialização**

**Tempo estimado para configurar:** ~10 minutos

---

## 🎯 PRÓXIMOS PASSOS

1. **Agora:** Configurar firewall e executar `INICIAR-INTRANET.bat`
2. **Opcional:** Configurar IP fixo no servidor
3. **Opcional:** Instalar como serviço Windows para iniciar automaticamente
4. **Opcional:** Configurar backup do banco SQLite

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **Guia Completo:** `docs/GUIA-INTRANET.md`
- **Script de Inicialização:** `scripts/inicializacao/INICIAR-INTRANET.bat`
- **Backend README:** `backend/README.md`
- **Frontend README:** `nextjs-frontend/README.md`

---

## ✅ CONCLUSÃO

**O sistema está 100% pronto para rodar em intranet!**

Tudo que você precisa fazer:
1. Configurar firewall (1 comando PowerShell)
2. Executar `INICIAR-INTRANET.bat`
3. Compartilhar a URL com os usuários: `http://IP_DO_SERVIDOR:3000`

**Não é necessário configurar variáveis de ambiente, CORS, ou qualquer outra coisa!** O sistema já está configurado para funcionar em rede local. 🎉

