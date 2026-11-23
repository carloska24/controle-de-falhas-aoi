# Quantidade de componentes por designador — 23/11/2026

Branch: `codex/corrigir-quantidade-designadores`. Base: `56aae19`.

## Causa e comportamento corrigido

A tabela mostrava os designadores separados, mas a prévia e o servidor somavam uma unidade por lançamento. Um lançamento com `R1,R2,R3`, de um mesmo PN, portanto gerava somente uma unidade.

Agora a prévia, o total do botão e a requisição persistida somam os designadores distintos de cada lançamento. O servidor calcula a quantidade a partir dos registros do banco; não aceita uma quantidade fornecida pelo cliente.

| Entrada no lançamento | Unidades para requisitar |
| --- | ---: |
| `R1,R2,R3` | 3 |
| `R1; R2 R3` | 3 |
| `r1,R1,R2` | 2 |
| `R01,R1` | 2 |
| `R1-R3` ou `R1/R2` | Bloqueada: informar a lista explícita |

A criação e a edição gravam a lista em maiúsculas, sem repetições, separada por vírgulas. Registros antigos sem designador (nulo/ausente) conservam a demanda original de uma unidade. Uma lista explicitamente vazia ou inválida é bloqueada.

## Proteções relacionadas

- Registros já vinculados a uma requisição deixam de compor a prévia; a proteção contra reenvio também continua no servidor.
- Registros cancelados ou descartados não geram uma nova demanda.
- Após requisitar, alterações de OM, serial, PN, designadores ou defeito são bloqueadas. Uma lista equivalente em outra ordem continua permitida. Observações continuam editáveis.
- A requisição e a edição bloqueiam as mesmas linhas, na mesma ordem. Conflitos de serialização do adaptador PostgreSQL são repetidos até três tentativas; se persistirem, retornam 409.
- Entregas parciais e totais usam a quantidade persistida corrigida.
- Uma placa com três componentes defeituosos continua representando **uma placa inspecionada**.

## Validação executada

- Backend: 13 suítes, 208 testes aprovados.
- Frontend: 91 testes aprovados e build de produção aprovada, incluindo TypeScript.
- PostgreSQL 17 descartável, em porta e diretório próprios: criação por HTTP, três unidades, uma placa, reenvio sem duplicação, edição protegida, entrega de duas unidades seguida de conclusão com três, histórico de entregas e cinco pares concorrentes de edição/requisição.
- Nenhum lançamento da fábrica foi criado, editado, excluído ou requisitado pelo teste. A sessão disponível no navegador estava na tela de login; não houve conferência visual autenticada desta etapa.

## Limites encontrados e próximos pontos

1. A unicidade é por lançamento. Dois lançamentos diferentes para o mesmo componente físico (mesma OM + serial + PN + designador) ainda podem gerar demanda duplicada. Resolver isso exige identificar/vincular os componentes individualmente e preservar o histórico de entregas; esta alteração não migra esse modelo.
2. Os indicadores de falhas ainda contam lançamentos. Um lançamento agrupado com três designadores continua sendo uma ocorrência nesses indicadores. A auditoria de qualidade deve distinguir ocorrências, componentes defeituosos e placas defeituosas antes de alterar suas fórmulas.
3. Reparar/cancelar um lançamento agrupado ainda atua no grupo inteiro. O reparo individual por designador depende da modelagem do item anterior.
4. Um lançamento agrupado pressupõe o mesmo PN e defeito para todos os designadores. PNs ou defeitos diferentes precisam de lançamentos separados.
5. Requisições antigas conservam suas quantidades e seu histórico. Não há recálculo automático de requisições já emitidas ou entregues.

## Empacotamento

O parser comum fica em `shared/designators.js`, com declaração TypeScript no mesmo diretório. Backend e frontend precisam do diretório `shared` irmão das duas aplicações. O Turbopack usa a raiz do repositório. Em hospedagem com raiz limitada a `frontend`, incluir os arquivos externos à raiz no build; em pacotes isolados do backend, copiar também `shared` preservando essa estrutura.

Para repetir o teste isolado no Windows:

```powershell
cd backend
$env:AOI_POSTGRES_BIN='C:\Workspace\controle-de-falhas-aoi\.tools\pgsql17\pgsql\bin'
npm run test:materials:postgres
```
