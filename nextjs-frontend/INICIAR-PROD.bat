@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Sistema Controle de Falhas AOI
echo   Modo PRODUCAO - IP: 192.168.0.67
echo ============================================
echo.

set IP=192.168.0.67

echo Configurando...
echo NEXT_PUBLIC_API_URL=http://%IP%:3001 > "nextjs-frontend\.env.local"
echo OK: Arquivo .env.local configurado
echo.

echo Verificando Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)
echo OK: Node.js encontrado
echo.

echo Verificando build...
if not exist "nextjs-frontend\.next" (
    echo Compilando Next.js (pode levar alguns minutos)...
    cd nextjs-frontend
    call npm run build
    if errorlevel 1 (
        echo ERRO na compilacao!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo OK: Build concluido
) else (
    echo OK: Build encontrado
)
echo.

echo Iniciando servidores...
echo.

echo Iniciando Backend (porta 3001)...
start "Backend" cmd /k "cd /d %CD%\backend & node server.js"

timeout /t 3 /nobreak >nul

echo Iniciando Frontend (porta 3000)...
start "Frontend" cmd /k "cd /d %CD%\nextjs-frontend & npm start"

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   Servidores iniciados!
echo ============================================
echo.
echo   Acesse: http://%IP%:3000
echo   Backend: http://%IP%:3001
echo.
pause

