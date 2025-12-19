@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo    INICIANDO TODOS OS SERVIDORES
echo ========================================
echo.
echo Este projeto precisa de DOIS servidores:
echo.
echo 1. BACKEND Express (porta 3001)
echo 2. FRONTEND Next.js (porta 3000)
echo.
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando se backend esta rodando...
curl -s http://localhost:3001 >nul 2>&1
if errorlevel 1 (
    echo    Backend nao esta rodando. Iniciando...
    start "Backend Express (3001)" cmd /k "cd /d %CD%\backend && node server.js"
    timeout /t 3 /nobreak >nul
) else (
    echo    Backend ja esta rodando
)
echo.

echo [2/3] Iniciando Frontend Next.js (porta 3000)...
cd nextjs-frontend
if exist .next rmdir /s /q .next
start "Frontend Next.js (3000)" cmd /k "cd /d %CD%\nextjs-frontend && npm run dev"
echo    Servidor iniciando em nova janela...
echo.

echo [3/3] Aguardando servidores iniciarem...
timeout /t 30 /nobreak >nul
echo.

echo ========================================
echo    SERVIDORES INICIADOS!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000/index
echo.
echo Abrindo navegador...
start http://localhost:3000/index
echo.
echo IMPORTANTE:
echo - Backend deve estar em: http://localhost:3001
echo - Frontend deve estar em: http://localhost:3000
echo - Se houver erro, verifique as janelas dos servidores
echo.
pause

