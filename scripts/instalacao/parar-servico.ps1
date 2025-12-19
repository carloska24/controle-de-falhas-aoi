<#
Script para parar o serviço aoi-backend
#>
param(
    [ValidateSet('stop','start','restart','status')]
    [string]$Action = 'stop'
)

Write-Host "=== Gerenciador do Serviço aoi-backend ===" -ForegroundColor Cyan
Write-Host "Ação solicitada: $Action" -ForegroundColor Yellow
Write-Host ""

# Verificar se estamos como Administrador
function Test-Administrator {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "Solicitando elevação de privilégios..." -ForegroundColor Yellow
    
    # Executar com privilégios elevados
    $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action $Action"
    try {
        Start-Process powershell -Verb RunAs -ArgumentList $arguments -Wait
        exit 0
    } catch {
        Write-Host "Erro ao solicitar privilégios de administrador." -ForegroundColor Red
        exit 1
    }
}

# Executar ação
switch ($Action) {
    'stop' {
        Write-Host "Parando serviço aoi-backend..." -ForegroundColor Yellow
        try {
            Stop-Service -Name "aoi-backend" -Force
            Write-Host "✓ Serviço parado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro ao parar serviço: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    'start' {
        Write-Host "Iniciando serviço aoi-backend..." -ForegroundColor Yellow
        try {
            Start-Service -Name "aoi-backend"
            Write-Host "✓ Serviço iniciado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro ao iniciar serviço: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    'restart' {
        Write-Host "Reiniciando serviço aoi-backend..." -ForegroundColor Yellow
        try {
            Restart-Service -Name "aoi-backend" -Force
            Write-Host "✓ Serviço reiniciado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "Erro ao reiniciar serviço: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    'status' {
        Write-Host "Status do serviço aoi-backend:" -ForegroundColor Cyan
        try {
            $service = Get-Service -Name "aoi-backend"
            $service | Format-List Name, Status, DisplayName, StartType
        } catch {
            Write-Host "Erro ao obter status: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
