# Proposta de UX/UI — conferência de entregas

Data: 23/11/2026. Proposta aprovada e implementada localmente após o ponto de retorno abaixo.
Ponto de retorno antes do redesenho: commit `3179c5d`, branch
`codex/corrigir-conferencia-smt`. O commit é local; não foi feito push nesta etapa.

## Direção

Preservar fundo azul-escuro, superfícies em camadas, bordas arredondadas,
acentos roxo/ciano, ícones existentes e verde na confirmação. Organizar a
conferência como uma operação de materiais, com PN e quantidades alinhados,
metadados compactos, cabeçalho e rodapé fixos e uma única área de rolagem.

O modal atual dedica bastante altura aos metadados, repete indicadores dentro
de cartões grandes e tem rolagem dentro de outra rolagem. A revisão abre outro
modal sobre o primeiro. O campo de quantidade edita o total acumulado, o que
exige somar mentalmente o que já foi entregue com a remessa atual.

## Tela 1 — conferir materiais

Exemplo fictício. Quantidades em unidades de componentes; PN identifica o material.
Os três indicadores superiores representam apenas o que já está gravado.

```text
+------------------------------------------------------------------------------------------+
| [icone] ENTREGA DE COMPONENTES                                           [Parcial]   [X] |
| Requisicao #124  |  OM 12345678  |  Solicitado por Ana  |  23/11/2026 09:40                  |
|                                                                                          |
|   (1) Conferir materiais ------------------------- (2) Revisar e confirmar                 |
+------------------------------------------------------------------------------------------+
|  +------------------------+ +------------------------+ +-------------------------------+  |
|  | REQUISITADO            | | JA ENTREGUE             | | SALDO ATUAL                   |  |
|  | 18 un. / 3 PNs         | | 6 un.                   | | 12 un.                        |  |
|  +------------------------+ +------------------------+ +-------------------------------+  |
|                                                                                          |
|  [ Materiais ]   [ Historico ]                                     [Corrigir registro]     |
|  [ Buscar PN ou descricao...                         ]  [ ] Somente pendentes             |
|                                                                                          |
|  MATERIAL                           PEDIDO  JA ENTREGUE   ENTREGAR AGORA   SALDO APOS      |
|  ---------------------------------  ------  -----------  ---------------  -------------   |
|  A153254-01                             10            4   [  3  ] un.              3       |
|  Resistor 10k / 0603                                     [Preencher saldo]                 |
|  [Ver detalhes]                                                            [Parcial]     |
|  --------------------------------------------------------------------------------------  |
|  A153255-02                              6            0   [  4  ] un.              2       |
|  Capacitor 100nF / 0805                                  [Preencher saldo]                 |
|  [Ver detalhes]                                                            [Parcial]     |
|  --------------------------------------------------------------------------------------  |
|  A153256-03                              2            2   [  0  ] un.              0       |
|  Microcontrolador                                                          [Concluido]   |
|                                                                                          |
|  Exibindo 3 de 3 PNs                      [Preencher saldo apenas dos itens exibidos]     |
+------------------------------------------------------------------------------------------+
|  NESTA ENTREGA: 7 un. / 2 PNs  |  Apos confirmar: faltarao 5 un.                          |
|  Edicao ainda nao gravada.                                                               |
|                          [Cancelar]   [Desfazer edicao]   [Revisar entrega ->]              |
+------------------------------------------------------------------------------------------+
```

As linhas são superfícies discretas no tema atual, com PN destacado, descrição
secundária e números alinhados. O exemplo mostra três itens por clareza; a área
de materiais deve permitir trabalhar com vários PNs sem expandir todos os detalhes.
Designadores e descrição completa ficam em expansão por item, quando disponíveis.
Busca por designador só deve ser oferecida quando esse dado existir na requisição.

