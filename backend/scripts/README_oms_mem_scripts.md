# Scripts para Limpeza de OMs Persistidas (oms_finalizadas)

Estes scripts permitem listar e remover OMs da tabela `oms_finalizadas`, que armazena OMs finalizadas (e eventualmente pausadas ou iniciadas, se implementado) em memória no backend.

## Pré-requisitos

- Node.js instalado
- Estar no diretório raiz do projeto (onde está a pasta `backend`)

## Remover OMs Específicas

Edite o array `omsParaRemover` no script `cleanup_oms_mem_especificas.js` e adicione os números das OMs que deseja remover:

```js
const omsParaRemover = ["00001", "00002"];
```

Depois execute:

```sh
node backend/scripts/cleanup_oms_mem_especificas.js
```

## Remover Todas as OMs Finalizadas

```sh
node backend/scripts/cleanup_oms_mem_finalizadas.js
```

## Remover Todas as OMs Iniciadas

> Observação: Atualmente a tabela `oms_finalizadas` só armazena OMs finalizadas, mas o script já está pronto para o futuro.

```sh
node backend/scripts/cleanup_oms_mem_iniciadas.js
```

## Remover Todas as OMs (qualquer status)

```sh
node backend/scripts/cleanup_oms_mem_todas.js
```

## Observações

- Sempre faça backup do banco antes de executar scripts de remoção em massa.
- Os scripts devem ser executados a partir do diretório raiz do projeto.
- O banco de dados padrão é `backend/aoi.db`. Se estiver usando outro caminho, ajuste os scripts.
