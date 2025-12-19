# Guia de Scripts PowerShell

Este documento contém todos os scripts PowerShell disponíveis no projeto, suas funções e como executá-los corretamente.

## ⚠️ IMPORTANTE: PowerShell 5.1 vs PowerShell 7+

Este projeto usa **PowerShell 5.1** (padrão do Windows 10/11).

**IMPORTANTE**: No PowerShell 5.1, **NÃO** use `&&` para encadear comandos. Use `;` ou execute cada comando separadamente.

❌ **ERRADO**: `cd scripts && .\script.ps1`  
✅ **CORRETO**: `cd scripts ; .\script.ps1`  
✅ **OU MELHOR**: `.\scripts\script.ps1` (a partir da raiz do projeto)

---

## 📁 Estrutura de Scripts

```
controle-de-falhas-aoi/
├── scripts/                          # Scripts principais
│   ├── limpar-sistema.ps1           # Limpeza de sistema
│   ├── parar-servico.ps1            # Gerenciar serviço (avançado)
│   ├── restore-db.ps1               # Restaurar banco de dados
│   └── setup_and_run.ps1            # Setup inicial e iniciar backend
├── parar-servico.ps1                 # Gerenciar serviço (simples, raiz)
├── instalar-servico.ps1              # Instalar serviço (raiz)
├── install-nssm.ps1                  # Configurar NSSM (raiz)
├── setup_and_run_all.ps1             # Setup completo (raiz)
├── recover-nssm.ps1                  # Recuperar NSSM (raiz)
├── cleanup.ps1                       # Limpeza geral (raiz)
└── backend/
    └── bin/
        └── setup-backend.ps1         # Setup do backend
```

---

## 🎯 Scripts Principais (pasta `scripts/`)

### 1️⃣ `limpar-sistema.ps1` - Limpeza de Sistema

**Função**: Remove processos desnecessários, arquivos temporários, cache e logs antigos do Windows.

**Localização**: `scripts/limpar-sistema.ps1`

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Ajuda detalhada
.\scripts\limpar-sistema.ps1 -Help

# Menu interativo
.\scripts\limpar-sistema.ps1

# Limpar tudo de uma vez
.\scripts\limpar-sistema.ps1 -Tudo

# Opções individuais
.\scripts\limpar-sistema.ps1 -LimparProcessos      # Para processos (OneDrive, Discord, etc.)
.\scripts\limpar-sistema.ps1 -LimparTemporarios    # Remove arquivos temporários
.\scripts\limpar-sistema.ps1 -LimparCache          # Limpa cache do npm, Node.js e Windows
.\scripts\limpar-sistema.ps1 -LimparLogs           # Remove logs antigos (>30 dias)

# Combinar opções
.\scripts\limpar-sistema.ps1 -LimparTemporarios -LimparCache
```

**O que faz**:
- Para processos desnecessários (OneDrive, Discord, Skype, Steam, etc.)
- Remove arquivos temporários do Windows
- Limpa cache do npm e Node.js
- Remove logs antigos (mais de 30 dias)
- Limpa a lixeira
- Exibe resumo do espaço liberado

**Exemplo de saída**:
```
=== Limpeza de Sistema ===

[1/4] Limpando processos desnecessários...
  Parando: OneDrive (PID: 10148)
  [OK] Processos parados: 1

[2/4] Limpando arquivos temporários...
  [OK] Limpado: C:\Users\user\AppData\Local\Temp (1132.99 MB)

[3/4] Limpando cache de aplicações...
  [OK] Cache do Node.js limpo (750.2 MB)

[4/4] Limpando logs antigos...
  [OK] Logs antigos removidos (16.06 MB)

=== Resumo da Limpeza ===
  Processos parados: 1
  Espaço liberado: 1969.28 MB (1.92 GB)

