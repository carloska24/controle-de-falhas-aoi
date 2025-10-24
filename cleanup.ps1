# cleanup.ps1 - script para parar processos node/nodemon do projeto e limpar logs
# Uso: executar no PowerShell na raiz do repositório

Write-Host "== Procura processos node/nodemon relacionados ao projeto =="
$cwd = (Get-Location).Path
$procs = Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -and ($_.CommandLine -match 'nodemon' -or $_.CommandLine -match 'node' -and $_.CommandLine -match [regex]::Escape($cwd))) }
if (-not $procs) {
    Write-Host "Nenhum processo node/nodemon relacionado ao diretório encontrado. Saindo."; exit 0
}

$procs | ForEach-Object { Write-Host "PID: $($_.ProcessId) - $($_.CommandLine)" }

$confirm = Read-Host "Deseja parar esses processos? (s/n)"
if ($confirm -ne 's' -and $confirm -ne 'S') { Write-Host 'Abortando. Nenhuma ação tomada.'; exit 0 }

$procs | ForEach-Object {
    try {
        Write-Host "Parando PID $($_.ProcessId)..."
        Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
        Write-Host "PID $($_.ProcessId) parado"
    } catch {
        Write-Host "Falha ao parar PID $($_.ProcessId): $_"
    }
}

# Limpar logs (movendo para backup)
$logs = @("backend\\server.out.log", "backend\\server.err.log", "backend\\log_backend.txt")
foreach ($f in $logs) {
    if (Test-Path $f) {
        $bk = "$f." + (Get-Date -Format "yyyyMMdd-HHmmss") + ".bak"
        Write-Host "Movendo $f -> $bk"
        Move-Item -Path $f -Destination $bk -Force
        # criar um arquivo vazio no lugar
        New-Item -Path $f -ItemType File -Force | Out-Null
    } else {
        Write-Host "$f não existe"
    }
}

Write-Host "Limpeza concluída. Se quiser reinstalar dependências: cd backend; npm install"