Os status das linhas descrevem a projeção após confirmar; os valores gravados
continuam identificados por **Já entregue**. O rodapé considera a requisição toda,
mesmo ao filtrar a lista, e informa se há edições em itens ocultos pela busca.
Preenchimento em lote afeta somente itens exibidos, não confirma entregas e passa
pela mesma revisão. Um PN concluído não precisa de campo editável no modo normal.

## Tela 2 — revisar no mesmo modal

Trocar o conteúdo do modal, preservando o rascunho ao voltar. Não empilhar
um segundo modal sobre o formulário. A revisão inclui todos os PNs alterados,
inclusive os ocultos por busca, e informa quantos materiais permaneceram iguais.

```text
+------------------------------------------------------------------------------------------+
| [icone] REVISAR ENTREGA                                                             [X] |
| Requisicao #124  |  OM 12345678                                                           |
|                                                                                          |
|   (1) Materiais conferidos ----------------------- (2) Revisar e confirmar                |
+------------------------------------------------------------------------------------------+
|                                                                                          |
|  Voce esta registrando 7 unidades em 2 materiais.                                         |
|  Confira se as quantidades correspondem aos componentes entregues fisicamente.             |
|                                                                                          |
|  MATERIAL              JA ENTREGUE   + AGORA   = TOTAL ENTREGUE     AINDA FALTA             |
|  --------------------  -----------  ---------  ------------------  ----------------------  |
|  A153254-01                      4          3              7 / 10                       3 |
|  A153255-02                      0          4               4 / 6                       2 |
|                                                                                          |
|  1 material sem alteracao permanece com a quantidade ja registrada.                        |
|                                                                                          |
|  +------------------------------------------------------------------------------------+  |
|  | APOS CONFIRMAR                                                                      |  |
|  | 13 de 18 unidades entregues  |  5 unidades pendentes  |  [Parcialmente entregue]       |  |
|  +------------------------------------------------------------------------------------+  |
|                                                                                          |
|  Responsavel: usuario autenticado. Data e hora serao registradas na confirmacao.            |
+------------------------------------------------------------------------------------------+
|  [<- Voltar e editar]                                     [Confirmar entrega de 7 un.]    |
+------------------------------------------------------------------------------------------+
```

O botão final fica verde e bloqueia novo envio durante o processamento. Não
exibir sucesso até a confirmação do servidor. Em conflito ou resultado incerto,
manter o aviso persistente e a ação de atualização já validada, sem reenvio cego.

## Entrada de quantidade: proposta de interação

**Entregar agora** começa em zero e aceita somente unidades inteiras, entre
zero e o saldo atual. Exemplo: já entregues 4 + entregar agora 3 = total 7.
**Saldo após** mostra o saldo restante projetado, nunca disponibilidade de estoque.

Esta mudança vai além de aparência: a interface passaria a converter a quantidade
da remessa em total acumulado antes de usar o contrato atual da API. A versão
da requisição e o bloqueio de concorrência precisam ser preservados. Caso a equipe
prefira continuar editando totais, manter o rótulo **Total entregue ao confirmar**;
não mudar apenas o rótulo do campo existente para **Entregar agora**.

Reduções de valores já gravados ficam na ação explícita **Corrigir registro**,
com valor anterior, novo total e motivo obrigatório. Correção não deve ser
apresentada como remessa com quantidade negativa. O motivo fica no histórico.

## Telas menores

Empilhar as colunas de cada material em cartões compactos. O modal ocupa a área
útil da tela; cabeçalho e rodapé permanecem acessíveis. Não reduzir fonte até
caber a tabela. Preservar o mesmo rascunho ao alternar entre Materiais e Histórico.

