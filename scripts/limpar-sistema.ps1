<#
Script para limpeza de sistema - Remove processos desnecessários e arquivos temporários

Uso:
    .\scripts\limpar-sistema.ps1                    # Menu interativo
    .\scripts\limpar-sistema.ps1 -Tudo              # Limpa tudo
    .\scripts\limpar-sistema.ps1 -LimparTemporarios # Limpa apenas temporários
    .\scripts\limpar-sistema.ps1 -LimparCache       # Limpa apenas cache
    .\scripts\limpar-sistema.ps1 -Help              # Mostra esta ajuda
#>

param(
    [switch]$LimparProcessos = $false,
    [switch]$LimparTemporarios = $false,
    [switch]$LimparCache = $false,
    [switch]$LimparLogs = $false,
    [switch]$Tudo = $false,
    [switch]$Help = $false
)

# Mostrar ajuda se solicitado
if ($Help) {
    Write-Host "=== Script de Limpeza de Sistema ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Este script permite limpar processos desnecessarios, arquivos temporarios," -ForegroundColor White
    Write-Host "cache de aplicacoes e logs antigos do sistema." -ForegroundColor White
    Write-Host ""
    Write-Host "Opcoes disponiveis:" -ForegroundColor Yellow
    Write-Host "  -LimparProcessos     Para processos desnecessarios (OneDrive, Discord, etc.)" -ForegroundColor White
    Write-Host "  -LimparTemporarios   Remove arquivos temporarios do Windows" -ForegroundColor White
    Write-Host "  -LimparCache         Limpa cache do npm, Node.js e Windows" -ForegroundColor White
    Write-Host "  -LimparLogs          Remove logs antigos (mais de 30 dias)" -ForegroundColor White
    Write-Host "  -Tudo                Executa todas as limpezas acima" -ForegroundColor White
    Write-Host "  -Help                Mostra esta ajuda" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemplos:" -ForegroundColor Yellow
    Write-Host "  .\scripts\limpar-sistema.ps1                    # Menu interativo" -ForegroundColor Gray
    Write-Host "  .\scripts\limpar-sistema.ps1 -Tudo              # Limpa tudo" -ForegroundColor Gray
    Write-Host "  .\scripts\limpar-sistema.ps1 -LimparTemporarios # So temporarios" -ForegroundColor Gray
    Write-Host "  .\scripts\limpar-sistema.ps1 -LimparCache       # So cache" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

Write-Host "=== Limpeza de Sistema ===" -ForegroundColor Cyan
Write-Host ""

$totalLimpado = 0
$processosParados = 0

# Processos que podem ser parados (seguros para interromper)
$processosDesnecessarios = @(
    # Processos de busca/atualização do Windows
    "MoUSO Core Worker Process",
    "Windows Update",
    "Update.exe",
    
    # Processos de sincronização/cloud desnecessários
    "OneDrive",
    "Dropbox",
    
    # Processos de telemetria
    "CompatTelRunner",
    
    # Processos antigos de serviços que não estão em uso
    "Skype",
    "Discord",
    "Steam",
    
    # Processos de cache de aplicativos
    "cloudcode_cli" # Pode ser parado se não estiver em uso
)

# Função para limpar processos desnecessários
function Limpar-ProcessosDesnecessarios {
    Write-Host "[1/4] Limpando processos desnecessários..." -ForegroundColor Yellow
    
    foreach ($procName in $processosDesnecessarios) {
        $processos = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($processos) {
            foreach ($proc in $processos) {
                try {
                    Write-Host "  Parando: $procName (PID: $($proc.Id))" -ForegroundColor Gray
                    Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                    $script:processosParados++
                }
                catch {
                    Write-Host "  Não foi possível parar: $procName" -ForegroundColor DarkYellow
                }
            }
        }
    }
    
    Write-Host "  [OK] Processos parados: $processosParados" -ForegroundColor Green
    Write-Host ""
}

# Função para limpar arquivos temporários
function Limpar-ArquivosTemporarios {
    Write-Host "[2/4] Limpando arquivos temporários..." -ForegroundColor Yellow
    
    $pastasTemp = @(
        $env:TEMP,
        "$env:LOCALAPPDATA\Temp",
        "C:\Windows\Temp",
        "$env:USERPROFILE\AppData\Local\Microsoft\Windows\INetCache"
    )
    
    foreach ($pasta in $pastasTemp) {
        if (Test-Path $pasta) {
            try {
                $antes = (Get-ChildItem -Path $pasta -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
                
                Get-ChildItem -Path $pasta -Recurse -ErrorAction SilentlyContinue | 
                Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                
                if ($antes) {
                    $tamanhoMB = [math]::Round($antes / 1MB, 2)
                    $script:totalLimpado += $antes
                    Write-Host "  [OK] Limpado: $pasta ($tamanhoMB MB)" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "  [!] Erro ao limpar: $pasta" -ForegroundColor DarkYellow
            }
        }
    }
    
    # Limpar lixeira
    try {
        $shell = New-Object -ComObject Shell.Application
        $lixeira = $shell.NameSpace(0xA)
        $tamanhoLixeira = 0
        foreach ($item in $lixeira.Items()) {
            $tamanhoLixeira += $item.Size
        }
        if ($tamanhoLixeira -gt 0) {
            $lixeira.InvokeVerb("delete")
            $script:totalLimpado += $tamanhoLixeira
            $tamanhoLixeiraMB = [math]::Round($tamanhoLixeira / 1MB, 2)
            Write-Host "  [OK] Lixeira limpa ($tamanhoLixeiraMB MB)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  [!] Nao foi possivel limpar a lixeira" -ForegroundColor DarkYellow
    }
    
    Write-Host ""
}

# Função para limpar cache de aplicações
function Limpar-CacheAplicacoes {
    Write-Host "[3/4] Limpando cache de aplicações..." -ForegroundColor Yellow
    
    # Cache do npm (se existir)
    $npmCache = "$env:APPDATA\npm-cache"
    if (Test-Path $npmCache) {
        try {
            $tamanho = (Get-ChildItem -Path $npmCache -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            Remove-Item -Path "$npmCache\*" -Recurse -Force -ErrorAction SilentlyContinue
            if ($tamanho) {
                $tamanhoMB = [math]::Round($tamanho / 1MB, 2)
                $script:totalLimpado += $tamanho
                Write-Host "  [OK] Cache do npm limpo ($tamanhoMB MB)" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  [!] Erro ao limpar cache do npm" -ForegroundColor DarkYellow
        }
    }
    
    # Cache do projeto Node.js (node_modules antigos que podem estar em cache)
    $nodeModulesCache = "$env:LOCALAPPDATA\npm-cache"
    if (Test-Path $nodeModulesCache) {
        try {
            $tamanho = (Get-ChildItem -Path $nodeModulesCache -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            Remove-Item -Path "$nodeModulesCache\*" -Recurse -Force -ErrorAction SilentlyContinue
            if ($tamanho) {
                $tamanhoMB = [math]::Round($tamanho / 1MB, 2)
                $script:totalLimpado += $tamanho
                Write-Host "  [OK] Cache do Node.js limpo ($tamanhoMB MB)" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "  [!] Erro ao limpar cache do Node.js" -ForegroundColor DarkYellow
        }
    }
    
    # Cache do Windows (arquivos de sistema temporários)
    try {
        $ws = [System.Environment]::GetFolderPath("LocalApplicationData")
        $winCache = "$ws\Microsoft\Windows\INetCache"
        if (Test-Path $winCache) {
            $tamanho = (Get-ChildItem -Path $winCache -Recurse -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
            Remove-Item -Path "$winCache\*" -Recurse -Force -ErrorAction SilentlyContinue
            if ($tamanho) {
                $tamanhoMB = [math]::Round($tamanho / 1MB, 2)
                $script:totalLimpado += $tamanho
                Write-Host "  [OK] Cache do Windows limpo ($tamanhoMB MB)" -ForegroundColor Green
            }
        }
    }
    catch {
        Write-Host "  [!] Erro ao limpar cache do Windows" -ForegroundColor DarkYellow
    }
    
    Write-Host ""
}

# Função para limpar logs antigos
function Limpar-LogsAntigos {
    Write-Host "[4/4] Limpando logs antigos..." -ForegroundColor Yellow
    
    $pastasLogs = @(
        "$env:USERPROFILE\AppData\Local\Temp",
        "C:\Windows\Logs",
        "$env:PROGRAMDATA\Microsoft\Windows\WER"
    )
    
    foreach ($pasta in $pastasLogs) {
        if (Test-Path $pasta) {
            try {
                # Remove logs com mais de 30 dias
                $dataLimite = (Get-Date).AddDays(-30)
                $logs = Get-ChildItem -Path $pasta -Recurse -File -ErrorAction SilentlyContinue | 
                Where-Object { $_.LastWriteTime -lt $dataLimite }
                
                foreach ($log in $logs) {
                    try {
                        Remove-Item -Path $log.FullName -Force -ErrorAction Stop
                    }
                    catch {
                        # Ignora arquivos bloqueados
                    }
                }
                
                if ($logs) {
                    $tamanho = ($logs | Measure-Object -Property Length -Sum).Sum
                    $tamanhoMB = [math]::Round($tamanho / 1MB, 2)
                    $script:totalLimpado += $tamanho
                    Write-Host "  [OK] Logs antigos removidos de $pasta ($tamanhoMB MB)" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "  [!] Erro ao limpar logs de: $pasta" -ForegroundColor DarkYellow
            }
        }
    }
    
    Write-Host ""
}

# Função para executar limpeza do Windows (Disk Cleanup)
function Executar-LimpezaWindows {
    Write-Host "[EXTRA] Executando limpeza do Windows..." -ForegroundColor Yellow
    
    try {
        # Limpa arquivos de atualização antigos
        Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:1" -Wait -NoNewWindow -ErrorAction SilentlyContinue
        Write-Host "  [OK] Limpeza do Windows concluida" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Limpeza do Windows nao pode ser executada automaticamente" -ForegroundColor DarkYellow
        Write-Host "    Execute manualmente: cleanmgr.exe" -ForegroundColor Gray
    }
    
    Write-Host ""
}

# Menu principal
if (-not ($Tudo -or $LimparProcessos -or $LimparTemporarios -or $LimparCache -or $LimparLogs)) {
    Write-Host "Selecione o que deseja limpar:" -ForegroundColor Cyan
    Write-Host "  1. Processos desnecessários" -ForegroundColor White
    Write-Host "  2. Arquivos temporários" -ForegroundColor White
    Write-Host "  3. Cache de aplicações" -ForegroundColor White
    Write-Host "  4. Logs antigos" -ForegroundColor White
    Write-Host "  5. Tudo" -ForegroundColor White
    Write-Host ""
    $escolha = Read-Host "Digite o número (ou 5 para tudo)"
    
    switch ($escolha) {
        "1" { $LimparProcessos = $true }
        "2" { $LimparTemporarios = $true }
        "3" { $LimparCache = $true }
        "4" { $LimparLogs = $true }
        "5" { $Tudo = $true }
        default { 
            Write-Host "Opção inválida. Saindo..." -ForegroundColor Red
            exit 1
        }
    }
}

# Executar limpezas selecionadas
if ($Tudo -or $LimparProcessos) {
    Limpar-ProcessosDesnecessarios
}

if ($Tudo -or $LimparTemporarios) {
    Limpar-ArquivosTemporarios
}

if ($Tudo -or $LimparCache) {
    Limpar-CacheAplicacoes
}

if ($Tudo -or $LimparLogs) {
    Limpar-LogsAntigos
}

# Resumo
Write-Host "=== Resumo da Limpeza ===" -ForegroundColor Cyan
Write-Host "  Processos parados: $processosParados" -ForegroundColor White
$totalMB = [math]::Round($totalLimpado / 1MB, 2)
Write-Host "  Espaço liberado: $totalMB MB ($([math]::Round($totalLimpado / 1GB, 2)) GB)" -ForegroundColor Green
Write-Host ""
Write-Host "[OK] Limpeza concluida!" -ForegroundColor Green

