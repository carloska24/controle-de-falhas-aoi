@echo off
chcp 65001 >nul
title Compilar e Iniciar - Produção Intranet
color 0E

REM Mudar para o diretório raiz do projeto
cd /d "%~dp0..\.."

echo ============================================
echo   Compilando Next.js para PRODUÇÃO
echo   IP: 192.168.0.67
echo ============================================
echo.

set SERVER_IP=192.168.0.67

REM Garantir que .env.local está configurado
if not exist "nextjs-frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://%SERVER_IP%:3001 > "nextjs-frontend\.env.local"
    echo Arquivo .env.local criado
)

echo [1/3] Compilando Next.js...
cd nextjs-frontend
call npm run build
if errorlevel 1 (
    echo ERRO: Falha na compilação!
    cd ..
    pause
    exit /b 1
)
cd ..
echo    ✓ Compilação concluída!
echo.

echo [2/3] Iniciando Backend...
start "Backend - Produção" cmd /k "cd /d %CD%\backend & node server.js"
timeout /t 3 /nobreak >nul
echo    ✓ Backend iniciado
echo.

echo [3/3] Iniciando Frontend em modo PRODUÇÃO...
start "Frontend - Produção" cmd /k "cd /d %CD%\nextjs-frontend & npm start"
echo    ✓ Frontend iniciado
echo.

echo ============================================
echo   ✓ Sistema compilado e iniciado!
echo ============================================
echo.
echo   Acesse: http://%SERVER_IP%:3000
echo.
pause

