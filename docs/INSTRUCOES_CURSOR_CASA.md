# Instruções para Configurar o Cursor no PC de Casa

## Pré-requisitos

1. **Instalar o Cursor**
   - Baixe de: https://cursor.sh/
   - Instale normalmente

2. **Instalar Node.js**
   - Baixe de: https://nodejs.org/
   - Versão recomendada: 18+ ou 20+
   - Marque a opção "Add to PATH" durante a instalação

3. **Clonar o repositório**
   ```powershell
   git clone https://github.com/seu-usuario/controle-de-falhas-aoi.git C:\controle-de-falhas-aoi
   cd C:\controle-de-falhas-aoi
   ```

## Opção 1: Configuração Completa (Recomendada)

Execute o script completo que configura tudo:

```powershell
# No PowerShell, na pasta do projeto
.\configurar-cursor-casa.ps1
```

**O que este script faz:**
- ✅ Instala todas as extensões
- ✅ Configura settings do workspace
- ✅ Cria tasks personalizadas
- ✅ Configura atalhos de teclado
- ✅ Cria .editorconfig
- ✅ Configura extensões recomendadas
- ✅ Verifica dependências

## Opção 2: Apenas Extensões

Se quiser instalar apenas as extensões:

```powershell
.\instalar-extensoes-cursor.ps1
```

## Opção 3: Configuração Manual

### 1. Instalar Extensões Manualmente

Abra o Cursor e instale estas extensões:

```
aaronduino.gemini
bradlc.vscode-tailwindcss
christian-kohler.path-intellisense
dart-code.dart-code
dart-code.flutter
dbaeumer.vscode-eslint
editorconfig.editorconfig
esbenp.prettier-vscode
formulahendry.auto-rename-tag
formulahendry.code-runner
github.copilot
github.copilot-chat
google.gemini-cli-vscode-ide-companion
google.geminicodeassist
ikasann-self.vscode-chat-gpt
ms-vscode.powershell
ms-vsliveshare.vsliveshare
pflannery.vscode-versionlens
pkief.material-icon-theme
printfn.gemini-improved
ritwickdey.liveserver
roylam23.gpt-code
silasnevstad.gpthelper
usernamehw.errorlens
```

### 2. Configurar Settings

Crie o arquivo `.vscode/settings.json`:

```json
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
```

### 3. Configurar Tasks

Crie o arquivo `.vscode/tasks.json`:

```json
{
	"version": "2.0.0",
	"tasks": [
		{
			"label": "Iniciar servidor backend",
			"command": "cd backend; $env:PORT=3001; $env:SILENCE_LOGS='true'; npm run start",
			"type": "shell",
			"problemMatcher": ["$eslint-stylish"],
			"group": "build"
		},
		{
			"label": "Iniciar backend em modo dev",
			"command": "cd backend; $env:PORT=3001; $env:SILENCE_LOGS='false'; npm run dev",
			"type": "shell",
			"problemMatcher": ["$eslint-stylish"],
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
		}
	]
}
```

## Pós-Instalação

### 1. Instalar Dependências do Backend

```powershell
cd C:\controle-de-falhas-aoi\backend
npm install
```

### 2. Configurar Variáveis de Ambiente (Opcional)

Crie um arquivo `.env` na pasta `backend`:

```env
JWT_SECRET=sua-chave-secreta-aqui
DEV_SEED_KEY=local-dev-2024
PORT=3001
NODE_ENV=development
SILENCE_LOGS=false
CORS_ORIGIN=http://localhost:5500
COOKIE_SECURE=false
```

### 3. Testar a Configuração

```powershell
# Iniciar o backend
cd C:\controle-de-falhas-aoi\backend
npm run dev

# Em outro terminal, testar
Invoke-RestMethod -Uri http://localhost:3001/health
```

## Atalhos Configurados

- `Ctrl+Shift+B` - Iniciar servidor backend
- `Ctrl+Shift+D` - Modo desenvolvimento
- `Ctrl+Shift+H` - Testar health endpoint
- `Ctrl+Shift+I` - Instalar dependências
- `Ctrl+Shift+T` - Executar testes

## Extensões Principais

### Desenvolvimento
- **ESLint** - Linting de JavaScript
- **Prettier** - Formatação de código
- **Path Intellisense** - Autocompletar caminhos
- **Auto Rename Tag** - Renomear tags HTML automaticamente

### IA e Produtividade
- **GitHub Copilot** - IA para código
- **Gemini** - Assistente de IA do Google
- **ChatGPT** - Integração com ChatGPT

### Visual
- **Material Icon Theme** - Ícones bonitos
- **Error Lens** - Mostra erros inline
- **Live Server** - Servidor local para frontend

### PowerShell
- **PowerShell** - Suporte nativo ao PowerShell
- **Code Runner** - Executar código rapidamente

## Solução de Problemas

### Extensões não instalam
```powershell
# Verificar se o Cursor está no PATH
cursor --version

# Instalar manualmente uma extensão
cursor --install-extension ms-vscode.powershell
```

### Backend não inicia
```powershell
# Verificar Node.js
node -v
npm -v

# Verificar dependências
cd backend
npm install

# Verificar porta
netstat -an | findstr :3001
```

### Tasks não funcionam
- Verifique se está na pasta raiz do projeto
- Verifique se o PowerShell está configurado como terminal padrão
- Execute as tasks via Command Palette (`Ctrl+Shift+P`)

## Backup das Configurações

Para fazer backup das suas configurações atuais:

```powershell
# Copiar configurações do usuário
Copy-Item "$env:APPDATA\Cursor\User\settings.json" ".\backup-settings.json"
Copy-Item "$env:APPDATA\Cursor\User\keybindings.json" ".\backup-keybindings.json"

# Listar extensões instaladas
cursor --list-extensions > extensoes-instaladas.txt
```

Agora você tem o Cursor configurado exatamente como no trabalho! 🚀
