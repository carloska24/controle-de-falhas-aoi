<#
Script para configurar o Cursor no PC de casa
Instala extensões, configurações e prepara o ambiente de desenvolvimento
#>

param(
    [string]$ProjectPath = "C:\controle-de-falhas-aoi",
    [switch]$SkipExtensions,
    [switch]$SkipSettings
)

Write-Host "=== Configurador do Cursor para PC de Casa ===" -ForegroundColor Cyan
Write-Host "Caminho do projeto: $ProjectPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se o Cursor está instalado
function Test-CursorInstalled {
    try {
        $cursorVersion = & cursor --version 2>$null
        if ($cursorVersion) {
            Write-Host "✓ Cursor encontrado: $cursorVersion" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "✗ Cursor não encontrado no PATH" -ForegroundColor Red
        return $false
    }
}

# Instalar extensões
function Install-Extensions {
    if ($SkipExtensions) {
        Write-Host "Pulando instalação de extensões..." -ForegroundColor Yellow
        return
    }

    Write-Host "=== Instalando Extensões ===" -ForegroundColor Cyan
    
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

    foreach ($extension in $extensions) {
        Write-Host "Instalando: $extension" -ForegroundColor Yellow
        try {
            & cursor --install-extension $extension --force
            Write-Host "  ✓ Instalado" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Configurar settings do workspace
function Setup-WorkspaceSettings {
    if ($SkipSettings) {
        Write-Host "Pulando configuração de settings..." -ForegroundColor Yellow
        return
    }

    Write-Host "=== Configurando Settings do Workspace ===" -ForegroundColor Cyan
    
    # Criar diretório .vscode se não existir
    $vscodeDir = Join-Path $ProjectPath ".vscode"
    if (-not (Test-Path $vscodeDir)) {
        New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
        Write-Host "✓ Diretório .vscode criado" -ForegroundColor Green
    }

    # Settings.json
    $settingsContent = @'
{
    "liveServer.settings.port": 5501,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "emmet.includeLanguages": {
        "javascript": "javascriptreact",
        "typescript": "typescriptreact"
    },
    "files.associations": {
        "*.js": "javascript",
        "*.jsx": "javascriptreact",
        "*.ts": "typescript",
        "*.tsx": "typescriptreact"
    },
    "powershell.integratedConsole.showOnStartup": false,
    "terminal.integrated.defaultProfile.windows": "PowerShell",
    "workbench.colorTheme": "Material Icon Theme",
    "editor.minimap.enabled": true,
    "editor.wordWrap": "on",
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "files.trimFinalNewlines": true
}
'@

    $settingsPath = Join-Path $vscodeDir "settings.json"
    $settingsContent | Out-File -FilePath $settingsPath -Encoding UTF8
    Write-Host "✓ settings.json configurado" -ForegroundColor Green

    # Tasks.json
    $tasksContent = @'
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Iniciar servidor backend",
			"command": "cd backend; $env:PORT=3001; $env:SILENCE_LOGS='true'; npm run start",
			"type": "shell",
			"problemMatcher": [
				"$eslint-stylish"
			],
			"group": "build"
		},
		{
			"label": "Iniciar backend em modo dev",
			"command": "cd backend; $env:PORT=3001; $env:SILENCE_LOGS='false'; npm run dev",
			"type": "shell",
			"problemMatcher": [
				"$eslint-stylish"
			],
			"group": "build"
		},
		{
			"label": "Testar health endpoint",
			"command": "Invoke-RestMethod -Uri http://localhost:3001/health",
			"type": "shell",
			"group": "test"
		},
		{
			"label": "Instalar dependências backend",
			"command": "cd backend; npm install",
			"type": "shell",
			"group": "build"
		},
		{
			"label": "Executar testes backend",
			"command": "cd backend; npm test",
			"type": "shell",
			"group": "test"
		},
		{
			"label": "Parar serviço aoi-backend",
			"command": "Stop-Service -Name aoi-backend",
			"type": "shell",
			"group": "build"
		},
		{
			"label": "Iniciar serviço aoi-backend",
			"command": "Start-Service -Name aoi-backend",
			"type": "shell",
			"group": "build"
		}
	]
}
'@

    $tasksPath = Join-Path $vscodeDir "tasks.json"
    $tasksContent | Out-File -FilePath $tasksPath -Encoding UTF8
    Write-Host "✓ tasks.json configurado" -ForegroundColor Green
}

# Configurar extensões recomendadas
function Setup-ExtensionsJson {
    Write-Host "=== Configurando Extensões Recomendadas ===" -ForegroundColor Cyan
    
    $extensionsContent = @'
{
    "recommendations": [
        "aaronduino.gemini",
        "bradlc.vscode-tailwindcss",
        "christian-kohler.path-intellisense",
        "dbaeumer.vscode-eslint",
        "editorconfig.editorconfig",
        "esbenp.prettier-vscode",
        "formulahendry.auto-rename-tag",
        "formulahendry.code-runner",
        "github.copilot",
        "github.copilot-chat",
        "google.gemini-cli-vscode-ide-companion",
        "google.geminicodeassist",
        "ms-vscode.powershell",
        "ms-vsliveshare.vsliveshare",
        "pkief.material-icon-theme",
        "ritwickdey.liveserver",
        "usernamehw.errorlens"
    ]
}
'@

    $extensionsPath = Join-Path $ProjectPath ".vscode\extensions.json"
    $extensionsContent | Out-File -FilePath $extensionsPath -Encoding UTF8
    Write-Host "✓ extensions.json configurado" -ForegroundColor Green
}

# Configurar .editorconfig
function Setup-EditorConfig {
    Write-Host "=== Configurando .editorconfig ===" -ForegroundColor Cyan
    
    $editorConfigContent = @'
root = true

[*]
charset = utf-8
end_of_line = crlf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.{js,jsx,ts,tsx}]
indent_size = 2

[*.{html,css,scss}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{json,yml,yaml}]
indent_size = 2
'@

    $editorConfigPath = Join-Path $ProjectPath ".editorconfig"
    $editorConfigContent | Out-File -FilePath $editorConfigPath -Encoding UTF8
    Write-Host "✓ .editorconfig configurado" -ForegroundColor Green
}

