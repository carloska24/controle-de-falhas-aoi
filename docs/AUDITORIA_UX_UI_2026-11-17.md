# Auditoria de UX/UI — Controle de Falhas AOI

Data: 17/11/2026. Código: `e69a709`, branch `codex/preparacao-intranet`.

> Diretriz aprovada em 18/11/2026: executar as correções funcionais por etapas,
> preservando o visual atual. As propostas estéticas deste relatório ficam adiadas.
> Acompanhar execução e verificações em [Andamento da auditoria funcional](ANDAMENTO_AUDITORIA_FUNCIONAL.md).

**Parecer:** a interface tem fluxos reconhecíveis e boa separação por setor, mas ainda há riscos de interpretação, ações acidentais e barreiras de acessibilidade. A prioridade é tornar os resultados e as ações confiáveis, seguida da padronização visual. O acabamento atual, com muitos brilhos, cores e animações, pode ser simplificado para valorizar OM, serial, pendência e próximo passo.

Esta auditoria não modifica a aplicação. O checkpoint `checkpoint/intranet-etapa-2-2026-11-17` permanece preservado.

## Escopo e método

- Revisão das dez telas funcionais e da rota inicial de redirecionamento, incluindo componentes compartilhados e contratos da API que afetam a experiência.
- Navegação real nas dez telas com conta administrativa no ambiente local descartável. Base: 251 ocorrências, 17 conferências SMT e nenhuma requisição de material cadastrada durante a inspeção.
- Inspeção em 1440 × 900, amostras em 768 × 1024 e confirmação dos cabeçalhos/layout em 390 × 844. As dimensões são CSS pixels, não uma simulação completa de dispositivos físicos.
- Conferência de foco ao abrir cadastro, Escape, mensagens de busca vazia, indicadores, nomes/associações de controles no DOM, gráficos e download de CSV.
- Os fluxos de outros perfis foram revisados no código, sem executar todas as combinações de permissões. Não foram executados exclusões, redefinições de senha, arrastos de entrega ou falhas de rede durante a navegação.
- Não foi usada uma ferramenta completa como axe nem leitor de tela. O resultado é uma auditoria heurística e técnica, com verificações manuais/DOM; não certifica conformidade integral com WCAG.

Legenda de evidência: **V** = observado na interface/arquivo exportado; **C** = confirmado no caminho do código, sem executar a ação que altera dados; **R** = recomendação de design que precisa de validação com usuários.

Prioridades: **P1** = pode alterar operação, ocultar pendências, eliminar dados ou induzir decisão incorreta; **P2** = prejudica uso, recuperação de erro, acesso ou consistência; **P3** = refinamento visual/editorial.

## Cobertura e recomendações por tela