```text
+------------------------------------------+
| ENTREGAR COMPONENTES                 [X] |
| #124  |  OM 12345678          [Parcial]   |
+------------------------------------------+
| [Materiais]  [Historico]                 |
| [Buscar PN ou descricao...           ]  |
|                                        |
| +------------------------------------+ |
| | A153254-01              [Parcial]   | |
| | Resistor 10k / 0603                 | |
| | Pedido: 10   |   Ja entregue: 4     | |
| |                                    | |
| | Entregar agora   [ 3 ] un.          | |
| | Apos confirmar: 7/10 | Faltarao: 3  | |
| | [Preencher saldo] [Ver detalhes]    | |
| +------------------------------------+ |
|                                        |
| ... demais materiais ...               |
+------------------------------------------+
| Nesta entrega: 7 un. / 2 PNs            |
| [Cancelar]       [Revisar entrega ->]   |
+------------------------------------------+
```

## Histórico e estados

- Histórico como uma aba com eventos do mais recente ao mais antigo, responsável,
  data/hora, PN e quantidade anterior → nova quantidade. Motivo em destaque nas
  correções. A origem dos dados continua sendo os eventos realmente persistidos.
- Erro na quantidade junto do campo; permitir apagar e redigitar sem transformar
  silenciosamente decimais ou valores acima do limite em outro número.
- Busca sem resultado oferece **Limpar busca**, preservando o rascunho.
- Cabeçalho, rodapé e foco continuam visíveis ao usar teclado; conter Tab no modal
  e devolver o foco ao controle de origem ao fechar. Escape volta da revisão;
  ao abandonar uma edição, pedir confirmação. Envio em andamento fica protegido.
- Um único botão principal por etapa; estado confirmado identificado por texto
  e ícone além da cor. Não acrescentar animações decorativas.
- Localização, disponibilidade em estoque, lote/rolo e confirmação de recebimento
  exigem dados e fluxos próprios; não exibir valores inventados nesta proposta.

## Referências e limites

A proposta adapta princípios das fontes, não reproduz uma tela de outro produto:

