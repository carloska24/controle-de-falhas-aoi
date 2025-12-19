@echo off
chcp 65001 >nul
title Iniciar Sistema - Producao Intranet IP 192.168.0.67
color 0B

cd /d "%~dp0"

echo ============================================
echo   Sistema de Controle de Falhas AOI
echo   Iniciando em MODO PRODUCAO - Intranet
echo   IP: 192.168.0.67
echo ============================================
echo.

set SERVER_IP=192.168.0.67

echo [1/5] Verificando configuracoes...
echo    IP do servidor: %SERVER_IP%
echo    Diretorio: %CD%
echo.

echo [2/5] Configurando variaveis de ambiente...
echo NEXT_PUBLIC_API_URL=http://%SERVER_IP%:3001 > "nextjs-frontend\.env.local"
echo    Arquivo .env.local configurado
echo.

echo [3/5] Verificando instalacao...
where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)
echo    Node.js encontrado
echo.

echo [4/5] Verificando dependencias...
if not exist "backend\node_modules" (
    echo    Instalando dependencias do backend...
    cd backend
    call npm install
    cd ..
)

if not exist "nextjs-frontend\node_modules" (
    echo    Instalando dependencias do frontend...
    cd nextjs-frontend
    call npm install
    cd ..
)

if not exist "nextjs-frontend\.next" (
    echo    Build nao encontrado. Compilando...
    cd nextjs-frontend
    call npm run build
    if errorlevel 1 (
        echo ERRO: Falha na compilacao!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo    Build concluido!
) else (
    echo    Build encontrado
)
echo.

echo [5/5] Iniciando servidores...
echo.

echo    Iniciando Backend (porta 3001)...
start "Backend - Producao" cmd /k "cd /d %CD%\backend & echo Backend: http://%SERVER_IP%:3001 & node server.js"

timeout /t 3 /nobreak >nul

echo    Iniciando Frontend (porta 3000)...
start "Frontend - Producao" cmd /k "cd /d %CD%\nextjs-frontend & echo Frontend: http://%SERVER_IP%:3000 & npm start"

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   Servidores iniciados!
echo ============================================
echo.
echo   Acesse:
echo   - No servidor: http://localhost:3000
echo   - Na rede:     http://%SERVER_IP%:3000
echo.
echo   Backend API:   http://%SERVER_IP%:3001
echo.
pause

