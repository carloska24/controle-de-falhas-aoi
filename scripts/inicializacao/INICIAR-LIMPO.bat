@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo    LIMPANDO E INICIANDO SERVIDORES
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Parando processos Node.js antigos...
taskkill /IM node.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul
echo    Processos parados
echo.

echo [2/4] Verificando portas...
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo    Porta 3000 ainda em uso, forçando liberação...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1
)
netstat -ano | findstr :3001 >nul
if %errorlevel% == 0 (
    echo    Porta 3001 ainda em uso, forçando liberação...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo    Portas liberadas
echo.

echo [3/4] Iniciando BACKEND (porta 3001)...
cd backend
start "Backend Express (3001)" cmd /k "cd /d %CD% && echo [BACKEND] Iniciando servidor Express na porta 3001... && echo. && node server.js"
cd ..
timeout /t 3 /nobreak >nul
echo    Backend iniciado
echo.

echo [4/4] Iniciando FRONTEND (porta 3000)...
cd nextjs-frontend
if exist .next rmdir /s /q .next
start "Frontend Next.js (3000)" cmd /k "cd /d %CD% && echo [FRONTEND] Iniciando servidor Next.js na porta 3000... && echo. && npm run dev"
cd ..
echo    Frontend iniciado
echo.

echo ========================================
echo    AGUARDANDO SERVIDORES...
echo ========================================
echo.
echo Aguarde 30 segundos para compilação...
echo.
timeout /t 30 /nobreak

echo.
echo ========================================
echo    TESTANDO SERVIDORES
echo ========================================
echo.

curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Backend respondendo na porta 3001
) else (
    echo [ERRO] Backend não está respondendo
)

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Frontend respondendo na porta 3000
    echo.
    echo Abrindo navegador...
    start http://localhost:3000/index
    echo.
    echo ========================================
    echo    SERVIDORES PRONTOS!
    echo ========================================
    echo.
    echo Backend:  http://localhost:3001
    echo Frontend: http://localhost:3000/index
    echo.
) else (
    echo [ERRO] Frontend ainda não está respondendo
    echo.
    echo Aguarde mais alguns segundos e tente:
    echo http://localhost:3000/index
    echo.
)

pause

