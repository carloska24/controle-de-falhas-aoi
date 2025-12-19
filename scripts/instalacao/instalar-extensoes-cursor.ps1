<#
Script simples para instalar apenas as extensões do Cursor
#>

Write-Host "=== Instalador de Extensões do Cursor ===" -ForegroundColor Cyan
Write-Host ""

# Lista de extensões
$extensions = @(
    "aaronduino.gemini",
    "bradlc.vscode-tailwindcss", 
    "christian-kohler.path-intellisense",
    "dart-code.dart-code",
    "dart-code.flutter",
    "dbaeumer.vscode-eslint",
    "editorconfig.editorconfig",
    "esbenp.prettier-vscode",
    "formulahendry.auto-rename-tag",
    "formulahendry.code-runner",
    "github.copilot",
    "github.copilot-chat",
    "google.gemini-cli-vscode-ide-companion",
    "google.geminicodeassist",
    "ikasann-self.vscode-chat-gpt",
    "ms-vscode.powershell",
    "ms-vsliveshare.vsliveshare",
    "pflannery.vscode-versionlens",
    "pkief.material-icon-theme",
    "printfn.gemini-improved",
    "ritwickdey.liveserver",
    "roylam23.gpt-code",
    "silasnevstad.gpthelper",
    "usernamehw.errorlens"
)

Write-Host "Instalando $($extensions.Count) extensões..." -ForegroundColor Yellow
Write-Host ""

$installed = 0
$failed = 0

foreach ($extension in $extensions) {
    Write-Host "Instalando: $extension" -ForegroundColor Cyan
    try {
        & cursor --install-extension $extension --force 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Instalado" -ForegroundColor Green
            $installed++
        } else {
            Write-Host "  ✗ Falhou" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "  ✗ Erro: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "=== Resumo ===" -ForegroundColor Cyan
Write-Host "✓ Instaladas: $installed" -ForegroundColor Green
Write-Host "✗ Falharam: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "Todas as extensões foram instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Algumas extensões falharam. Verifique sua conexão com a internet." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Reinicie o Cursor para ativar todas as extensões." -ForegroundColor Yellow
