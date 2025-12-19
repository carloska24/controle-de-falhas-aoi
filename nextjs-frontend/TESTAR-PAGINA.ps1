# Script de Teste Completo da Página Index
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE COMPLETO DA PÁGINA INDEX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se servidor está rodando
Write-Host "[1/5] Verificando servidor Next.js..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✅ Servidor respondendo - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Servidor NÃO está rodando!" -ForegroundColor Red
    Write-Host "     Execute: npm run dev na pasta nextjs-frontend" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar se página index carrega
Write-Host ""
Write-Host "[2/5] Testando página /index..." -ForegroundColor Yellow
try {
    $pageResponse = Invoke-WebRequest -Uri "http://localhost:3000/index" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($pageResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Página carrega - Status: $($pageResponse.StatusCode)" -ForegroundColor Green
        Write-Host "  ✅ Tamanho: $($pageResponse.Content.Length) bytes" -ForegroundColor Cyan
    } else {
        Write-Host "  ❌ Status inesperado: $($pageResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ ERRO ao carregar página!" -ForegroundColor Red
    Write-Host "     Mensagem: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "     Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
    exit 1
}

# 3. Verificar imports de componentes
Write-Host ""
Write-Host "[3/5] Verificando componentes..." -ForegroundColor Yellow
$componentes = @(
    "components/index/ProTimer.tsx",
    "components/index/ProForm.tsx",
    "components/index/ProTable.tsx",
    "components/index/ProMetrics.tsx",
    "components/index/ProQuality.tsx",
    "components/index/ProQuickLinks.tsx",
    "components/ui/Badge.tsx"
)

$erros = 0
foreach ($comp in $componentes) {
    if (Test-Path $comp) {
        Write-Host "  ✅ $comp" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $comp FALTANDO!" -ForegroundColor Red
        $erros++
    }
}

if ($erros -gt 0) {
    Write-Host ""
    Write-Host "  ❌ $erros componente(s) faltando!" -ForegroundColor Red
    exit 1
}

# 4. Verificar imports no código
Write-Host ""
Write-Host "[4/5] Verificando imports no código..." -ForegroundColor Yellow

# Verificar se Badge está importado em ProForm
$proFormContent = Get-Content "components/index/ProForm.tsx" -Raw
if ($proFormContent -match "import.*Badge.*from") {
    Write-Host "  ✅ Badge importado em ProForm" -ForegroundColor Green
} else {
    Write-Host "  ❌ Badge NÃO importado em ProForm!" -ForegroundColor Red
    $erros++
}

# Verificar se useMemo está importado
if ($proFormContent -match "useMemo") {
    Write-Host "  ✅ useMemo importado" -ForegroundColor Green
} else {
    Write-Host "  ❌ useMemo NÃO importado!" -ForegroundColor Red
    $erros++
}

# 5. Teste final - tentar abrir no navegador
Write-Host ""
Write-Host "[5/5] Teste final..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $finalTest = Invoke-WebRequest -Uri "http://localhost:3000/index" -UseBasicParsing -TimeoutSec 5
    if ($finalTest.Content.Length -gt 1000) {
        Write-Host "  ✅ Página carregou conteúdo significativo" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅✅✅ TESTE CONCLUÍDO COM SUCESSO! ✅✅✅" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Abrindo navegador..." -ForegroundColor Cyan
        Start-Process "http://localhost:3000/index"
    } else {
        Write-Host "  ⚠️ Página muito pequena ($($finalTest.Content.Length) bytes)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Erro no teste final: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

