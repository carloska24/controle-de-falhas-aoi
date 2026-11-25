@echo off
setlocal
title Controle de Falhas AOI - Producao
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js nao encontrado. Instale o Node.js 22.12+ ou 24+ e tente novamente.
    pause
    exit /b 1
)
node "%~dp0scripts\start-production.cjs" %*
if errorlevel 1 (
    echo.
    echo A inicializacao nao foi concluida. Confira a mensagem acima.
    pause
    exit /b 1
)
echo.
echo Pode fechar esta janela. Os servidores continuam em segundo plano.
timeout /t 5 >nul 2>nul
exit /b 0
