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
    [string]$Action = 'install',
    [string]$NssmPath = 'C:\nssm\win64\nssm.exe',
    [string]$AppPath = '',    # se vazio, tentamos assumir \backend\server.js relativo ao script
    [int]$Port = 3001,
    [string]$ServiceName = 'aoi-backend'
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
# NSSM path preferido (pode ser personalizado via -NssmPath)
$nssmPath = $NssmPath

# Se o nssm.exe não existir, tentamos baixar automaticamente a release oficial (win64)
function Install-Nssm-Auto {
    param(
        [string]$TargetPath
    )
    Write-Host "nssm não encontrado em $TargetPath. Tentando baixar nssm automaticamente (win64)..."
    $tmp = Join-Path $env:TEMP ("nssm-download-{0}" -f (Get-Random))
    New-Item -ItemType Directory -Path $tmp -Force | Out-Null
    $zip = Join-Path $tmp 'nssm.zip'
    $url = 'https://nssm.cc/release/nssm-2.24.zip'
    try {
        Write-Host "Baixando $url ..."
        Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -ErrorAction Stop
        Write-Host "Extraindo..."
        Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
        $found = Get-ChildItem -Path $tmp -Recurse -Filter nssm.exe | Where-Object { $_.FullName -match '\\win64\\' } | Select-Object -First 1
        if (-not $found) { $found = Get-ChildItem -Path $tmp -Recurse -Filter nssm.exe | Select-Object -First 1 }
        if ($found) {
            $destDir = Split-Path $TargetPath -Parent
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            Copy-Item -Path $found.FullName -Destination $TargetPath -Force
            Write-Host "nssm copiado para $TargetPath"
            return $true
        } else {
            Write-Warning "Não foi possível localizar nssm.exe dentro do zip baixado. Abrindo $tmp para inspeção manual."
            return $false
        }
    } catch {
        Write-Warning "Falha ao baixar/instalar nssm automaticamente: $_"
        return $false
    } finally {
        try { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
}

# Se não existir, tentar instalar automaticamente
if (-not (Test-Path $nssmPath)) {
    $installed = Install-Nssm-Auto -TargetPath $nssmPath
    if (-not $installed) {
        Write-Error "nssm não encontrado e a instalação automática falhou. Passe -NssmPath apontando para um nssm.exe válido."; exit 1
    }
}

# Determinar local do repositório/script e localizar backend/server.js por padrão
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ([string]::IsNullOrWhiteSpace($AppPath)) {
    $appPath = Join-Path $scriptRoot 'backend\server.js'
} else {
    # se o usuário passou um caminho relativo, transforme relativo ao script
    if (-not (Test-Path $AppPath) -and -not ([System.IO.Path]::IsPathRooted($AppPath))) {
        $appPath = Join-Path $scriptRoot $AppPath
    } else {
        $appPath = $AppPath
    }
}
$workDir = Split-Path $appPath -Parent
# Detectar node.exe se estiver no PATH, caso contrário usar caminho padrão
try {
    $nodeCmd = (Get-Command node -ErrorAction Stop).Source
} catch {
    $nodeCmd = 'C:\Program Files\nodejs\node.exe'
}

$serviceName = 'aoi-backend'

if ($Action -eq 'install') {
    if (-not (Test-Path $nssmPath)) { Write-Error "nssm não encontrado em $nssmPath. Ajuste o caminho ou passe -NssmPath e tente novamente."; exit 1 }
    if (-not (Test-Path $appPath)) { Write-Error "App não encontrado em $appPath. Certifique-se que o repositório está no mesmo computador ou passe -AppPath apontando para backend/server.js"; exit 1 }

    Write-Host "Instalando serviço '$serviceName' com NSSM..."
    Write-Host "Node: $nodeCmd"
    Write-Host "App: $appPath"
    Write-Host "WorkDir: $workDir"

    try {
        & $nssmPath install $ServiceName $nodeCmd $appPath
    } catch {
        Write-Warning "Comando de instalação falhou (o serviço pode já existir). Continuando..."
    }

    # Configurações do serviço
    & $nssmPath set $ServiceName AppDirectory $workDir
    & $nssmPath set $ServiceName Environment "PORT=$Port;NODE_ENV=development;SILENCE_LOGS=true"
    & $nssmPath set $ServiceName AppStdout "$workDir\nssm-stdout.log"
    & $nssmPath set $ServiceName AppStderr "$workDir\nssm-stderr.log"
    # Opcional: definir delay de restart (em ms) - aqui 5s
    & $nssmPath set $ServiceName AppRestartDelay 5000
    # Recomendações de parada/kill para garantir restart limpo
    & $nssmPath set $ServiceName AppStopMethodSkip 0
    & $nssmPath set $ServiceName AppKillDelay 2000

    Write-Host "Tentando iniciar o serviço..."
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        Start-Sleep -Seconds 2
        Get-Service -Name $ServiceName | Format-List Name,Status,DisplayName
        Write-Host "Serviço instalado e iniciado. Logs: $workDir\nssm-stdout.log e $workDir\nssm-stderr.log"
    } catch {
        Write-Error "Falha ao iniciar o serviço: $_.Exception.Message"
        Write-Host "Verifique os arquivos de log e tente iniciar manualmente com: Start-Service -Name $ServiceName"
        exit 1
    }

    Write-Host "Instalação concluída. Para remover: .\install-nssm.ps1 uninstall (executar como Admin)"
    exit 0
}

if ($Action -eq 'uninstall') {
    Write-Host "Parando serviço $ServiceName (se estiver em execução)..."
    try { Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "Removendo serviço via NSSM..."
    try {
        & $nssmPath remove $ServiceName confirm
        Write-Host "Serviço removido."
    } catch {
        Write-Error "Falha ao remover o serviço: $_"
        exit 1
    }
    exit 0
}