| Tela | Observação principal | Direção proposta |
|---|---|---|
| Login `/login` | Labels associados e erro geral anunciado são pontos úteis. Marca/ilustração dominam a composição; campos e botão têm atrasos de animação de 2,2–2,6 s no código. | Acesso compacto e imediato; contexto da empresa/unidade e identificação do ambiente; ajuda para problemas de acesso; animação opcional. |
| Administração `/admin` | Cadastro abre sem mover o foco; Escape não fecha. Redefinição de senha envia um contrato inválido; erros podem alterar totais e duplicar linhas localmente. | Fluxos separados de criar, editar e redefinir; foco correto; confirmação inequívoca; lista e totais derivados dos dados confirmados. |
| Operador `/operador` | Formulário ocupa quase toda a primeira dobra; fila abaixo. “PRO”, “UX PRO” e demonstração competem com informações do trabalho. Serial é encurtado. | Posto de trabalho centrado em OM/lote/estado/sincronização, formulário enxuto e fila visível; serial completo ou copiável; atalhos seguros. |
| Reparo `/reparo` | 251 abertos aparecem corretamente na fila. Kanban deixa duas colunas grandes vazias e exige muita rolagem para a fila preenchida. Exclusão imediata. | Tabela/fila compacta como opção operacional, Kanban alternativo; conclusão/cancelamento explícitos; proteção contra exclusão e identificação por serial/designador. |
| Almoxarifado `/almoxarifado` | Estado vazio foi inspecionado. “Separando” representa entrega parcial no modelo; arrastar pode zerar/preencher quantidades. Há falha potencial no filtro de data. | Conferência de entrega como ação própria, quantidades e unidades claras, status coerentes com o processo físico; filtro recuperável; ações de salvar/cancelar sem mensagens contraditórias. |
| Conferência SMT `/smt/conferencia` | 17 pendências continuam no contador, mas busca sem resultado exibe “Tudo limpo!”. Cartões repetem muita informação; lista longa no celular. | Diferenciar busca vazia, fila resolvida e erro; fila compacta, detalhe lateral e decisão contextual; botão de sair nomeado. |
| Qualidade `/qualidade` | Dashboard mostra 251 falhas e Yield de 49,80%, enquanto outro relatório mostra 97,60% para a mesma base. Exibe excelência Sigma mesmo com zero dados durante o carregamento. | Definir denominadores e escopo; destacar três indicadores acionáveis; separar contagem de ocorrências, placas afetadas e unidades inspecionadas; explicar estimativas. |
| Controle de falhas `/relatorios/controle-falhas` | Indicador total mostra 12, embora a tabela informe 12 de 251. Exportação tem colunas desalinhadas. Filtros adicionais agem apenas na página. | Todos os filtros, totais e exportação sobre o mesmo conjunto; paginação apenas visual; escopo/período e quantidade exportada explícitos. |
| Relatório de qualidade `/relatorios/qualidade` | Conta 251 ocorrências corretamente na amostra, mas mostra zeros antes da carga, gráficos sem alternativa acessível e ação Excel sem implementação. | Estados de carga/erro claros, resumo textual e tabela dos gráficos, exportação funcional e definição clara da diferença para o dashboard. |
| Relatório de reparo `/relatorios/reparo` | Exibe zero pendentes enquanto o Centro de Reparos mostra 251 abertos. Tempo médio e gráfico diário usam campos/eventos inadequados. | Estados compartilhados com a API; conclusões por data real de conclusão; tempo de atendimento calculável; comparação direta entre fila e relatório. |
| Entrada `/` | Redireciona para o painel do perfil; foi observada navegação administrativa. | Validar sessão antes de apresentar área e evitar que armazenamento local antigo conduza a uma tela incompatível. Não precisa de um novo dashboard de entrada. |

## Achados que devem vir antes do redesenho

### UX-01 · P1 · Espaço pode selecionar uma linha e mudar a OM — C

`frontend/components/index/ProTable.tsx:769` trata Espaço para seleção sem interromper propagação. O listener global em `frontend/app/operador/page.tsx:275` usa a mesma tecla para pausar/retomar e ignora somente campos de texto/selects. Com OM ativa, o mesmo evento pode executar dois comandos.

**Correção:** respeitar o elemento focado, excluir elementos interativos do atalho global e usar combinação dedicada para o timer. **Aceite:** Espaço numa linha seleciona apenas a linha; em um botão, executa apenas o botão. Não executar o teste em produção.

### UX-02 · P1 · Estado da OM não acompanha outro terminal — C

`frontend/app/operador/page.tsx:174` consulta a OM a cada cinco segundos, mas atualiza apenas `elapsed`; preserva `isRunning/isPaused`. Uma pausa/finalização externa pode deixar o posto mostrando andamento e formulário habilitado. Falhas de sincronização aparecem só no console.

**Correção:** reconciliar todo o estado retornado, indicar última confirmação e desconexão, bloquear ações incompatíveis. **Aceite:** dois terminais exibem o mesmo estado e recebem instrução de atualização em conflito.

### UX-03 · P1 · Exclusão de falhas sem confirmação — C

`frontend/components/index/ProTable.tsx:295`, `frontend/app/operador/page.tsx:670` e `frontend/app/reparo/page.tsx:284` enviam exclusão sem etapa de confirmação. A proteção de registros vinculados a materiais não cobre falhas sem vínculo.

**Correção:** confirmação com quantidade, OM, serial e consequência; para registro oficial, discutir cancelamento com motivo e histórico. Não oferecer um “Desfazer” que o backend não consegue cumprir.

### UX-04 · P1 · Relatório de controle apresenta a página como total — V+C