[OK] Limpeza concluida!
```

---

### 2️⃣ `parar-servico.ps1` - Gerenciar Serviço aoi-backend

**Função**: Gerencia o serviço Windows `aoi-backend` (parar, iniciar, reiniciar, verificar status).

**Localização**: `scripts/parar-servico.ps1`

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Menu interativo
.\scripts\parar-servico.ps1

# Comandos específicos
.\scripts\parar-servico.ps1 -Action stop      # Parar serviço
.\scripts\parar-servico.ps1 -Action start     # Iniciar serviço
.\scripts\parar-servico.ps1 -Action restart   # Reiniciar serviço
.\scripts\parar-servico.ps1 -Action status    # Verificar status
```

**Diferença entre os dois parar-servico.ps1**:
- `scripts/parar-servico.ps1` - Versão avançada com menu interativo e parada de processos Node.js como fallback
- `parar-servico.ps1` (raiz) - Versão simples que solicita elevação de privilégios

**Menu interativo**:
```
=== Gerenciador do Serviço aoi-backend ===

Selecione a ação desejada:
  1. Parar serviço
  2. Iniciar serviço
  3. Reiniciar serviço
  4. Verificar status
  5. Sair

Digite o número (1-5):
```

---

### 3️⃣ `restore-db.ps1` - Restaurar Banco de Dados

**Função**: Restaura arquivos de banco de dados a partir de um arquivo ZIP de backup.

**Localização**: `scripts/restore-db.ps1`

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Restaurar do arquivo padrão (aoi-db-backup.zip na raiz)
.\scripts\restore-db.ps1

# Especificar caminho do ZIP
.\scripts\restore-db.ps1 -ZipPath C:\backups\aoi-db-backup.zip
```

**O que faz**:
1. Verifica se o arquivo ZIP existe
2. Para processos Node.js em execução (se necessário)
3. Extrai arquivos `aoi.db*` para uma pasta temporária
4. Copia arquivos para `backend/`
5. Remove pasta temporária
6. Exibe mensagem de sucesso

**⚠️ IMPORTANTE**: Este script interrompe processos Node.js em execução. Certifique-se de parar o backend antes de restaurar.

**Pré-requisitos**:
- Arquivo ZIP com pelo menos um arquivo `aoi.db` ou `aoi.db-*`
- Pasta `backend/` existente
- PowerShell com permissões de escrita

---

### 4️⃣ `setup_and_run.ps1` - Setup Inicial e Iniciar Backend

**Função**: Configuração inicial do projeto e inicia o backend em modo desenvolvimento.

**Localização**: `scripts/setup_and_run.ps1`

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Setup completo sem restaurar DB
.\scripts\setup_and_run.ps1

# Setup e restaurar DB do arquivo padrão
.\scripts\setup_and_run.ps1 -RestoreZipPath "aoi-db-backup.zip"

# Setup e restaurar DB de caminho específico
.\scripts\setup_and_run.ps1 -RestoreZipPath "C:\backups\aoi-db-backup.zip"

# Setup sem instalar dependências (útil se já instalou antes)
.\scripts\setup_and_run.ps1 -NoInstall
```

**O que faz**:
1. Verifica se Node.js está instalado
2. Instala dependências do backend (`npm install` na pasta `backend/`)
3. Opcionalmente restaura banco de dados
4. Inicia backend em modo desenvolvimento (`npm run dev`)

**Pré-requisitos**:
- Node.js v16+ instalado
- Conexão com internet (para instalar dependências)

---

## 🔧 Scripts de Instalação de Serviço (raiz)

### `install-nssm.ps1` - Instalar/Remover Serviço com NSSM

**Função**: Instala ou remove o serviço Windows `aoi-backend` usando NSSM (Non-Sucking Service Manager).

**Localização**: `install-nssm.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto, **como Administrador**):

```powershell
# Instalar serviço
.\install-nssm.ps1 install

# Remover serviço
.\install-nssm.ps1 uninstall

# Parâmetros avançados
.\install-nssm.ps1 install -NssmPath "C:\caminho\nssm.exe" -Port 3001
```

**O que faz**:
1. Verifica se está executando como Administrador
2. Verifica se NSSM está instalado (baixa automaticamente se necessário)
3. Configura serviço com NSSM
4. Define variáveis de ambiente
5. Configura logs
6. Inicia o serviço

**⚠️ IMPORTANTE**: Este script deve ser executado como **Administrador**.

**Pré-requisitos**:
- PowerShell com privilégios de Administrador
- NSSM instalado em `C:\nssm\win64\nssm.exe` (ou especificado via `-NssmPath`)
- Node.js instalado
- Projeto configurado corretamente

---

### `instalar-servico.ps1` - Instalador Auxiliar

**Função**: Script auxiliar que executa `install-nssm.ps1` com elevação automática de privilégios.

**Localização**: `instalar-servico.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Instalar serviço
.\instalar-servico.ps1 -Action install

