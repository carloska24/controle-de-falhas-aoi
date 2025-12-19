# Comandos para Gerenciar o Serviço aoi-backend

Este documento contém todos os comandos úteis para gerenciar o serviço Windows `aoi-backend`.

## Scripts Disponíveis

### 1. Script Principal (install-nssm.ps1)
```powershell
# Instalar o serviço
.\install-nssm.ps1 install

# Remover o serviço
.\install-nssm.ps1 uninstall
```

### 2. Script Auxiliar (instalar-servico.ps1)
```powershell
# Instalar o serviço
.\instalar-servico.ps1 -Action install

# Remover o serviço
.\instalar-servico.ps1 -Action uninstall

# Ver status
.\instalar-servico.ps1 -Action status
```

### 3. Script de Gerenciamento (parar-servico.ps1)
```powershell
# Parar o serviço
.\parar-servico.ps1 -Action stop

# Iniciar o serviço
.\parar-servico.ps1 -Action start

# Reiniciar o serviço
.\parar-servico.ps1 -Action restart

# Ver status
.\parar-servico.ps1 -Action status
```

## Comandos PowerShell Diretos

### Gerenciar o Serviço
```powershell
# Ver status do serviço
Get-Service -Name aoi-backend

# Parar o serviço (requer Admin)
Stop-Service -Name aoi-backend

# Iniciar o serviço (requer Admin)
Start-Service -Name aoi-backend

# Reiniciar o serviço (requer Admin)
Restart-Service -Name aoi-backend
```

### Verificar se o Backend está Funcionando
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

## Logs do Serviço

### Ver Logs
```powershell
# Logs de saída padrão
Get-Content "backend\nssm-stdout.log" -Tail 30

# Logs de erro
Get-Content "backend\nssm-stderr.log" -Tail 20

# Monitorar logs em tempo real
Get-Content "backend\nssm-stdout.log" -Wait -Tail 10
```

## Informações do Serviço

### Detalhes Completos
```powershell
# Informações detalhadas
Get-Service -Name aoi-backend | Format-List *

# Verificar configurações do NSSM
C:\nssm\win64\nssm.exe get aoi-backend Application
C:\nssm\win64\nssm.exe get aoi-backend AppDirectory
C:\nssm\win64\nssm.exe get aoi-backend Environment
```

## Solução de Problemas

### Se o Serviço Não Iniciar
```powershell
# Verificar logs de erro
Get-Content "backend\nssm-stderr.log" -Tail 50

# Verificar se o Node.js está no PATH
node -v

# Verificar se o arquivo server.js existe
Test-Path "backend\server.js"

# Verificar dependências
Test-Path "backend\node_modules"
```

### Se o Backend Não Responder
```powershell
# Verificar se a porta está em uso
netstat -an | findstr :3001

# Testar conectividade
Test-NetConnection -ComputerName localhost -Port 3001
```

## Configurações do Serviço

- **Nome**: aoi-backend
- **Porta**: 3001
- **Ambiente**: development
- **Logs silenciosos**: true
- **Inicialização**: Automática
- **Diretório de trabalho**: backend/
- **Comando**: node server.js

## Notas Importantes

1. **Privilégios de Administrador**: A maioria dos comandos de gerenciamento de serviço requer privilégios de administrador
2. **Scripts Automáticos**: Os scripts `instalar-servico.ps1` e `parar-servico.ps1` solicitam elevação automaticamente
3. **Logs**: Os logs ficam em `backend\nssm-stdout.log` e `backend\nssm-stderr.log`
4. **Reinicialização**: O serviço reinicia automaticamente em caso de falha (configurado no NSSM)
