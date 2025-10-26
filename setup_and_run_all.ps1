<#
Script de setup completo para rodar o projeto em um novo computador (Windows/PowerShell)
Execute este script a partir da raiz do projeto clonado.
#>

Write-Host "Iniciando setup completo do projeto..." -ForegroundColor Cyan

# 1. Checar Node.js
try {
    $nodeVersion = & node -v
    Write-Host "Node.js detectado: $nodeVersion"
} catch {
    Write-Error "Node.js não encontrado no PATH. Instale Node.js 16+ antes de continuar."
    exit 1
}

# 2. Instalar dependências do backend
Write-Host "Instalando dependências do backend..." -ForegroundColor Yellow
Push-Location .\backend
if (Test-Path package-lock.json) {
    npm ci
} else {
    npm install
}
Pop-Location

# 3. Verificar banco de dados
if (-Not (Test-Path .\backend\aoi.db)) {
    Write-Warning "Arquivo aoi.db não encontrado em backend/. O sistema criará um novo banco vazio ao iniciar, ou restaure um backup se necessário."
}

# 4. Copiar .env.example para .env se não existir
if (-Not (Test-Path .\backend\.env) -and (Test-Path .\backend\.env.example)) {
    Copy-Item .\backend\.env.example .\backend\.env
    Write-Host ".env criado a partir do exemplo. Edite se necessário."
}

# 5. Instrução final
Write-Host "Setup concluído! Para rodar o backend, use:" -ForegroundColor Green
Write-Host "    cd backend; npm run dev" -ForegroundColor Green
Write-Host "Acesse o README.md do backend para mais instruções."