# Remover serviço
.\instalar-servico.ps1 -Action uninstall

# Verificar status
.\instalar-servico.ps1 -Action status
```

**Vantagem**: Solicita automaticamente privilégios de Administrador se necessário.

---

### `parar-servico.ps1` - Gerenciar Serviço (Raiz)

**Função**: Gerencia o serviço Windows `aoi-backend` (versão simplificada).

**Localização**: `parar-servico.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto):

```powershell
# Parar serviço
.\parar-servico.ps1 -Action stop

# Iniciar serviço
.\parar-servico.ps1 -Action start

# Reiniciar serviço
.\parar-servico.ps1 -Action restart

# Verificar status
.\parar-servico.ps1 -Action status
```

**Diferença da versão em `scripts/`**: Esta versão solicita elevação de privilégios automaticamente.

---

## 🗑️ Scripts de Limpeza

### `cleanup.ps1` - Limpeza Geral

**Função**: Script de limpeza geral do projeto.

**Localização**: `cleanup.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto):

```powershell
.\cleanup.ps1
```

---

## 🆘 Scripts de Recuperação

### `recover-nssm.ps1` - Recuperar NSSM

**Função**: Recupera configurações do NSSM em caso de problemas.

**Localização**: `recover-nssm.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto, **como Administrador**):

```powershell
.\recover-nssm.ps1
```

---

## 🔄 Scripts de Setup Completo

### `setup_and_run_all.ps1` - Setup Completo

**Função**: Script de setup completo do projeto.

**Localização**: `setup_and_run_all.ps1` (raiz)

**Como executar** (a partir da **raiz** do projeto):

```powershell
.\setup_and_run_all.ps1
```

---

## 📋 Comandos Úteis Auxiliares

### Ver status do serviço manualmente

```powershell
# Verificar se o serviço está rodando
Get-Service -Name aoi-backend

# Ver status detalhado
Get-Service -Name aoi-backend | Format-List *

# Verificar logs
Get-Content backend\nssm-stdout.log -Tail 30
Get-Content backend\nssm-stderr.log -Tail 20
```

### Gerenciar serviço manualmente

```powershell
# Parar serviço
Stop-Service -Name aoi-backend

# Iniciar serviço
Start-Service -Name aoi-backend

# Reiniciar serviço
Restart-Service -Name aoi-backend -Force
```

### Verificar se o backend está funcionando

```powershell
# Testar health endpoint
Invoke-RestMethod -Uri http://localhost:3001/health

# Testar com mais detalhes
try { 
    $response = Invoke-WebRequest -Uri http://localhost:3001/health -UseBasicParsing
    $response.StatusCode
    $response.Content 
} catch { 
    Write-Host "Erro: $($_.Exception.Message)" 
}
```

### Verificar processos Node.js

```powershell
# Ver todos os processos Node.js
Get-Process -Name node

# Parar todos os processos Node.js
Stop-Process -Name node -Force
```

---

## 🎯 Fluxos de Uso Comuns

### Primeira Instalação do Projeto

```powershell
# 1. Clone o repositório
git clone <url-do-repositorio>
cd controle-de-falhas-aoi

# 2. Execute setup inicial
.\scripts\setup_and_run.ps1

# 3. Ou se tiver backup do banco
.\scripts\setup_and_run.ps1 -RestoreZipPath "aoi-db-backup.zip"
```

### Instalar como Serviço Windows

```powershell
# 1. Execute o instalador (solicita Admin automaticamente)
.\instalar-servico.ps1 -Action install

# 2. Verifique o status
.\parar-servico.ps1 -Action status

# 3. Se não estiver rodando, inicie
.\parar-servico.ps1 -Action start
```