# Configurar atalhos personalizados
function Setup-Keybindings {
    Write-Host "=== Configurando Atalhos Personalizados ===" -ForegroundColor Cyan
    
    $keybindingsContent = @'
[
    {
        "key": "ctrl+shift+b",
        "command": "workbench.action.tasks.runTask",
        "args": "Iniciar servidor backend"
    },
    {
        "key": "ctrl+shift+d",
        "command": "workbench.action.tasks.runTask", 
        "args": "Iniciar backend em modo dev"
    },
    {
        "key": "ctrl+shift+h",
        "command": "workbench.action.tasks.runTask",
        "args": "Testar health endpoint"
    },
    {
        "key": "ctrl+shift+i",
        "command": "workbench.action.tasks.runTask",
        "args": "Instalar dependências backend"
    },
    {
        "key": "ctrl+shift+t",
        "command": "workbench.action.tasks.runTask",
        "args": "Executar testes backend"
    }
]
'@

    $keybindingsPath = Join-Path $ProjectPath ".vscode\keybindings.json"
    $keybindingsContent | Out-File -FilePath $keybindingsPath -Encoding UTF8
    Write-Host "✓ keybindings.json configurado" -ForegroundColor Green
}

# Verificar dependências do projeto
function Check-ProjectDependencies {
    Write-Host "=== Verificando Dependências do Projeto ===" -ForegroundColor Cyan
    
    # Verificar Node.js
    try {
        $nodeVersion = & node -v
        Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Node.js não encontrado" -ForegroundColor Red
        Write-Host "  Instale Node.js v18+ de https://nodejs.org" -ForegroundColor Yellow
    }
    
    # Verificar npm
    try {
        $npmVersion = & npm -v
        Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ npm não encontrado" -ForegroundColor Red
    }
    
    # Verificar se o projeto existe
    if (Test-Path $ProjectPath) {
        Write-Host "✓ Projeto encontrado em: $ProjectPath" -ForegroundColor Green
        
        # Verificar package.json do backend
        $backendPackage = Join-Path $ProjectPath "backend\package.json"
        if (Test-Path $backendPackage) {
            Write-Host "✓ Backend package.json encontrado" -ForegroundColor Green
        } else {
            Write-Host "✗ Backend package.json não encontrado" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Projeto não encontrado em: $ProjectPath" -ForegroundColor Red
        Write-Host "  Clone o repositório primeiro" -ForegroundColor Yellow
    }
}

# Instruções pós-instalação
function Show-PostInstallInstructions {
    Write-Host ""
    Write-Host "=== Instruções Pós-Instalação ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Abra o projeto no Cursor:" -ForegroundColor Yellow
    Write-Host "   cursor `"$ProjectPath`"" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Instale as dependências do backend:" -ForegroundColor Yellow
    Write-Host "   cd `"$ProjectPath\backend`"" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Configure as variáveis de ambiente (se necessário):" -ForegroundColor Yellow
    Write-Host "   Crie um arquivo .env na pasta backend com suas configurações" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Use os atalhos configurados:" -ForegroundColor Yellow
    Write-Host "   Ctrl+Shift+B - Iniciar backend" -ForegroundColor White
    Write-Host "   Ctrl+Shift+D - Modo desenvolvimento" -ForegroundColor White
    Write-Host "   Ctrl+Shift+H - Testar health" -ForegroundColor White
    Write-Host "   Ctrl+Shift+I - Instalar dependências" -ForegroundColor White
    Write-Host "   Ctrl+Shift+T - Executar testes" -ForegroundColor White
    Write-Host ""
    Write-Host "5. Para instalar o serviço Windows (opcional):" -ForegroundColor Yellow
    Write-Host "   .\install-nssm.ps1 install" -ForegroundColor White
    Write-Host ""
}

# Execução principal
Write-Host "Iniciando configuração do Cursor..." -ForegroundColor Green
Write-Host ""

# Verificar se o Cursor está instalado
if (-not (Test-CursorInstalled)) {
    Write-Host "Por favor, instale o Cursor primeiro:" -ForegroundColor Red
    Write-Host "https://cursor.sh/" -ForegroundColor Yellow
    exit 1
}

# Executar configurações
Check-ProjectDependencies
Install-Extensions
Setup-WorkspaceSettings
Setup-ExtensionsJson
Setup-EditorConfig
Setup-Keybindings

Write-Host ""
Write-Host "=== Configuração Concluída! ===" -ForegroundColor Green
Show-PostInstallInstructions

Write-Host "Script finalizado. O Cursor está configurado para o projeto!" -ForegroundColor Green
