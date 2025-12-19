@echo off
chcp 65001 >nul
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo    🚀 INICIANDO BACKEND E FRONTEND
echo ═══════════════════════════════════════════════════════════
echo.
cd /d "%~dp0"

echo [1/2] 🔧 Iniciando BACKEND (Express - porta 3001)...
cd backend
start "Backend Express (3001)" cmd /k "cd /d %CD% && node server.js"
cd ..
echo    ✅ Backend iniciado em nova janela
echo.

echo [2/2] 🎨 Iniciando FRONTEND (Next.js - porta 3000)...
cd nextjs-frontend
if exist .next rmdir /s /q .next
start "Frontend Next.js (3000)" cmd /k "cd /d %CD% && npm run dev"
cd ..
echo    ✅ Frontend iniciado em nova janela
echo.

echo ═══════════════════════════════════════════════════════════
echo    ⏳ AGUARDANDO SERVIDORES...
echo ═══════════════════════════════════════════════════════════
echo.
echo ⏳ Aguarde 30 segundos para compilação...
timeout /t 30 /nobreak >nul
echo.

echo ═══════════════════════════════════════════════════════════
echo    ✅ SERVIDORES PRONTOS!
echo ═══════════════════════════════════════════════════════════
echo.
echo 🔧 Backend:  http://localhost:3001
echo 🎨 Frontend: http://localhost:3000/index
echo.
echo 🌐 Abrindo navegador...
start http://localhost:3000/index
echo.
echo ✅ Duas janelas foram abertas:
echo    1. 🔧 Backend Express (3001)
echo    2. 🎨 Frontend Next.js (3000)
echo.
echo 💡 Se houver erro, verifique ambas as janelas
echo.
pause
