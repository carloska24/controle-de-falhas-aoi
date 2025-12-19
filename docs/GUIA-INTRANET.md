# 🌐 Guia: Rodar o Projeto na Intranet da Empresa

Este guia explica como configurar e executar o sistema de Controle de Falhas AOI na intranet da sua empresa.

## 📋 Pré-requisitos

1. **Servidor/Computador na Rede:**
   - Windows 10/11 ou Windows Server
   - Node.js instalado (versão 18 ou superior)
   - Acesso à rede local da empresa

2. **Portas Necessárias:**
   - **Porta 3000**: Frontend Next.js
   - **Porta 3001**: Backend Express/API
   - Certifique-se de que o firewall permite essas portas

## 🚀 Passo a Passo

### 1. Descobrir o IP da Máquina

**No Windows (PowerShell ou CMD):**
```powershell
ipconfig
```

Procure por **IPv4 Address** (ex: `192.168.1.100`)

### 2. Configurar o Backend para Rede

O backend já está configurado para aceitar conexões de rede (`0.0.0.0`), então ele já aceita conexões de outros computadores na rede.

**Verifique o arquivo `backend/server.js`:**
```javascript
app.listen(PORT, '0.0.0.0', () => {
    console.info(`Servidor rodando na porta ${PORT} (acessível na rede local)`);
});
```

### 3. Configurar o Frontend Next.js para Rede

**Opção A: Criar arquivo `.env.local` (Recomendado)**

Crie o arquivo `nextjs-frontend/.env.local`:

```env
# URL do Backend na Intranet
# Substitua 192.168.1.100 pelo IP do servidor
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

**Opção B: Modificar o script de desenvolvimento**

Edite `nextjs-frontend/package.json` e altere o script `dev`:

```json
{
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0"
  }
}
```

Isso permite que o Next.js aceite conexões de outros computadores na rede.

### 4. Configurar CORS no Backend (se necessário)

Se o backend rejeitar requisições, verifique/adicione o CORS no `backend/server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.100:3000',  // IP do servidor
    // Adicione outros IPs da rede se necessário
  ],
  credentials: true
}));
```

### 5. Iniciar os Servidores

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

Você verá: `Servidor rodando na porta 3001 (acessível na rede local)`

**Terminal 2 - Frontend:**
```bash
cd nextjs-frontend
npm run dev
```

### 6. Acessar na Intranet

**No computador servidor:**
- Frontend: `http://localhost:3000` ou `http://192.168.1.100:3000`

**Em outros computadores da rede:**
- Frontend: `http://192.168.1.100:3000` (substitua pelo IP do servidor)

## 🔧 Configuração Automática (Scripts)

### Criar Script para Iniciar na Rede

Crie o arquivo `INICIAR-INTRANET.bat`:

```batch
@echo off
echo ============================================
echo Iniciando Sistema para Intranet
echo ============================================
echo.

REM Obter IP da máquina
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set IP=%%a
set IP=%IP:~1%
echo IP da maquina: %IP%
echo.

REM Criar arquivo .env.local se não existir
if not exist "nextjs-frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://%IP%:3001 > nextjs-frontend\.env.local
    echo Arquivo .env.local criado com IP: %IP%
)

echo Iniciando Backend...
start "Backend - Porta 3001" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend...
start "Frontend - Porta 3000" cmd /k "cd nextjs-frontend && npm run dev"

echo.
echo ============================================
echo Servidores iniciados!
echo.
echo Acesse em outros computadores:
echo Frontend: http://%IP%:3000
echo ============================================
pause
```

## 🛡️ Configurar Firewall do Windows

### Permitir Portas no Firewall

