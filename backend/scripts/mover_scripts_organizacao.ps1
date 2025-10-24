# Script PowerShell para organizar scripts de backend
# Execute a partir da pasta backend/scripts/

$extra = @(
  'cleanup_oms_mem_especificas.js',
  'cleanup_oms_mem_finalizadas.js',
  'cleanup_oms_mem_iniciadas.js',
  'cleanup_oms_mem_todas.js',
  'deletar_oms_mem_especificas.js',
  'cleanup_oms_por_status.js',
  'cleanup_oms_selecionadas.js',
  'cleanup_oms_todas.js'
)

$legacy = @(
  'cleanup_oms_finalizadas.js',
  'listar_status_oms.js',
  'listar_todas_oms_completas.js',
  'listar_todas_oms_mem.js'
)

foreach ($f in $extra) {
  if (Test-Path $f) { Move-Item $f .\extra\ }
}
foreach ($f in $legacy) {
  if (Test-Path $f) { Move-Item $f .\legacy\ }
}

Write-Host 'Scripts organizados conforme README_ORGANIZACAO.md.' -ForegroundColor Green
