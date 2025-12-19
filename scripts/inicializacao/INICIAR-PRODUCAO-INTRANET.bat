@echo off
chcp 65001 >nul
title Iniciar Sistema - Produção Intranet (IP: 192.168.0.67)
color 0B

REM Mudar para o diretório raiz do projeto
cd /d "%~dp0..\.."

echo ============================================
echo   Sistema de Controle de Falhas AOI
echo   Iniciando em MODO PRODUÇÃO - Intranet
echo   IP: 192.168.0.67
echo ============================================
echo.

REM IP fixo configurado
set SERVER_IP=192.168.0.67

echo [1/5] Verificando configurações...
echo    IP do servidor: %SERVER_IP%
echo    Diretório: %CD%
echo.

REM Criar arquivo .env.local se não existir
echo [2/5] Configurando variáveis de ambiente...
if not exist "nextjs-frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://%SERVER_IP%:3001 > "nextjs-frontend\.env.local"
    echo    Arquivo .env.local criado
) else (
    echo    Atualizando .env.local com IP correto...
    echo NEXT_PUBLIC_API_URL=http://%SERVER_IP%:3001 > "nextjs-frontend\.env.local"
    echo    Arquivo .env.local atualizado
)
echo.

REM Verificar se Node.js está instalado
echo [3/5] Verificando instalação...
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
echo [4/5] Verificando dependências...
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

REM Verificar se o build do Next.js existe
if not exist "nextjs-frontend\.next" (
    echo    Build do Next.js não encontrado. Compilando...
    cd nextjs-frontend
    call npm run build
    cd ..
    echo    Build concluído!
) else (
    echo    Build do Next.js encontrado
)
echo.

echo [5/5] Iniciando servidores em modo PRODUÇÃO...
echo.

REM Iniciar Backend
echo    Iniciando Backend (porta 3001)...
start "Backend - Controle Falhas AOI (Produção)" cmd /k "cd /d %CD%\backend & echo Backend rodando em http://%SERVER_IP%:3001 & node server.js"

timeout /t 3 /nobreak >nul

REM Iniciar Frontend em modo produção
echo    Iniciando Frontend em modo PRODUÇÃO (porta 3000)...
start "Frontend - Controle Falhas AOI (Produção)" cmd /k "cd /d %CD%\nextjs-frontend & echo Frontend rodando em http://%SERVER_IP%:3000 & npm start"

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   ✓ Servidores iniciados em MODO PRODUÇÃO!
echo ============================================
echo.
echo   Acesse o sistema:
echo   • No servidor: http://localhost:3000
echo   • Na rede:     http://%SERVER_IP%:3000
echo.
echo   Backend API:   http://%SERVER_IP%:3001
echo.
echo ============================================
echo   IMPORTANTE:
echo   - Modo PRODUÇÃO: Next.js compilado (mais rápido)
echo   - Certifique-se de que o firewall permite
echo     as portas 3000 e 3001
echo   - Os outros computadores devem acessar:
echo     http://%SERVER_IP%:3000
echo ============================================
echo.
pause

