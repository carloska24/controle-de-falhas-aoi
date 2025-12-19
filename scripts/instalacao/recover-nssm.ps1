<# recover-nssm.ps1
Script seguro para recuperar o serviço aoi-backend via NSSM:
- Verifica privilégios de Admin
- Para o serviço (se existir)
- Mata processos node relacionados ao backend
- Remove o serviço via NSSM
- Reinstala usando install-nssm.ps1
- Inicia o serviço e exibe status/logs

Uso: executar em PowerShell (Admin):
  .\recover-nssm.ps1
#>

function Test-Admin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-Admin)) { Write-Error "Este script precisa ser executado como Administrador. Abra PowerShell como Administrador e execute novamente."; exit 1 }

$nssmPath = 'C:\nssm\win64\nssm.exe'
$serviceName = 'aoi-backend'
$workDir = 'C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend'

Write-Host "[1/6] Parando serviço (se existir)..."
try { Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 1 } catch { }

Write-Host "[2/6] Matando processos node relacionados ao backend..."
$nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'controle-de-falhas-aoi\\\\backend' }
if ($nodes) {
    $nodes | ForEach-Object { Write-Host "Killing PID $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
} else { Write-Host "Nenhum processo node relacionado encontrado." }

Write-Host "[3/6] Removendo serviço via NSSM (se existir)..."
if (Test-Path $nssmPath) {
    try {
        & $nssmPath remove $serviceName confirm
    } catch {
        Write-Warning "Remoção NSSM falhou ou serviço inexistente. Continuando..."
    }
} else {
    Write-Error "nssm não encontrado em $nssmPath. Ajuste o caminho e execute manualmente."; exit 1 }

Write-Host "[4/6] Reinstalando serviço via install-nssm.ps1..."
$installScript = Join-Path (Split-Path $workDir -Parent) 'install-nssm.ps1'
if (-not (Test-Path $installScript)) { Write-Error "install-nssm.ps1 não encontrado em $installScript"; exit 1 }

try {
    powershell -NoProfile -ExecutionPolicy Bypass -File $installScript install
} catch {
    Write-Error "Falha ao executar install-nssm.ps1: $_"; exit 1
}

Write-Host "[5/6] Aguardando 2 segundos e verificando status..."
Start-Sleep -Seconds 2
Get-Service -Name $serviceName | Format-List Name,Status

Write-Host "[6/6] Exibindo últimos logs (stdout/stderr) e porta 3001..."
$stdout = Join-Path $workDir 'nssm-stdout.log'
$stderr = Join-Path $workDir 'nssm-stderr.log'
if (Test-Path $stdout) { Get-Content $stdout -Tail 200 } else { Write-Host "stdout não encontrado: $stdout" }
if (Test-Path $stderr) { Get-Content $stderr -Tail 200 } else { Write-Host "stderr não encontrado: $stderr" }
netstat -ano | Select-String ':3001'

Write-Host "Concluído. Se ainda houver problema, cole aqui a saída do script."