Na base de 251 ocorrências, o cartão “Total de Falhas” mostrou **12** e “Taxa de Qualidade” **97,60%**. A tabela indicou “Mostrando 12 de 251 registros”. O dashboard de qualidade, com a mesma base, mostrou 251 e 49,80%.

`frontend/app/relatorios/controle-falhas/page.tsx:175`, `:223`, `:308` e `:360` buscam uma página e aplicam parte dos filtros/agregações/exportação sobre ela. É um problema específico desse relatório; não é o corte antigo de 50 itens nas filas já corrigidas.

**Correção:** aplicar filtros no servidor; totais, opções de filtro, gráficos e exportação precisam compartilhar o conjunto inteiro. Mudar de página não pode mudar um indicador global. Resetar a página ao mudar filtros.

### UX-05 · P1 · Relatório de reparo oculta estados atuais — V+C

Centro de Reparos: **251 abertos**. Relatório de Reparo, todo o período: **zero registros e zero pendentes**. `frontend/app/relatorios/reparo/page.tsx:120` aceita `aberto`/`em_andamento`, enquanto os estados atuais incluem `pendente`/`em_analise`.

**Correção:** um catálogo de estados entre API e telas, com rótulos legíveis separados dos valores persistidos. **Aceite:** a mesma seleção de período/OM/status gera contagens conciliáveis entre fila, relatório e exportação.

### UX-06 · P1 · Indicador de aprovação não distingue defeito de placa — C

`frontend/app/qualidade/page.tsx:318` e `:341` usa lote de OMs com falhas como unidades inspecionadas e subtrai o número de ocorrências. Uma placa com vários defeitos passa a representar várias unidades reprovadas; OMs sem falhas não entram pela mesma fonte. Um filtro de período também não demonstra quantas unidades foram efetivamente inspecionadas naquele intervalo.

**Correção:** acordar com Qualidade as definições de ocorrência, placa afetada, população inspecionada e período. Contar placas reprovadas por identificador adequado e registrar produção inspecionada. Até isso existir, nomear a medida como estimativa ou indisponível; não afirmar aprovação real. Esta auditoria não valida a alegação de conformidade IPC presente na interface.

### UX-07 · P1 · “Redefinir senha” não consegue concluir — C

`frontend/app/admin/page.tsx:294` envia só `{password}`. `backend/src/utils/schemas.js:15` exige também nome, username e perfil no schema da rota de atualização. O contrato foi conferido por validação do schema, sem redefinir credenciais no navegador.

**Correção:** ação/contrato específico de redefinição, erro junto ao campo e conclusão inequívoca. Manter claro que a alteração encerra sessões existentes.

### UX-08 · P1 · Filtro de data pode falhar com conjunto vazio — C

`frontend/app/almoxarifado/page.tsx:184` chama `new Date(filtered[0]?.created_at).toISOString()` antes de filtrar. Se o conjunto estiver vazio, a expressão lança `RangeError`. A expressão/caminho foi confirmada no código; a queda da tela não foi reproduzida conclusivamente nesta navegação.

**Correção:** eliminar a leitura desnecessária do primeiro item e validar cada data. **Aceite:** qualquer combinação sem resultados apresenta um estado vazio com opção de limpar filtros.

### UX-09 · P1 · Arrastar material pode registrar uma entrega física sem conferência — C

`frontend/app/almoxarifado/page.tsx:477` zera todas as entregas ao mover para pendente ou completa todas ao mover para entregue; a ação por arrasto em `:580` e o toast em `:594` não deixam a consequência evidente.

**Correção:** separar organização da fila de confirmação de quantidades. Exigir conferência explícita antes de preencher/zerar entregas. Usar status que expressem o evento real: “Parcialmente entregue” não deve virar apenas “Separando” sem acordo com o processo.

### UX-10 · P1 · “Tudo limpo” não significa fila resolvida — V+C

Com 17 pendências SMT, buscar `SEM-RESULTADO-AUDITORIA` exibiu “Tudo limpo! Nenhuma pendência de conferência no momento”. `frontend/app/smt/conferencia/page.tsx:211` usa o array filtrado vazio para essa mensagem; erro inicial de carga também pode deixar a lista vazia.

