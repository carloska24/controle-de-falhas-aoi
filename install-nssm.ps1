<#
install-nssm.ps1
Instala/Remove o serviço Windows 'aoi-backend' usando NSSM.
Uso (executar como Administrador):
  .\install-nssm.ps1 install   # instala e inicia o serviço
  .\install-nssm.ps1 uninstall # para e remove o serviço

Observações:
- Requer: C:\nssm\win64\nssm.exe (já presente no seu sistema conforme anexo)
- O serviço roda com NODE_ENV=development e SILENCE_LOGS=true por padrão.
- Logs vão para backend\nssm-stdout.log e backend\nssm-stderr.log
#>
param(
    [ValidateSet('install','uninstall')]
    [string]$Action = 'install'
)

function Is-Admin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Is-Admin)) {
    Write-Error "Este script precisa ser executado em um PowerShell com privilégio de Administrador. Feche e abra 'Executar como administrador' e execute novamente."; exit 1
}

# Caminhos configuráveis
$nssmPath = 'C:\nssm\win64\nssm.exe'
$appPath = 'C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend\server.js'
$workDir = Split-Path $appPath -Parent
# Detectar node.exe se estiver no PATH, caso contrário usar caminho padrão
try {
    $nodeCmd = (Get-Command node -ErrorAction Stop).Source
} catch {
    $nodeCmd = 'C:\Program Files\nodejs\node.exe'
}

$serviceName = 'aoi-backend'

if ($Action -eq 'install') {
    if (-not (Test-Path $nssmPath)) { Write-Error "nssm não encontrado em $nssmPath. Ajuste o caminho e tente novamente."; exit 1 }

    Write-Host "Instalando serviço '$serviceName' com NSSM..."
    Write-Host "Node: $nodeCmd"
    Write-Host "App: $appPath"
    Write-Host "WorkDir: $workDir"

    try {
        & $nssmPath install $serviceName $nodeCmd $appPath
    } catch {
        Write-Warning "Comando de instalação falhou (o serviço pode já existir). Continuando..."
    }

    # Configurações do serviço
    & $nssmPath set $serviceName AppDirectory $workDir
    & $nssmPath set $serviceName Environment "PORT=3001;NODE_ENV=development;SILENCE_LOGS=true"
    & $nssmPath set $serviceName AppStdout "$workDir\nssm-stdout.log"
    & $nssmPath set $serviceName AppStderr "$workDir\nssm-stderr.log"
    # Opcional: definir delay de restart (em ms) - aqui 5s
    & $nssmPath set $serviceName AppRestartDelay 5000

    Write-Host "Tentando iniciar o serviço..."
    try {
        Start-Service -Name $serviceName -ErrorAction Stop
        Start-Sleep -Seconds 2
        Get-Service -Name $serviceName | Format-List Name,Status,DisplayName
        Write-Host "Serviço instalado e iniciado. Logs: $workDir\nssm-stdout.log e $workDir\nssm-stderr.log"
    } catch {
        Write-Error "Falha ao iniciar o serviço: $_.Exception.Message"
        Write-Host "Verifique os arquivos de log e tente iniciar manualmente com: Start-Service -Name $serviceName"
        exit 1
    }

    Write-Host "Instalação concluída. Para remover: .\install-nssm.ps1 uninstall (executar como Admin)"
    exit 0
}

if ($Action -eq 'uninstall') {
    Write-Host "Parando serviço $serviceName (se estiver em execução)..."
    try { Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "Removendo serviço via NSSM..."
    try {
        & $nssmPath remove $serviceName confirm
        Write-Host "Serviço removido."
    } catch {
        Write-Error "Falha ao remover o serviço: $_"
        exit 1
    }
    exit 0
}