### Gerenciar Serviço Instalado

```powershell
# Parar
.\parar-servico.ps1 -Action stop

# Iniciar
.\parar-servico.ps1 -Action start

# Reiniciar
.\parar-servico.ps1 -Action restart

# Ver status
.\parar-servico.ps1 -Action status
```

### Limpar Sistema

```powershell
# Limpeza completa
.\scripts\limpar-sistema.ps1 -Tudo

# Apenas arquivos temporários
.\scripts\limpar-sistema.ps1 -LimparTemporarios

# Apenas cache
.\scripts\limpar-sistema.ps1 -LimparCache
```

### Restaurar Banco de Dados

```powershell
# 1. Pare o serviço primeiro
.\parar-servico.ps1 -Action stop

# 2. Restaure o banco
.\scripts\restore-db.ps1 -ZipPath "C:\backups\aoi-db-backup.zip"

# 3. Inicie o serviço novamente
.\parar-servico.ps1 -Action start
```

### Remover Serviço

```powershell
# Execute o instalador com uninstall
.\instalar-servico.ps1 -Action uninstall
```

---

## ⚙️ Configurações Importantes

### Variáveis de Ambiente do Serviço

O serviço usa as seguintes variáveis (definidas em `install-nssm.ps1`):
- `NODE_ENV=development`
- `SILENCE_LOGS=true`

### Portas
- Backend: `3001` (porta padrão)

### Logs do Serviço
- Saída padrão: `backend\nssm-stdout.log`
- Erros: `backend\nssm-stderr.log`

### Caminho do NSSM
- Padrão: `C:\nssm\win64\nssm.exe`
- Se não existir, o script tenta baixar automaticamente

---

## 🐛 Solução de Problemas

### Script não executa

**Problema**: `Este script não pode ser carregado porque a execução de scripts está desabilitada`

**Solução**:
```powershell
# Verificar política de execução
Get-ExecutionPolicy

# Se for Restricted ou AllSigned, executar:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Serviço não inicia

**Problema**: O serviço não inicia ou para automaticamente

**Soluções**:
```powershell
# 1. Verificar logs de erro
Get-Content backend\nssm-stderr.log -Tail 50

# 2. Verificar se Node.js está no PATH
node -v
npm -v

# 3. Verificar se o arquivo server.js existe
Test-Path backend\server.js

# 4. Verificar dependências
Test-Path backend\node_modules

# 5. Verificar configurações do NSSM
C:\nssm\win64\nssm.exe get aoi-backend Application
C:\nssm\win64\nssm.exe get aoi-backend AppDirectory
```

### Erro de permissão

**Problema**: Acesso negado ao executar scripts

**Solução**: Execute o PowerShell como Administrador:
1. Clique com botão direito em PowerShell
2. Selecione "Executar como administrador"
3. Execute o script novamente

### Erro com `&&`

**Problema**: O token `&&` não é válido no PowerShell 5.1

**Solução**: Use `;` ou execute comandos separadamente:
```powershell
# ERRADO
cd scripts && .\script.ps1

# CORRETO
cd scripts ; .\script.ps1

# OU MELHOR (da raiz)
.\scripts\script.ps1
```

---

## 📝 Notas Adicionais

- **Sempre execute scripts a partir da raiz do projeto** (`controle-de-falhas-aoi\`)
- **Use caminhos relativos** quando possível
- **Para scripts de serviço**, você precisa de privilégios de Administrador
- **Scripts na pasta `scripts/`** são preferenciais, pois são mais completos e interativos
- **Logs** são salvos em `backend\logs\` e em arquivos separados na raiz do backend

---

## 📚 Recursos Adicionais

- `README.md` - Documentação principal do projeto
- `COMANDOS_SERVICO.md` - Comandos específicos para gerenciamento de serviço
- `SERVICE_INSTALL.md` - Guia detalhado de instalação de serviço
- `BACKUP_RESTORE.md` - Instruções de backup e restore

---

**Última atualização**: 2025-01-31  
**Versão do PowerShell**: 5.1+  
**Sistema Operacional**: Windows 10/11

