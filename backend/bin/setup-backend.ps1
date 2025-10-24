# Setup rápido do backend (PowerShell)
# Executar na pasta do repositório: \n# cd controle-de-falhas-aoi\n# .\backend\setup-backend.ps1

param(
    [string]$EnvJWTSecret = "uma-senha-fraca-para-dev",
    [string]$EnvSeedKey = "local-dev-2024",
    [string]$EnvPort = "3001",
    [string]$EnvCors = "http://localhost:5500",
    [string]$EnvCookieSecure = "false"
)

Write-Host "== Setup rápido do backend =="
Write-Host "Instalando dependências (npm ci)..."
Push-Location (Join-Path (Get-Location) "backend")
try {
    npm ci
} catch {
    Write-Warning "Falha em 'npm ci'. Tentando 'npm install'..."
    npm install
}

Write-Host "Definindo variáveis de ambiente na sessão atual (temporárias)..."
$env:JWT_SECRET = $EnvJWTSecret
$env:DEV_SEED_KEY = $EnvSeedKey
$env:PORT = $EnvPort
$env:CORS_ORIGIN = $EnvCors
$env:COOKIE_SECURE = $EnvCookieSecure

Write-Host "Variáveis definidas (apenas para esta sessão PowerShell):"
Write-Host " JWT_SECRET = $env:JWT_SECRET"
Write-Host " DEV_SEED_KEY = $env:DEV_SEED_KEY"
Write-Host " PORT = $env:PORT"
Write-Host " CORS_ORIGIN = $env:CORS_ORIGIN"
Write-Host " COOKIE_SECURE = $env:COOKIE_SECURE"

Write-Host "Para iniciar o servidor em dev execute: npm run dev"
Write-Host "Para rodar testes execute: npm test -- --detectOpenHandles -i"

Pop-Location
