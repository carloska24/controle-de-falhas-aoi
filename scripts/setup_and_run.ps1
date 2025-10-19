<#
Setup and start script for a fresh clone on Windows (PowerShell).
This script will:
 - Ensure Node is installed (checks node version)
 - Install backend dependencies
 - (Optional) restore DB from aoi-db-backup.zip if present
 - Start the backend with npm run dev

Usage: run from project root:
    .\scripts\setup_and_run.ps1 [-RestoreZipPath 'C:\path\aoi-db-backup.zip']
#>
param(
    [string]$RestoreZipPath = "",
    [switch]$NoInstall
)

Write-Host "Setup and run script starting..." -ForegroundColor Cyan
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $projectRoot

# Node check
try {
    $nodeVersion = & node -v
    Write-Host "Node detected: $nodeVersion"
} catch {
    Write-Error "Node.js não encontrado no PATH. Instale Node.js v16+ antes de continuar."
    exit 1
}

# Install backend deps
if (-Not $NoInstall) {
    Write-Host "Instalando dependências do backend..." -ForegroundColor Yellow
    Push-Location .\backend
    npm install
    Pop-Location
}

# Optionally restore DB
if ($RestoreZipPath -and (Test-Path $RestoreZipPath)) {
    Write-Host "Restaurando DB a partir de: $RestoreZipPath" -ForegroundColor Yellow
    .\scripts\restore-db.ps1 -ZipPath $RestoreZipPath
} else {
    Write-Host "Nenhum ZIP de restauração informado ou encontrado. Pulando restauração." -ForegroundColor DarkGray
}

# Start backend
Write-Host "Iniciando backend... (abra um novo terminal se quiser ver logs)" -ForegroundColor Green
Push-Location .\backend
Start-Process -FilePath npm -ArgumentList 'run','dev' -NoNewWindow
Pop-Location

Write-Host "Script finalizado. Backend deve estar iniciando em background." -ForegroundColor Green
exit 0
