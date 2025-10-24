# Organização dos Scripts de Backend

## Scripts Essenciais (manter na raiz de scripts/)

- create-admin-prod.js
- create-admin-sqlite.js
- export_sqlite.js
- cleanup_requisicoes.js
- cleanup_oms.js

## Scripts de Limpeza de OMs (pouco usados ou redundantes)

Mover para `scripts/extra/`:

- cleanup_oms_mem_especificas.js
- cleanup_oms_mem_finalizadas.js
- cleanup_oms_mem_iniciadas.js
- cleanup_oms_mem_todas.js
- deletar_oms_mem_especificas.js
- cleanup_oms_por_status.js
- cleanup_oms_selecionadas.js
- cleanup_oms_todas.js

## Scripts Antigos/Legacy (pouco úteis ou obsoletos)

Mover para `scripts/legacy/` se não forem mais usados:

- cleanup_oms_finalizadas.js
- listar_status_oms.js
- listar_todas_oms_completas.js
- listar_todas_oms_mem.js

## Observação

Scripts de setup, restore e automação do Windows ficam em `../scripts/` fora do backend.
