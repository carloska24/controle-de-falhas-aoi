# Correção do fluxo de requisição de materiais

## Causa confirmada

Na primeira página dos dados fictícios, selecionar todos marcava 12 registros:
11 com defeito **Ausente** e PN preenchido, e 1 com **Possível Incorreto**.
O backend recusava a seleção inteira, pois Possível Incorreto depende da
conferência SMT. A tela apresentava uma mensagem genérica e limpava a seleção
mesmo quando o envio falhava. Também anunciava requisições novas em tentativas
que apenas reencontravam vínculos existentes.

## Comportamento corrigido

- Revisar antes de enviar: selecionados, aptos e excluídos com seus motivos.
- Mostrar quantidade agrupada por OM e PN; remover espaços nas extremidades do PN
  de maneira consistente na prévia e na criação dos itens.
- Enviar somente os aptos após confirmação explícita. Ausente, Danificado e
  Incorreto exigem PN. Possível Incorreto permanece aguardando SMT.
- Manter os registros excluídos selecionados após sucesso; preservar a seleção
  completa e o diálogo após falha, com erro junto à ação e opção de tentar novamente.
- Revalidar a seleção inteira no servidor antes de escrever. Nenhum descarte
  parcial silencioso; uma alteração concorrente pode bloquear o envio.
- Diferenciar registros novos e já vinculados; repetição não duplica materiais.
- Selecionar todos atua na página atual e mantém as seleções das outras páginas.
- Impedir que atalhos globais da OM interceptem teclado em linhas, botões e diálogo.
- Usar diálogo nativo com título, descrição, foco inicial em voltar, Escape e
  restauração de foco. Bloquear nova submissão durante o processamento.

## Validação

- Backend: 84 testes unitários em 5 suítes.
- Frontend: 20 testes de API e regras de seleção.
- TypeScript e build de produção concluídos.
- Integração em banco temporário isolado: seleção mista recusada sem escrita;
  11 elegíveis geram quantidade 11; repetição mantém quantidades e vínculos.
- Navegador local: 12 selecionados → 11 aptos e 1 SMT; alteração concorrente de PN
  gera erro identificando R249 e mantém os 12 selecionados. PN restaurado após teste.
- Envio real no ambiente fictício: 10 registros criam a requisição #2; 1 já estava
  vinculado à #1. A #1, parcialmente entregue anteriormente, foi preservada.
  Conferido PN-TESTE com quantidade 10 no almoxarifado. Nova tentativa informa
  zero requisições novas e 11 registros já vinculados.
- Novo diálogo conferido em desktop e largura de 390 px; cancelar por Escape
  preserva seleção e devolve foco ao botão de revisão.

## Escopo e limites

A auditoria geral de UX/UI continua em `AUDITORIA_UX_UI_2026-11-17.md`.
Esta correção trata o fluxo de requisição e não conclui a revisão visual de
todas as telas. A prévia usa dados fictícios em banco temporário; não comprova
prontidão de produção. A tela ainda permite selecionar novamente registros já
vinculados: o servidor reaproveita seus vínculos e informa o resultado sem duplicar.
Cada envio aceita até 200 registros. Uma ocorrência selecionada representa uma
unidade requisitada, conforme a regra existente; designadores múltiplos em um
registro não multiplicam a quantidade automaticamente.
