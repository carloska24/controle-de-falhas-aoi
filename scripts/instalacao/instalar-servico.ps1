<#
Script auxiliar para instalar o serviço aoi-backend
Este script tenta executar o install-nssm.ps1 com privilégios de administrador
#>
param(
    [ValidateSet('install','uninstall','status')]
    [string]$Action = 'install'
)

$scriptPath = Join-Path $PSScriptRoot "install-nssm.ps1"

Write-Host "=== Instalador do Serviço aoi-backend ===" -ForegroundColor Cyan
Write-Host "Ação solicitada: $Action" -ForegroundColor Yellow
Write-Host ""

# Verificar se estamos como Administrador
function Test-Administrator {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "Este script precisa ser executado como Administrador." -ForegroundColor Red
    Write-Host "Solicitando elevação de privilégios..." -ForegroundColor Yellow
    Write-Host ""
    
    # Tentar executar com privilégios elevados
    $arguments = "-ExecutionPolicy Bypass -File `"$scriptPath`" $Action"
    try {
        Start-Process powershell -Verb RunAs -ArgumentList $arguments -Wait
        Write-Host ""
        Write-Host "Script executado com elevação." -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "Erro ao solicitar privilégios de administrador." -ForegroundColor Red
        Write-Host "Por favor, execute manualmente:" -ForegroundColor Yellow
        Write-Host "  1. Abra PowerShell como Administrador (botão direito > Executar como administrador)" -ForegroundColor Yellow
        Write-Host "  2. Execute: .\install-nssm.ps1 $Action" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Executando com privilégios de administrador..." -ForegroundColor Green
    Write-Host ""
    & $scriptPath -Action $Action
}

# Verificar status após instalação
if ($Action -eq 'install') {
    Write-Host ""
    Write-Host "=== Verificando status do serviço ===" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    $service = Get-Service -Name "aoi-backend" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Serviço encontrado:" -ForegroundColor Green
        $service | Format-List Name, Status, DisplayName
        if ($service.Status -eq 'Running') {
            Write-Host "✓ Serviço está rodando!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Teste o backend:" -ForegroundColor Cyan
            Write-Host "  Invoke-RestMethod -Uri http://localhost:3001/health" -ForegroundColor Yellow
        } else {
            Write-Host "Serviço instalado mas não está rodando." -ForegroundColor Yellow
            Write-Host "Tente iniciar manualmente: Start-Service -Name aoi-backend" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Serviço não encontrado. A instalação pode ter falhado." -ForegroundColor Red
        Write-Host "Verifique os logs de erro acima." -ForegroundColor Yellow
    }
}

