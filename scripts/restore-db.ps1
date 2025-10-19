<#
Restores the database files from aoi-db-backup.zip into backend/.
Usage: Run this from the project root in PowerShell:
    .\scripts\restore-db.ps1 -ZipPath C:\path\to\aoi-db-backup.zip
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$ZipPath = "aoi-db-backup.zip"
)

Write-Host "Restore DB script starting..." -ForegroundColor Cyan
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $projectRoot

if (-Not (Test-Path $ZipPath)) {
    Write-Error "ZIP file not found: $ZipPath"
    exit 1
}

# Ensure backend folder exists
if (-Not (Test-Path '.\backend')) { New-Item -ItemType Directory -Path '.\backend' | Out-Null }

# Ensure server is stopped
$nodePids = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object -ExpandProperty ProcessId -ErrorAction SilentlyContinue
if ($nodePids) {
    Write-Warning "Processos Node.js detectados (PID: $($nodePids -join ', ')). Pare o servidor antes de restaurar e execute este script novamente."
    exit 2
}

# Extract only db files from the zip to a temp folder
$tempDir = Join-Path $env:TEMP ("aoi-db-restore-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force
} catch {
    Write-Error "Falha ao extrair o ZIP: $_"
    Remove-Item -Recurse -Force $tempDir
    exit 3
}

# Find DB files
$dbFiles = Get-ChildItem -Path $tempDir -Filter 'aoi.db*' -File -Recurse
if ($dbFiles.Count -eq 0) {
    Write-Error "Nenhum arquivo aoi.db encontrado no ZIP."
    Remove-Item -Recurse -Force $tempDir
    exit 4
}

# Move files to backend (overwrite)
foreach ($f in $dbFiles) {
    $target = Join-Path (Resolve-Path .\backend) $f.Name
    Copy-Item -Path $f.FullName -Destination $target -Force
    Write-Host "Restaurado: $($f.Name) -> $target"
}

Remove-Item -Recurse -Force $tempDir
Write-Host "Restauração concluída. Inicie o servidor com: cd backend; npm run dev" -ForegroundColor Green
exit 0
