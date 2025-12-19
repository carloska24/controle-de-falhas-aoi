@echo off
chcp 65001 >nul
title Iniciar Sistema - Intranet
color 0A

echo ============================================
echo   Sistema de Controle de Falhas AOI
echo   Iniciando para Intranet
echo ============================================
echo.

REM IP fixo configurado
echo [1/4] Configurando IP fixo...
set IP=192.168.0.67
echo    IP configurado: %IP%
echo.

REM Criar/atualizar arquivo .env.local
echo [2/4] Configurando variáveis de ambiente...
    echo NEXT_PUBLIC_API_URL=http://%IP%:3001 > "nextjs-frontend\.env.local"
echo    Arquivo .env.local configurado com IP: %IP%
echo.

REM Verificar se Node.js está instalado
echo [3/4] Verificando instalação...
where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js não encontrado!
    echo Instale o Node.js antes de continuar.
    pause
    exit /b 1
)
echo    Node.js encontrado
echo.

REM Verificar se as dependências estão instaladas
if not exist "backend\node_modules" (
    echo    Instalando dependências do backend...
    cd backend
    call npm install
    cd ..
)

if not exist "nextjs-frontend\node_modules" (
    echo    Instalando dependências do frontend...
    cd nextjs-frontend
    call npm install
    cd ..
)

echo.
echo [4/4] Iniciando servidores...
echo.

REM Iniciar Backend
echo    Iniciando Backend (porta 3001)...
start "Backend - Controle Falhas AOI" cmd /k "cd /d %~dp0backend && echo Backend rodando em http://%IP%:3001 && node server.js"

timeout /t 3 /nobreak >nul

REM Iniciar Frontend
echo    Iniciando Frontend (porta 3000)...
start "Frontend - Controle Falhas AOI" cmd /k "cd /d %~dp0nextjs-frontend && echo Frontend rodando em http://%IP%:3000 && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   ✓ Servidores iniciados com sucesso!
echo ============================================
echo.
echo   Acesse o sistema:
echo   • No servidor: http://localhost:3000
echo   • Na rede:     http://%IP%:3000
echo.
echo   Backend API:   http://%IP%:3001
echo.
echo ============================================
echo   IMPORTANTE:
echo   - Certifique-se de que o firewall permite
echo     as portas 3000 e 3001
echo   - Os outros computadores devem acessar:
echo     http://%IP%:3000
echo ============================================
echo.
pause