**Correção:** três estados distintos: “Nenhuma conferência pendente”, “Nenhum resultado para esta busca” e “Não foi possível consultar a fila”. Erro persistente deve oferecer tentar novamente; limpar a busca não deve depender de recarregar a página.

### UX-11 · P1 · CSV atribui dados às colunas erradas — V+C

O arquivo baixado no teste contém **12 linhas de dados, 11 cabeçalhos e 10 campos por linha**. A coluna “Qtd Lote” recebe o PN, e as demais ficam deslocadas. Evidência: `frontend/app/relatorios/controle-falhas/page.tsx:367` e `:380`.

**Correção:** declarar cabeçalhos e acessores juntos e usar serializador comum. Escapar aspas/quebras de linha e tratar células interpretáveis como fórmulas. Os demais exportadores também precisam dessa revisão, embora o desalinhamento específico tenha sido confirmado no controle de falhas.

## Consistência, acessibilidade e recuperação

| ID / prioridade | Evidência e impacto | Melhoria / critério de aceite |
|---|---|---|
| UX-12 · P2 · Responsividade — V | Em 390 px, as nove telas internas apresentaram largura de documento maior que a área visível; em sete delas o botão textual “Sair” ficou à direita da tela. | Cabeçalho flexível, ações agrupadas e tabelas com rolagem confinada ao próprio componente; a página inteira não deve precisar de rolagem lateral para alcançar navegação. |
| UX-13 · P2 · Modal sem gestão de foco — V+C | Cadastro de usuário abriu mantendo foco em “Novo Usuário”, no fundo; zero elementos com semântica de diálogo; Escape não fechou. `components/ui/Dialog.tsx:47`. | Primitive acessível único: nome, foco inicial, contenção, retorno ao gatilho e Escape. Proteger edição não salva sem bloquear uma gravação bem-sucedida. |
| UX-14 · P2 · Labels sem associação — V+C | Campos de cadastro, operador e filtros têm labels visuais sem `htmlFor`/ID. `components/ui/Input.tsx:22`, `Select.tsx:20`, `index/ProForm.tsx:430`. | IDs estáveis, labels clicáveis, descrição de erros e indicação de obrigatoriedade; testar com teclado e leitor de tela. Placeholder não deve substituir label persistente. |
| UX-15 · P2 · Navegação por teclado — C | Cartões de acesso são `div onClick` sem foco/teclado em `index/ProQuickLinks.tsx:188` e `:324`. | Links reais com abertura em nova aba; separar o toggle de demo. Uma navegação comum deve respeitar as permissões de cada perfil. |
| UX-16 · P2 · Toasts e mensagens — V+C | Cada toast é fixo na mesma posição; o container tenta empilhar. Falta região viva e nome no botão fechar. `components/ui/Toast.tsx:48` e `:72`. O botão sair SMT também não tem nome acessível. | Posicionar só o container; notificações no fluxo, anunciadas e com ação/tempo adequados. Erro que exige intervenção não deve depender de toast de quatro segundos. |
| UX-17 · P2 · Falha de carga versus zero — V+C | Indicadores exibem zeros durante carga; no dashboard apareceu `6σ`/“Excelente qualidade” antes dos dados. Falhas posteriores podem deixar dados antigos com aparência de atuais. `qualidade/page.tsx:223`, relatórios qualidade `:125`, controle `:198`. | Estados carregando, vazio confirmado, erro e desatualizado; última sincronização e retry. Exportação deve indicar o conjunto confirmado. |
| UX-18 · P2 · Sigma sem base válida — V+C | DPMO zero vira Sigma máximo quando não há unidades válidas; oportunidades também podem vir de proxy arbitrário. `qualidade/page.tsx:76`, `:87`, `:357`. | Mostrar “Sem dados suficientes” e distinguir estimativa de medida; exigir denominadores conhecidos antes de classificar qualidade. |
| UX-19 · P2 · Tempos e tendências mal nomeados — C | Almox calcula “Tempo Médio” com agora menos criação, sem data de entrega (`almoxarifado/page.tsx:202`). Relatório reparo depende de `updatedat` inexistente e agrupa criação como “Reparos por Dia” (`relatorios/reparo/page.tsx:239`, `:346`). | Persistir os eventos necessários ou renomear a métrica. Nunca preencher data de atualização com criação sem identificar essa substituição. |
| UX-20 · P2 · Administração após erro — C | Catch de criação altera contagem anterior; catch de exclusão pode anexar usuário já existente. `admin/page.tsx:188`, `:263`. | Restaurar snapshot exato ou recarregar dados; totais derivados da lista confirmada. Testar rejeição de cadastro/exclusão sem alterar linhas/contadores. |
| UX-21 · P2 · Edição vira cadastro aberto — C | Após salvar usuário, `editingUser` é limpo sem fechar o diálogo; o formulário permanece montado com dados anteriores e muda para criar. `admin/page.tsx:224`, `:482`; `admin/UserForm.tsx:44`. | Fechar após sucesso ou manter explicitamente o mesmo modo com dados confirmados; reset previsível ao trocar entidade. |
| UX-22 · P2 · Sucesso seguido de aviso de descarte — C | Almox salva, anuncia sucesso e chama `closeModal()` ainda com flag de alteração (`:640`, `:339`). | Atualizar baseline/dirty state; fechamento por sucesso não deve pedir descarte. |
| UX-23 · P2 · Excel não implementado — C | Os três relatórios exibem botão Excel ativo sem `onClick`: controle `:770`, qualidade `:561`, reparo `:693`. | Implementar saída válida ou retirar/identificar indisponibilidade; não apresentar ação sem resultado. |
| UX-24 · P2 · Gráficos sem alternativa acessível — V+C | Foram observados 6 canvas no dashboard, 2 no controle e 3 em cada outro relatório, todos sem nome acessível/texto próprio. | Resumo por gráfico, nome associado e tabela dos valores; cores devem ser acompanhadas por rótulos. |
| UX-25 · P2 · Identificação e densidade da fila — V+C | Serial de operador truncado para o final (`ProTable.tsx:830`); em SMT, 17 cartões geram aproximadamente dez mil pixels de página em 390 px. | Preservar identificadores completos em detalhe/cópia; lista densa com resumo, paginação e painel de detalhe. Validar informação mínima com o operador. |
| UX-26 · P2/P3 · Hierarquia visual e movimento — V+C/R | Gradientes, brilhos, muitas cores e entradas animadas em várias telas. Login escalona entrada até 2,8 s (`LoginForm.tsx:163`, `:232`, `:314`). `globals.css:296` reduz só parte das animações. | Conservar a identidade, padronizar tokens e reduzir decoração no modo operacional; respeitar movimento reduzido e evitar atrasar o acesso aos controles. |

