@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ================================================
echo   INSTALAÇÃO COMPLETA - Controle de Falhas AOI
echo   Next.js 16.0.1 + Backend Express 5.1.0
echo ================================================
echo.

:: ============================================
:: 1. VERIFICAR NODE.JS
:: ============================================
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERRO: Node.js não encontrado!
    echo.
    echo Por favor, instale Node.js 18 ou superior:
    echo https://nodejs.org/
    echo.
    echo Após instalar, execute este script novamente.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=v" %%i in ("!NODE_VERSION!") do set NODE_MAJOR=%%i
for /f "tokens=1 delims=." %%i in ("!NODE_MAJOR!") do set NODE_MAJOR=%%i

echo ✓ Node.js encontrado: !NODE_VERSION!
if !NODE_MAJOR! LSS 18 (
    echo.
    echo ⚠ AVISO: Node.js versão !NODE_MAJOR! detectada.
    echo Recomendado: Node.js 18 ou superior
    echo.
    choice /C SN /M "Deseja continuar mesmo assim"
    if errorlevel 2 exit /b 1
)

:: Verificar npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ❌ ERRO: npm não encontrado!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm encontrado: !NPM_VERSION!
echo.

:: ============================================
:: 2. VERIFICAR ESTRUTURA DO PROJETO
:: ============================================
echo [2/6] Verificando estrutura do projeto...

if not exist "backend" (
    echo ❌ ERRO: Pasta 'backend' não encontrada!
    echo Certifique-se de estar na raiz do projeto.
    pause
    exit /b 1
)

if not exist "nextjs-frontend" (
    echo ❌ ERRO: Pasta 'nextjs-frontend' não encontrada!
    echo Certifique-se de estar na raiz do projeto.
    pause
    exit /b 1
)

if not exist "backend\package.json" (
    echo ❌ ERRO: backend\package.json não encontrado!
    pause
    exit /b 1
)

if not exist "nextjs-frontend\package.json" (
    echo ❌ ERRO: nextjs-frontend\package.json não encontrado!
    pause
    exit /b 1
)

echo ✓ Estrutura do projeto verificada
echo.

:: ============================================
:: 3. INSTALAR DEPENDÊNCIAS DO BACKEND
:: ============================================
echo [3/6] Instalando dependências do BACKEND...
echo.

cd backend

echo Limpando cache npm (se necessário)...
call npm cache verify >nul 2>&1

if exist "package-lock.json" (
    echo Usando npm ci (instalação limpa e rápida)...
    call npm ci --legacy-peer-deps
    if errorlevel 1 (
        echo Tentando npm install como fallback...
        call npm install --legacy-peer-deps
    )
) else (
    echo Usando npm install...
    call npm install --legacy-peer-deps
)

if errorlevel 1 (
    echo.
    echo ❌ ERRO ao instalar dependências do backend!
    echo Verifique sua conexão com a internet e tente novamente.
    cd ..
    pause
    exit /b 1
)

echo.
echo ✓ Dependências do backend instaladas!
cd ..
echo.

:: ============================================
:: 4. CONFIGURAR ARQUIVO .env DO BACKEND
:: ============================================
echo [4/6] Configurando arquivo .env do backend...

cd backend

if not exist ".env" (
    if exist ".env.example" (
        echo Copiando .env.example para .env...
        copy ".env.example" ".env" >nul
        echo ✓ Arquivo .env criado a partir do exemplo
    ) else (
        echo ⚠ AVISO: .env.example não encontrado
        echo Criando .env básico...
        (
            echo # Configurações do Backend
            echo PORT=3001
            echo NODE_ENV=development
            echo JWT_SECRET=local-dev-secret-change-in-production
            echo DEV_SEED_KEY=local-dev-2024
            echo COOKIE_SECURE=false
            echo CORS_ORIGIN=http://localhost:3000
        ) > .env
        echo ✓ Arquivo .env básico criado
    )
) else (
    echo ✓ Arquivo .env já existe
)

cd ..
echo.

:: ============================================
:: 5. INSTALAR DEPENDÊNCIAS DO FRONTEND (NEXT.JS)
:: ============================================
echo [5/6] Instalando dependências do FRONTEND (Next.js 16.0.1)...
echo.

cd nextjs-frontend

echo Limpando cache npm (se necessário)...
call npm cache verify >nul 2>&1

if exist "package-lock.json" (
    echo Usando npm ci (instalação limpa e rápida)...
    call npm ci --legacy-peer-deps
    if errorlevel 1 (
        echo Tentando npm install como fallback...
        call npm install --legacy-peer-deps
    )
) else (
    echo Usando npm install...
    call npm install --legacy-peer-deps
)

if errorlevel 1 (
    echo.
    echo ❌ ERRO ao instalar dependências do frontend!
    echo Verifique sua conexão com a internet e tente novamente.
    cd ..
    pause
    exit /b 1
)

echo.
echo ✓ Dependências do frontend instaladas!
cd ..
echo.

:: ============================================
:: 6. VERIFICAÇÃO FINAL E RESUMO
:: ============================================
echo [6/6] Verificação final...
echo.

:: Verificar versões instaladas
cd nextjs-frontend
for /f "tokens=*" %%i in ('npm list next --depth=0 2^>nul ^| findstr /i "next@"') do set NEXT_VERSION=%%i
cd ..

cd backend
for /f "tokens=*" %%i in ('npm list express --depth=0 2^>nul ^| findstr /i "express@"') do set EXPRESS_VERSION=%%i
cd ..

echo ================================================
echo   ✓ INSTALAÇÃO CONCLUÍDA COM SUCESSO!
echo ================================================
echo.
echo Resumo:
echo   - Node.js: !NODE_VERSION!
echo   - npm: !NPM_VERSION!
if defined NEXT_VERSION echo   - Next.js: !NEXT_VERSION!
if defined EXPRESS_VERSION echo   - Express: !EXPRESS_VERSION!
echo.
echo Próximos passos:
echo   1. Inicie o backend:     cd backend ^&^& npm start
echo   2. Inicie o frontend:    cd nextjs-frontend ^&^& npm run dev
echo.
echo   Ou use o script: INICIAR-AMBOS-SERVIDORES.bat
echo.
echo ================================================
echo.

pause

