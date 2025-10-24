# Script PowerShell para organizar a pasta backend
# Execute a partir da pasta backend

# 1. Criar subpastas
$folders = @('logs','bin','queries','logs/old')
foreach ($f in $folders) { if (-not (Test-Path $f)) { New-Item -ItemType Directory -Path $f | Out-Null } }

# 2. Mover arquivos de log
$logs = @('log_backend.txt','err.log','server.err.log','server.out.log','nssm-stderr.log','nssm-stdout.log')
foreach ($l in $logs) { if (Test-Path $l) { Move-Item $l logs/ } }

# 3. Mover logs antigos e backups
Get-ChildItem -Path . -Filter 'server.out.log.*.bak' | Move-Item -Destination logs/old/

# 4. Mover scripts utilitários
$bin = @('simulate_items.js','reset-admin-prod.js','dev_start_and_export.ps1','setup-backend.ps1','start-backend.bat','login.json','health.json')
foreach ($b in $bin) { if (Test-Path $b) { Move-Item $b bin/ } }

# 5. Mover scripts de consulta/manipulação
$queries = @('get_requisicoes.js','query_registros.js','query_requisicao.js','query_requisicao_raw.js','listar_oms.js','listar_status_oms.js','listar_tabelas.js','listar_tudo_oms_finalizadas.js','listar_tudo_oms_sessions.js','listar_tudo_registros.js','remover_om.js','remover_om_finalizada.js','remover_todas_oms_finalizadas.js')
foreach ($q in $queries) { if (Test-Path $q) { Move-Item $q queries/ } }

Write-Host 'Organização concluída! Revise as subpastas logs, bin e queries.' -ForegroundColor Green
