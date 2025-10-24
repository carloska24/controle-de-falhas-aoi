# Como Excluir OMs Finalizadas do Banco de Dados (SQLite)

Este guia ensina como remover OMs finalizadas do sistema, seja todas de uma vez ou apenas uma específica, utilizando scripts Node.js já prontos na pasta `backend`.

## 1. Remover Todas as OMs Finalizadas

Use o script `remover_todas_oms_finalizadas.js` para excluir todos os registros da tabela `oms_finalizadas`:

```powershell
node backend/remover_todas_oms_finalizadas.js
```

- Isso irá apagar todas as OMs finalizadas do banco de dados.
- O terminal mostrará quantas linhas foram afetadas.

## 2. Remover Uma OM Finalizada Específica

Use o script `remover_om_finalizada.js` informando o número da OM que deseja remover:

```powershell
node backend/remover_om_finalizada.js NUMERO_DA_OM
```

- Substitua `NUMERO_DA_OM` pelo número da OM que deseja excluir.
- Exemplo:
  ```powershell
  node backend/remover_om_finalizada.js 12345
  ```
- O terminal mostrará quantas linhas foram afetadas.

## Observações

- Os scripts atuam apenas sobre a tabela `oms_finalizadas`.
- Para remover OMs de outras tabelas, solicite scripts específicos.
- Sempre faça backup do banco antes de operações em massa, se necessário.

---

Se precisar de mais comandos ou scripts para outras tabelas, entre em contato com o responsável pelo sistema.
