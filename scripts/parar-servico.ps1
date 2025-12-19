<#
Script para gerenciar o serviço aoi-backend
#>
param(
    [ValidateSet('stop', 'start', 'restart', 'status')]
    [string]$Action = ''
)

Write-Host "=== Gerenciador do Servico aoi-backend ===" -ForegroundColor Cyan
Write-Host ""

# Menu interativo se nao foi passada acao
if ([string]::IsNullOrEmpty($Action)) {
    Write-Host "Selecione a acao desejada:" -ForegroundColor Cyan
    Write-Host "  1. Parar servico" -ForegroundColor White
    Write-Host "  2. Iniciar servico" -ForegroundColor White
    Write-Host "  3. Reiniciar servico" -ForegroundColor White
    Write-Host "  4. Verificar status" -ForegroundColor White
    Write-Host "  5. Sair" -ForegroundColor White
    Write-Host ""
    $escolha = Read-Host "Digite o numero (1-5)"
    
    switch ($escolha) {
        "1" { $Action = 'stop' }
        "2" { $Action = 'start' }
        "3" { $Action = 'restart' }
        "4" { $Action = 'status' }
        "5" { 
            Write-Host "Saindo..." -ForegroundColor Yellow
            exit 0
        }
        default { 
            Write-Host "Opcao invalida. Saindo..." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "Acao solicitada: $Action" -ForegroundColor Yellow
Write-Host ""

# Verificar se estamos como Administrador (apenas para aviso)
function Test-Administrator {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Avisar se não for admin, mas continuar executando no terminal atual
if (-not (Test-Administrator)) {
    Write-Host "[AVISO] Execute o terminal como Administrador se precisar gerenciar servicos Windows." -ForegroundColor Yellow
    Write-Host ""
}

# Executar ação
switch ($Action) {
    'stop' {
        Write-Host "Parando servico aoi-backend..." -ForegroundColor Yellow
        
        # Tentar parar como serviço Windows
        try {
            $service = Get-Service -Name "aoi-backend" -ErrorAction Stop
            Stop-Service -Name "aoi-backend" -Force -ErrorAction Stop
            Write-Host "[OK] Servico Windows parado com sucesso!" -ForegroundColor Green
        }
        catch {
            # Se não conseguir parar o serviço (falta de privilégios ou erro), tenta parar processos Node.js
            $errorMsg = $_.Exception.Message
            if ($errorMsg -match "privilegios|privilegio|permissao|permission|não é possível|cannot") {
                Write-Host "[AVISO] Nao foi possivel parar o servico Windows: falta de privilegios." -ForegroundColor Yellow
            }
            else {
                Write-Host "[INFO] Servico Windows nao encontrado ou ja esta parado." -ForegroundColor Yellow
            }
            
            # Tentar parar processos Node.js como alternativa
            Write-Host "Tentando parar processos Node.js..." -ForegroundColor Yellow
            $processosNode = Get-Process -Name "node" -ErrorAction SilentlyContinue
            if ($processosNode) {
                Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
                Write-Host "[OK] Processos Node.js parados com sucesso!" -ForegroundColor Green
            }
            else {
                Write-Host "[INFO] Nenhum processo Node.js encontrado para parar." -ForegroundColor DarkYellow
            }
        }
    }
    'start' {
        Write-Host "Iniciando servico aoi-backend..." -ForegroundColor Yellow
        try {
            Start-Service -Name "aoi-backend" -ErrorAction Stop
            Write-Host "[OK] Servico iniciado com sucesso!" -ForegroundColor Green
        }
        catch {
            Write-Host "Erro ao iniciar servico: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "[INFO] O servico pode nao estar instalado como servico Windows." -ForegroundColor DarkYellow
            Write-Host "[INFO] Para iniciar como processo Node.js, navegue ate a pasta backend e execute: npm start" -ForegroundColor DarkYellow
        }
    }
    'restart' {
        Write-Host "Reiniciando servico aoi-backend..." -ForegroundColor Yellow
        try {
            Restart-Service -Name "aoi-backend" -Force -ErrorAction Stop
            Write-Host "[OK] Servico reiniciado com sucesso!" -ForegroundColor Green
        }
        catch {
            $errorMsg = $_.Exception.Message
            Write-Host "Erro ao reiniciar servico: $errorMsg" -ForegroundColor Red
            if ($errorMsg -match "privilegios|privilegio|permissao|permission|não é possível|cannot") {
                Write-Host "[AVISO] Falta de privilegios de administrador para reiniciar o servico." -ForegroundColor Yellow
            }
            else {
                Write-Host "[INFO] O servico pode nao estar instalado ou nao estar rodando." -ForegroundColor DarkYellow
            }
        }
    }
    'status' {
        Write-Host "Status do servico aoi-backend:" -ForegroundColor Cyan
        try {
            $service = Get-Service -Name "aoi-backend" -ErrorAction Stop
            Write-Host "  Nome: $($service.Name)" -ForegroundColor White
            Write-Host "  Status: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Yellow' })
            Write-Host "  Nome de Exibicao: $($service.DisplayName)" -ForegroundColor White
            Write-Host "  Tipo de Inicializacao: $($service.StartType)" -ForegroundColor White
        }
        catch {
            Write-Host "Erro ao obter status: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "O servico pode nao estar instalado." -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