## Responsividade: medidas observadas

Os valores abaixo são amostras com o cabeçalho já presente, não metas de layout. Podem variar com animação, dados, fontes e barras de rolagem. A medição é largura do documento; não prova, sozinha, um defeito em todo elemento da página.

| Tela | Largura observada em viewport 390 px | Sair textual fora da área visível |
|---|---:|---|
| Login | 390 px | Não se aplica |
| Admin | 450 px | Sim |
| Operador | 445–768 px nas amostras | Não |
| Reparo | 558 px | Sim |
| Almoxarifado | 537 px | Sim |
| SMT | 456 px | Botão só com ícone |
| Qualidade | 460 px | Sim |
| Controle de falhas | 768 px | Sim |
| Relatório qualidade | 460 px | Sim |
| Relatório reparo | 445 px | Sim |

Em 768 px não apareceu overflow global nas amostras. Isso não comprova usabilidade touch, funcionamento com zoom, leitura em monitor industrial ou cobertura completa de todos os modais.

## Direção de UX/UI que recomendo

1. **Uma estrutura comum:** navegação por setor/perfil, título da tarefa, localização atual, usuário e saída em posições consistentes. Não obrigar o usuário a voltar ao operador para trocar de setor. Diferenciar relatórios por finalidade, com nomes coerentes.
2. **Uma barra operacional:** OM, lote, estado confirmado, tempo, última sincronização e ação principal. Identificar claramente TESTE/HOMOLOGAÇÃO/PRODUÇÃO; informar quando há falha de conexão.
3. **Formulário orientado ao trabalho:** manter contexto da OM, agrupar serial/designador/defeito/PN, aceitar leitor de código quando aplicável, foco no próximo campo e erros junto ao campo. Só limpar após confirmação. Validar o vocabulário “Cod. Alt”, “PN”, “SMT/SMD”, “Reparado/Concluído” com os setores.
4. **Filas legíveis:** filtros persistentes, quantidade filtrada versus total, ordenação visível, serial copiável e ações previsíveis. Tabela e Kanban devem conservar o mesmo significado e conjunto de dados; escolha de visualização pode ser lembrada por usuário.
5. **Design system pequeno:** paleta neutra, verde como ação principal se validado no contraste, vermelho para erro/destruição, âmbar para atenção, tipografia e espaçamento consistentes. Uma escala comum de cards, badges, botões, tabelas, modais e mensagens resolve mais que trocar a biblioteca visual.
6. **Gráficos para decidir:** Pareto com categorias legíveis, tendência com período/unidade e resumo textual. Exibir poucos indicadores essenciais primeiro; configuração avançada em área secundária. Evitar classificação de “excelente” sem base conhecida.
7. **Conforto no turno:** modo com animação reduzida, boa leitura em iluminação real e alvos adequados ao dispositivo. Avaliar tema claro e escuro com usuários, sem presumir que um seja melhor em toda a fábrica.