**No PowerShell (como Administrador):**
```powershell
# Permitir porta 3000 (Frontend)
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Permitir porta 3001 (Backend)
New-NetFirewallRule -DisplayName "Controle Falhas AOI - Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Ou via Interface Gráfica:**
1. Abra "Firewall do Windows Defender"
2. Clique em "Configurações Avançadas"
3. Clique em "Regras de Entrada" → "Nova Regra"
4. Selecione "Porta" → Next
5. TCP → Portas específicas: `3000, 3001` → Next
6. "Permitir a conexão" → Next
7. Marque todos os perfis → Next
8. Nome: "Controle Falhas AOI" → Finish

## 📝 Configuração com IP Fixo (Recomendado)

Para evitar mudanças de IP, configure um IP fixo no servidor:

1. Abra "Configurações de Rede" no Windows
2. Vá em "Alterar opções do adaptador"
3. Clique com botão direito no adaptador → "Propriedades"
4. Selecione "Protocolo IP versão 4 (TCP/IPv4)" → "Propriedades"
5. Marque "Usar o seguinte endereço IP"
6. Configure:
   - **IP**: `192.168.1.100` (exemplo - use um IP disponível na sua rede)
   - **Máscara**: `255.255.255.0`
   - **Gateway**: `192.168.1.1` (IP do roteador)
   - **DNS**: `8.8.8.8` e `8.8.4.4`

## 🚀 Executar como Serviço do Windows (Opcional)

Para que o sistema inicie automaticamente ao ligar o servidor, você pode usar o NSSM (Non-Sucking Service Manager):

### Instalar Backend como Serviço

```powershell
# Baixar NSSM (se não tiver)
# https://nssm.cc/download

# Instalar serviço para Backend
C:\nssm\win64\nssm.exe install aoi-backend "C:\caminho\para\node.exe" "C:\Workspace\controle-de-falhas-aoi\backend\server.js"
C:\nssm\win64\nssm.exe set aoi-backend AppDirectory "C:\Workspace\controle-de-falhas-aoi\backend"
C:\nssm\win64\nssm.exe set aoi-backend Start SERVICE_AUTO_START

# Iniciar serviço
net start aoi-backend
```

## 📱 Compartilhar URL na Intranet

Após iniciar, compartilhe a URL com os usuários:

```
http://192.168.1.100:3000
```

Substitua `192.168.1.100` pelo IP real do servidor.

## ⚠️ Troubleshooting

### Problema: "Não consigo acessar de outros computadores"

**Soluções:**
1. Verifique se o firewall permite as portas 3000 e 3001
2. Verifique se o IP está correto (`ipconfig`)
3. Verifique se o backend está rodando em `0.0.0.0` (não apenas `localhost`)
4. Teste acessar `http://IP_DO_SERVIDOR:3001/api/health` (deve retornar JSON)

### Problema: "Erro de CORS"

**Solução:** Adicione o IP do servidor na lista de origens permitidas no CORS do backend.

### Problema: "Next.js não aceita conexões externas"

**Solução:** Use `-H 0.0.0.0` ao iniciar:
```bash
npm run dev -- -H 0.0.0.0
```

Ou modifique o script no `package.json`:
```json
"dev": "next dev -p 3000 -H 0.0.0.0"
```

## 📊 Checklist de Configuração

- [ ] IP do servidor identificado
- [ ] Firewall configurado (portas 3000 e 3001)
- [ ] Arquivo `.env.local` criado com IP correto
- [ ] Backend iniciado e acessível na rede
- [ ] Frontend iniciado com `-H 0.0.0.0`
- [ ] Testado acesso de outro computador
- [ ] CORS configurado (se necessário)
- [ ] IP fixo configurado (recomendado)

## 🎯 Próximos Passos

1. **Configurar DNS interno** (opcional): Configurar um nome amigável como `controle-aoi.empresa.local`
2. **Usar HTTPS** (opcional): Configurar certificado SSL para acesso seguro
3. **Backup automático**: Configurar backup do banco de dados
4. **Monitoramento**: Configurar logs e monitoramento do sistema

---

**Suporte:** Em caso de dúvidas, verifique os logs do backend e frontend para identificar erros específicos.