- [SAP — Quantity Calculation](https://help.sap.com/docs/SAP_ERP/00a552d4cb404d128ae92669b115e3a5/11cfb65334e6b54ce10000000a174cb4.html):
  distinguir necessidade, quantidade já retirada, entrega e saldo em aberto.
  Aqui não há reserva ou entrega em trânsito modelada; o saldo usa somente
  requisitado menos total entregue confirmado ou projetado, conforme o rótulo.
- [Odoo — Batch picking](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/advanced_operations_warehouse/batch_transfer.html):
  conferir quantidades e validar execução parcial. O AOI preserva o saldo na
  própria requisição, sem criar ordens adicionais automaticamente.
- [Carbon — Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines):
  organizar busca, detalhes progressivos, dados alinhados e ações contextuais.
- [W3C — Dialog modal pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):
  foco no modal, navegação por teclado e retorno do foco ao fechar.

## Implementação e validação

O modal foi extraído para `frontend/components/warehouse/DeliveryDialog.tsx`, com
modelo de edição em `frontend/lib/deliveryDraft.ts`. A página do Almoxarifado
continua responsável pela fila confirmada; somente o modal administra o rascunho.
O contrato do backend continua recebendo totais acumulados e a versão original.
Não foi adicionada dependência nem alterado o componente de diálogo das outras telas.

Foi usado um diálogo HTML nativo, com fundo inerte, ciclo de Tab/Shift+Tab,
foco inicial no título e retorno de foco ao botão de origem. A revisão substitui
o conteúdo dentro do mesmo modal. Cabeçalho e rodapé ficam fora da única área
de rolagem vertical. Histórico e Materiais preservam a edição ao alternar seções.

Validação em base descartável: entrega parcial, complemento de remessa com soma
correta, correção justificada, bloqueio de decimal sem arredondamento, manutenção
de itens editados ocultos pela busca, preenchimento somente dos itens exibidos,
conflito e recuperação sem duplicar eventos. Na primeira requisição, o banco
terminou em versão 4, quatro eventos e duas unidades entregues após uma correção
em outro terminal. Na segunda, com oito PNs, a entrega pelo novo modal elevou
o total de quatro para sete unidades, com versão 2 e dois eventos.

O perfil operador foi verificado na interface: somente consulta, sem campos de
quantidade, ação de correção ou botão de confirmação. O perfil almoxarifado
executou as gravações. O motivo de redução recebeu foco e erro junto do campo.
A revisão manteve apenas um diálogo aberto. Escape voltou para a edição, Tab
voltou do último controle ao primeiro e o fechamento devolveu foco a **Ver Itens**.

O frontend passou em 86 testes, incluindo 14 cenários do modelo de entregas,
e na compilação de produção com TypeScript. Os layouts foram verificados em
1366×900 e 390×844; a revisão compacta não apresentou rolagem horizontal e o
rodapé permaneceu visível. Capturas na pasta de visualizações da sessão:
`aoi-modal-entregas-desktop-2026-11-23.png`,
`aoi-modal-entregas-revisao-2026-11-23.png` e
`aoi-modal-entregas-mobile-2026-11-23.png`.

O aceite com o almoxarife, a conferência física dos materiais e a validação em
duas máquinas da intranet continuam como passos do piloto operacional. Os dados
e as contas usados neste ensaio pertencem exclusivamente à base descartável.

## Revisão visual após avaliação do usuário

A primeira implementação foi rejeitada por perder as barras de status coloridas
e a hierarquia visual da versão anterior. A apresentação foi revista com apoio
de um segundo agente focado em UX e arquitetura, mantendo o modelo de edição,
as validações e o contrato de gravação existentes.

A direção adotada é uma interface industrial com superfícies em camadas no tema
azul-escuro original. O cabeçalho destaca a OM e o andamento confirmado. No
desktop, materiais e resumo da remessa ocupam duas colunas; cada material tem
PN em cápsula roxa, descrição legível, saldo, barra colorida e bloco de quantidade
com botões de aumentar/diminuir. O resumo lateral reúne a remessa e sua projeção.

As barras âmbar/verde são medidores de quantidades já confirmadas, não indicadores
de carregamento. As previsões ficam roxas, explicitamente rotuladas **Após confirmar**
e **Previsto**. Digitar uma quantidade não avança a barra confirmada. Acessibilidade
inclui valor textual, nome do PN em cada medidor, foco visível e tratamento de
quantidade requisitada zero. Os botões de quantidade ficam bloqueados nos limites
e enquanto houver entrada inválida. Nenhuma quantidade é arredondada silenciosamente.

Referências consultadas para esta revisão:

- [SAP Fiori — indicador de estado e significado das cores](https://www.sap.com/design-system/fiori-design-web/v1-145/ui-elements/progress-indicator-web-component).
- [Atlassian — hierarquia tipográfica](https://atlassian.design/foundations/typography/applying-typography/).
- [Carbon — rótulo, valor e trilha dos indicadores](https://www.carbondesignsystem.com/building-blocks/core/components/progress-bar/guidelines).
  As orientações de formato foram adaptadas; a semântica de estado quantitativo
  segue a referência de medidores da SAP, não a de progresso de carregamento.

A revisão de código verificou a separação entre confirmado e previsto, contagem
de materiais completos por PN e limites dos controles. O cartão de consulta
identifica o usuário como leitor, sem atribuir-lhe a autoria das entregas.
O frontend continua com 86 testes aprovados e build/TypeScript aprovados.

No navegador, o atendimento permaneceu em quatro de 24 unidades durante a edição,
com projeção de sete de 24. Após confirmar três unidades, o atendimento passou
a sete de 24. Os botões respeitaram o saldo e ficaram bloqueados para uma entrada
decimal. Foram verificadas larguras de 375, 768, 1024 e 1440 pixels, com rodapé
visível. A inspeção visual identificou e levou à correção do encaixe do campo em
telas estreitas. O cabeçalho compacto mediu 216 pixels na tela de 390×844.

As capturas desta revisão usam o prefixo `aoi-modal-entregas-v2-` na pasta de
visualizações da sessão. A base descartável e suas contas são encerradas após
os testes; a prévia normal usa o PostgreSQL local existente.