Como referência, WCAG 2.2 AA trata alvo mínimo de 24 × 24 CSS px com exceções de espaçamento/equivalência; **44–48 px aqui é uma proposta ergonômica para uso touch**, não o mínimo AA universal. O botão Reparar medido tinha altura 36 px: isso, isoladamente, não demonstra falha AA. [Referência W3C sobre alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Contraste deve ser medido por componente/estado. Na amostra CSS do botão Reparar, texto branco de 14 px usa gradiente entre `#059669` e `#15803d`; branco sobre o primeiro extremo resulta em **3,77:1**. Esse cálculo do extremo indica risco, mas não substitui medir onde os caracteres são efetivamente renderizados sobre o gradiente. Texto normal precisa de 4,5:1, com exceções previstas; não classifiquei toda a paleta como aprovada/reprovada. [Referência W3C sobre contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

O modal deve seguir um comportamento comum de foco, Tab/Shift+Tab, Escape e retorno ao gatilho. [Padrão de diálogo modal W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). A revisão de código também utilizou as [Web Interface Guidelines da Vercel](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) e a skill local de auditoria de acessibilidade.

## Ordem de implementação e aceite

**UX-A — Correção operacional:** UX-01 a UX-11. Corrigir contagens/status/exportação, mensagens SMT, contratos administrativos, filtro de data, exclusões e efeitos de entrega. Aceite com dataset conhecido: fila, relatório, filtros e CSV conciliados; nenhuma ação de teclado tem efeito duplo; nenhuma quantidade física muda sem intenção explícita.

**UX-B — Componentes e estados:** modais, inputs/selects, notificações, carregamento/erro/vazio/desatualizado e comportamento após salvar. Aceite: percurso completo por teclado, foco previsível, mensagem persistente com ação de recuperação e nenhum formulário muda de finalidade após sucesso/erro.

**UX-C — Estrutura e responsividade:** cabeçalho/navegação comum, barra da OM, densidade de fila e acesso aos identificadores. Aceite em monitores da fábrica, tablet e largura de 320–390 CSS px: navegação alcançável e rolagem horizontal restrita às tabelas que realmente exigem duas dimensões. Os testes a 320 px ainda devem ser executados.

**UX-D — Visual e validação no posto:** tokens, tipografia, contraste por estado, animação reduzida e gráficos acessíveis. Testar com operadores, reparo, almoxarifado e Qualidade: localizar uma pendência, registrar falha, tratar conflito, conferir entrega, validar SMT e exportar um período. Medir sucesso da tarefa, erros, necessidade de ajuda e tempo de execução, sem inventar metas antes de medir a situação atual.

As correções de persistência/sessão da etapa 2 continuam válidas. Esta auditoria identificou problemas adicionais de experiência e apresentação; não altera o checkpoint nem significa que todos os fluxos já estejam homologados para uso oficial.
