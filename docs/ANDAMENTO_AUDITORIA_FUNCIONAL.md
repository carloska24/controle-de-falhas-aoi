# Auditoria funcional — andamento

Atualização: 19/11/2026. Branch: `codex/corrigir-redefinicao-senha`.

## Direção aprovada

Executar as recomendações funcionais da auditoria por etapas. Preservar layout,
cores, ícones e animações existentes. Propostas de redesenho do relatório original
ficam adiadas. Estados operacionais, bloqueios e mensagens podem mudar quando
necessários para informar o resultado real de uma ação.

Referência: [auditoria de UX/UI](AUDITORIA_UX_UI_2026-11-17.md).

## Skills e ferramentas

| Necessidade | Recurso disponível | Uso nesta etapa |
|---|---|---|
| Diagnóstico por causa raiz | `code-showcase-systematic-debugging` | Reprodução antes da correção e cenários de regressão. |
| Revisão técnica | `code-review-and-quality` | Correção, estrutura, concorrência, segurança e evidência de testes. |
| Validação no servidor | `backend-security-coder` | Estado e versão da OM, consultas parametrizadas e respostas sem detalhes internos. |
| Arquitetura e contratos | `architect-review` | Disponível para mudanças com impacto arquitetural nas próximas etapas. |
| Dados de inspeção | `database-migration` | Migração aditiva, verificação do esquema e preservação do histórico. |
| Testes de API e regras | Node test runner, Jest e integração isolada já existentes | Testes de sincronização sem nova dependência. |
| Operação no navegador | Ferramentas de navegador já disponíveis | Pausa/retomada externa, conexão e formulário. |
| Acessibilidade | Skills de auditoria de acessibilidade já disponíveis | Aplicar quando chegar aos achados correspondentes. |

O catálogo de plugins foi consultado. GitHub está disponível e não instalado;
poderá ajudar na revisão de CI/PRs, mas não é necessário para corrigir ou testar
este fluxo local. Nenhum plugin, pacote de runtime ou integração externa foi
adicionado nesta etapa. A seleção de skills será revisada conforme cada etapa.

## Etapas

| Etapa | Achados | Situação |
|---|---|---|
| Requisição de materiais | Seleção mista, erros e duplicidade | Concluída em `72f95ce`. |
| Atalhos em componentes interativos | UX-01 | Proteção básica incluída em `72f95ce`; manter a regressão. |
| Estado da OM entre terminais | UX-02 | Concluído em `498fbef`. |
| Integridade de novos lançamentos | Estado e versão da OM no servidor | Concluído em `b03fcad`. |
| Confirmações de ações importantes | UX-03 | Concluído em `fb28665`. |
| Totais, filtros e CSV do controle de falhas | UX-04 e UX-11 | Concluído em `633da0f`. |
| Estados e contagens do relatório de reparo | UX-05 | Concluído em `codex/corrigir-relatorio-reparo`. |
| Registro de inspeções e indicador de primeira passagem | UX-06 | Implementado para validação em piloto. Liberação após reparo é uma decisão de processo pendente. |
| Redefinição de senha na administração | UX-07 | Implementada e validada. |
| Datas, entregas e filas SMT | UX-08 a UX-10 | Pendente. |
| Acessibilidade, recuperação e ações sem implementação | Demais achados | Pendente, preservando a identidade visual. |

## UX-02 — sincronização da OM

### Causa reproduzida

A consulta periódica atualizava apenas o tempo e era executada somente enquanto
o terminal considerava a OM em andamento. Uma OM pausada não acompanhava uma
retomada externa. Reproduzido em OM exclusiva `AUDIT-SYNC-20261118-*`: servidor
em andamento e interface ainda pausada após mais de cinco segundos.

### Correção

- Consultar a OM selecionada a cada cinco segundos, inclusive quando pausada,
  e renovar a consulta ao voltar à janela.
- Validar identidade, estado, versão e tempos recebidos; aplicar o estado completo.
- Descartar respostas iniciadas antes de uma mudança local de estado ou seleção.
- Coordenar também consultas diretas e comandos: a última seleção vence consultas
  anteriores; enquanto um comando de OM está pendente, impedir troca de contexto
  e novo comando. Encerrar consultas pendentes ao sair da página.
- Carregar o estado real da OM escolhida mesmo quando a opção de uma lista antiga
  a descrevia como pausada e outro terminal já a retomou ou finalizou.
- Cancelar consultas da seleção anterior e limitar a espera a oito segundos.
- Rejeitar versões anteriores à última observada nesta sessão.
- Preservar o formulário durante pausa, finalização externa e falha de conexão.
- Bloquear Gravar e atalhos de alteração da OM enquanto não houver sincronização.
- Consultar novamente o estado antes de enviar um lançamento; não enviar quando
  o servidor informar que a OM está pausada ou finalizada.
- Usar os toasts e o indicador de estado já existentes. A última confirmação
  aparece no tooltip da barra da OM. Nenhum painel novo foi criado.
- Suspender a contagem local durante indisponibilidade e mostrar o tempo confirmado
  pelo servidor ao recuperar a conexão. A perda de conexão não pausa a OM no banco.
- Mostrar finalização como `FINALIZADA`, preservando as cores e o formato existentes.

### Verificação

- 35 testes frontend, incluindo 15 cenários de sincronização/coordenação, aprovados.
- TypeScript e build de produção aprovados.
- Classes e atributos de estilo conferidos por AST contra `c5919a3`: página do
  operador (23), formulário (64) e timer (41), todos preservados.
- Navegador: pausa e retomada externas refletem na tela, bloqueiam/liberam Gravar
  e mantêm serial, PN e designador digitados.
- Interrupção controlada da API local: indicador de falta de sincronização,
  bloqueio de Gravar e manutenção dos campos confirmados. Base persistente mantida.
- Reconexão automática confirmada sem novo login, com o rascunho preservado.
- Duas abas reais: retomada, pausa e finalização em uma aba acompanham na outra.
  Na finalização externa, Gravar fica bloqueado e os campos continuam preenchidos.
- A OM original `OM-TESTE-ETAPA2` foi preservada. As transições de ensaio ocorreram
  apenas na OM exclusiva da auditoria, que terminou finalizada sem novos registros.
- Revisão independente confirmou o tratamento da disputa entre seleções e comandos.
- Versão final no navegador: opção ainda listada como pausada carregou o estado
  em andamento do servidor; restauração, pausa e finalização locais aprovadas.

### Limites da sincronização

Sincronização periódica tem atraso: até cinco segundos em condições normais;
falhas de rede podem acrescentar o timeout. Não é comunicação em tempo real.
Timeout ou cancelamento no cliente não comprovam rollback de um comando no servidor;
a próxima consulta reconcilia o estado que foi efetivamente confirmado no banco.

A consulta feita antes do envio reduz o risco na interface, mas não substitui uma
validação transacional no servidor. Em `498fbef`, `/api/registros/batch` ainda
permitia criar registros sem verificar o estado da OM. A etapa abaixo fecha essa
lacuna. A sincronização isoladamente não certifica prontidão para produção.

## Integridade — novos lançamentos em OM ativa

### Causa reproduzida e correção

Antes da correção, o batch aceitava uma OM pausada, finalizada ou inexistente,
sem conferir sua versão. Uma pausa ou finalização entre a consulta da interface
e o POST ainda permitia uma gravação indevida. Os testes novos falharam contra
a implementação anterior e passaram após a correção.

- Exigir `omVersion` inteiro não negativo em cada item de
  `POST /api/registros/batch`. O operador envia a versão confirmada na consulta
  imediatamente anterior ao lançamento.
- Na mesma transação, bloquear as linhas das OMs com `SELECT ... FOR UPDATE`,
  em ordem estável, e validar todas antes do primeiro insert. A criação usa
  isolamento `ReadCommitted`, lendo o estado confirmado após aguardar o lock.
- Recusar OM inexistente com 404; pausada, finalizada ou versão divergente com 409;
  payload sem versão válida com 400. Não existe exceção para administrador.
- As transições de OM executam UPDATE na mesma linha; por isso aguardam o lock
  da gravação, ou fazem a gravação aguardar a transição, conforme a ordem efetiva.
  A transição existente não configura isolamento Serializable explicitamente.
- Um erro de inserção em qualquer item reverte o lote inteiro. Duplicidade de ID
  retorna conflito e orienta atualizar a lista. Erros internos não expõem SQL.
- Pausar e retomar incrementa a versão; um lançamento da versão anterior continua
  inválido mesmo quando a OM já está novamente em andamento.
- O payload da página recebeu apenas `omVersion`; layout, classes, cores, ícones
  e animações não foram alterados.

Mecanismo de bloqueio: [documentação do PostgreSQL](https://www.postgresql.org/docs/18/explicit-locking.html).
Consulta com parâmetros: [documentação do Prisma](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/raw-queries).

### Compatibilidade e publicação

Não há migração ou remoção de dados. Registros históricos, inclusive os sem OM
cadastrada, continuam consultáveis e editáveis pelos fluxos existentes. O PUT de
registros mantém seu contrato anterior, inclusive a possibilidade de alterar OM;
esta etapa protege criação via batch, não todas as alterações do histórico.

Publicar frontend e API juntos e recarregar abas antigas. Clientes e integrações
que criam registros devem consultar a OM e enviar `omVersion`; requisições sem
esse campo são recusadas. Importação histórica que precise de outra regra exige
um fluxo próprio; não foi criado bypass no endpoint operacional.

Timeout e falha de conexão não comprovam ausência de commit. Atualizar a lista
antes de repetir uma gravação de resultado incerto. Idempotência geral dos
lançamentos permanece fora desta etapa.

### Verificação

- 96 testes backend e 35 frontend aprovados; TypeScript e build de produção aprovados.
- Conferência por AST contra `498fbef`: preservados os 23 atributos de classe/estilo
  da página do operador, 64 do formulário e 41 do timer.
- Integração isolada aprovada: histórico preservado após migrações, rejeições de
  estado/versão, rollback de lote, paginação de 251 registros, requisições e logout.
- PostgreSQL nativo 18.7, cluster temporário exclusivo: gravação primeiro faz o
  encerramento aguardar; pausa/finalização primeiro faz o lançamento aguardar e
  ser recusado. As barreiras de teste verificam esperas reais no banco.
- Dois lotes com OMs em ordem inversa concluem; falha por ID duplicado no segundo
  item não deixa o primeiro gravado. Versão antiga após retomada é recusada.
- Revisão independente aprovada; ajustada a limpeza do cluster temporário quando
  a preparação falha antes de iniciar o servidor.
- Ambiente local atualizado preservando a base persistente e a sessão existente.
  No navegador, lançamento válido em `AUDIT-REG-20261118` criou um único registro.
  A API local recusou OM pausada, versão ausente, versão antiga e OM finalizada.
  Pausa e finalização externas bloquearam Gravar e preservaram o rascunho.
  `OM-TESTE-ETAPA2` permaneceu pausada com seus 251 registros originais.

### Como repetir o teste de concorrência nativo

Instalar ou extrair os binários do PostgreSQL de uma
[fonte oficial](https://www.postgresql.org/download/windows/). Em PowerShell,
na pasta `backend`:

```powershell
$env:AOI_POSTGRES_BIN = 'C:\Tools\PostgreSQL\bin'
npm run test:integration:postgres
```

O helper ignora o banco configurado no `.env`, cria seu próprio cluster em pasta
temporária, usa senha aleatória e porta dinâmica somente em `127.0.0.1`, aplica
migrações e encerra o cluster ao terminar. Antes da exclusão recursiva, confere o
destino da pasta. Se não conseguir parar o servidor, preserva os arquivos e informa
o erro. Não instala serviço do Windows. A execução desta etapa usou os binários
oficiais 18.7; o preview local permanece na base persistente de demonstração.

## UX-03 — confirmação de ações importantes

### Causa e fluxo corrigido

Excluir na tabela do operador e no Centro de Reparos enviava DELETE imediatamente.
O operador removia linhas antes da resposta do servidor; em falha, a seleção podia
ser limpa mesmo sem excluir. O atalho de finalização também encerrava a OM direto.

- Revisão antes de exclusão individual/lote, com quantidade total, OM, serial
  completo e designador, incluindo registros selecionados em outras páginas.
- Texto explícito sobre exclusão permanente, sem oferecer Desfazer. O servidor
  continua protegendo registros vinculados a requisições de material.
- Lotes de reparo e cancelamento mostram os alvos e a consequência operacional;
  cancelamento de reparo preserva o registro, diferentemente de exclusão.
- Finalização da OM usa um único caminho de revisão para callback e atalho;
  informa número, encerramento sem reinício e campos ainda não gravados.
  Não abre enquanto outra consulta/comando de seleção de OM está pendente.
- Abrir, voltar ou pressionar Escape não envia a operação. O alvo revisado fica
  fixo até fechar; clique repetido não troca o alvo nem reenvia a confirmação.
- Não remover linhas antes da confirmação da API. Em erro, manter seleção e
  revisão abertas com mensagem persistente; exigir fechar e conferir novamente.
- Prazo de dez segundos, aborto da requisição e bloqueio de repetição automática.
  Timeout é resultado incerto: cancelar no cliente não comprova rollback.
  Consultas de atualização após sucesso não prendem o diálogo aberto.
- Diálogo nativo no mesmo padrão da revisão de materiais: foco inicial na opção
  de voltar, navegação de foco entre ações, Escape e retorno ao gatilho quando
  ainda existe. Atalhos globais não atuam com diálogo nativo aberto.

### Concorrência e contrato da exclusão

A revisão identificou que um registro poderia mudar entre abrir e confirmar a
exclusão. Corrigido no servidor, além da confirmação da interface:

- `DELETE /api/registros` exige `{ ids, versions }`, com IDs únicos e a versão de
  cada registro apresentado. Entre um e 200 registros por ação.
- `DELETE /api/registros/:id` exige `{ version }`.
- O lote exclui por pares de ID/versão na mesma transação. Se o total excluído
  diferir da seleção, lança 409 e reverte o lote inteiro, inclusive itens válidos.
- Alvos alterados/removidos e vínculos com materiais retornam conflito; payload
  antigo sem versões retorna 400. Não anunciar sucesso para zero linhas.
- Publicar frontend/API juntos, atualizar clientes e recarregar abas antigas.
  Sem migrações, remoção de histórico existente ou exceção administrativa.

### Verificação desta etapa

- 102 testes backend e 42 frontend aprovados. Novos cenários cobrem cancelamento,
  duplo envio, resultado incerto, conclusão tardia após desmontagem, seleção de
  outras páginas e exclusões por versão/quantidade.
- TypeScript e build de produção aprovados.
- Integração isolada: exclusões sem versão recusadas; lote com item alterado,
  ausente ou vinculado é revertido; exclusão válida individual/lote confirmada;
  repetição de uma exclusão concluída retorna conflito.
- PostgreSQL nativo 18.7: edição segura o lock de um registro enquanto o DELETE
  de lote aguarda; ao confirmar a edição, a exclusão detecta versão divergente,
  retorna conflito e preserva todos os registros do lote.
- Revisão independente encontrou e confirmou a resolução de três pontos:
  exclusão por versão, contexto de OM pendente e espera sem prazo no diálogo.
- Navegador: revisão de 24 selecionados em duas páginas, identificadores completos,
  Escape sem excluir e foco devolvido ao botão; exclusão individual em reparo
  abre a revisão e pode ser cancelada sem alterar o registro.
- Reparo: alteração externa durante uma revisão de dois registros resultou em
  conflito sem conclusão parcial; após recarregar, o lote válido foi reparado.
- Versão final: Tab e Shift+Tab permanecem entre as ações do diálogo, Espaço na
  opção de voltar não pausa a OM, e conflito leva o foco ao botão Fechar.
  O atalho abriu a revisão sem finalizar; a confirmação explícita encerrou uma
  única vez a OM de ensaio, que terminou finalizada com os dois registros mantidos.
- Os ensaios de alteração ocorreram em `AUDIT-CONFIRM-*`, com dois registros
  fictícios. Os 251 registros de `OM-TESTE-ETAPA2` continuam preservados.
- AST: todos os atributos anteriores de classe/estilo preservados: operador 23,
  reparo 162, tabela 92, formulário 64 e timer 41. A tabela recebeu apenas uma
  mensagem condicional de erro; as novas confirmações seguem o padrão existente.

Esta etapa mantém exclusão física como operação existente. Caso o sistema seja
registro oficial, definir com Qualidade retenção e substituição por cancelamento
com motivo e trilha de auditoria antes da adoção definitiva. Não foi introduzida
uma política de retenção ou reabertura de OM implicitamente.

## UX-04 e UX-11 — relatório de controle de falhas

O relatório usava a página de 12 registros para parte dos filtros, gráficos,
indicadores e exportação. O CSV também listava 11 cabeçalhos para 10 valores por
linha porque faltava a quantidade do lote. A correção está na branch
`codex/corrigir-relatorio-falhas`, criada a partir de `fb28665`.

- Uma consulta filtrada no servidor fornece o conjunto completo para tabela,
  indicadores, gráficos e CSV. A tabela pagina localmente e volta ao início
  quando os filtros mudam. OM, defeito e status têm opções de todo o período,
  respeitando a visibilidade dos dados de demonstração.
- Datas seguem `America/Sao_Paulo`. O período personalizado inclui o dia final
  inteiro. Datas legadas com fuso preservam o instante e as sem fuso são tratadas
  como horários locais. No período global, datas inválidas ficam identificadas
  no relatório e o texto original sai no CSV. Filtros de data as excluem.
- A consulta tem limite de 10.000 registros por resposta. Acima disso, mantém
  as opções disponíveis e orienta a restringir a OM ou o período. Caso o próprio
  catálogo de opções ultrapasse o limite, é preciso reduzir o período.
- Carregamento, erro e resultado confirmado têm estados distintos. A exportação
  usa a consulta confirmada dos filtros atuais. Respostas antigas são descartadas.
- O CSV inclui `Qtd Lote` na posição correta e usa UTF-8 com BOM. Trata aspas e
  quebras de linha e neutraliza texto com prefixo de fórmula. Referências
  [RFC 4180](https://datatracker.ietf.org/doc/rfc4180/) e
  [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).
- O cartão existente passou a indicar estimativa de qualidade. A definição de
  aprovação de placas depende do processo de Qualidade e segue em UX-06.

Foram aprovados 113 testes backend, 51 frontend, build e integração isolada.
O teste com PostgreSQL 18.7 verificou datas, filtros e recuperação após o limite.
No navegador, a OM original manteve o total de 251, com 11 linhas na última
página. O CSV baixado tinha 251 registros, todos com 11 colunas e quantidade de
lote na posição prevista. O filtro por defeito retornou 17 e reiniciou a
paginação. Um intervalo invertido bloqueou o CSV até a correção das datas.

A nova rota de consulta é somente leitura. A rota paginada anterior continua
disponível para seus consumidores. A validação de datas usa funções disponíveis
no PostgreSQL 15, versão indicada na documentação do sistema. O ensaio nativo
executado nesta etapa usou a versão 18.7.

## UX-05 — estados e contagens do relatório de reparo

O relatório descartava os estados atuais `pendente` e `em_analise` durante a
carga. Centro e relatório agora compartilham a classificação. A fila agrupa
pendências e análises em **Abertos**. O relatório usa o mesmo grupo no cartão e
no filtro, com **Em análise** disponível para consulta específica. Os registros
históricos continuam visíveis, inclusive aliases de conclusão e cancelamento.

O conjunto filtrado alimenta contagens, gráficos, tabela e CSV. A tabela exibe
a página atual e o total. Carregamento e erro bloqueiam a exportação. O CSV
preserva a data de atualização vazia quando ausente. O gráfico temporal foi
rotulado com o evento disponível, a criação do registro. O tempo médio depende
de uma data de conclusão e segue indisponível enquanto esse evento não existir.

Verificação no navegador com `OM-TESTE-ETAPA2`: **251 registros, 250 abertos e
1 concluído** nas duas telas. Com o filtro de abertos, a última página exibiu
10 de 250 e o CSV baixado tinha 250 linhas de dados e 10 colunas. O intervalo
invertido bloqueou a exportação, com recuperação ao corrigir as datas. Foram
aprovados 55 testes de frontend e o build, incluindo a checagem do TypeScript.

## UX-06 — placas inspecionadas e primeira passagem AOI

Em uma OM em andamento, o operador lê o serial e aciona **Gravar sem falha**.
O formulário confirma a gravação e volta o foco ao serial. O lançamento normal
de falha também registra a placa. A chave é **OM + serial**. Espaços externos
são removidos e os demais caracteres, incluindo maiúsculas e zeros à esquerda,
são preservados. O mesmo serial pode existir em OMs diferentes.

Uma placa com vários defeitos entra uma vez no total inspecionado. Uma falha
lançada durante a OM indica que a placa teve um apontamento na passagem.
Status de reparo e edições de ocorrências posteriores preservam o resultado
original registrado para a placa. Correção de serial de inspeção digitado por
engano e reclassificação de alarmes falsos exigem um fluxo de qualidade próprio.

O selo e o painel usam **placas sem falha registrada ÷ placas registradas**.
O painel filtra pelo momento do primeiro registro de inspeção e inclui OMs
finalizadas com rastreamento desde o início. O lote planejado continua como
informação de produção. OMs anteriores à migração, ordens de demonstração e
consultas sem placas válidas ficam fora da taxa. DPMO e Sigma aguardam
oportunidades de defeito por produto, e o relatório de ocorrências aguarda uma
base de placas compatível com os seus filtros.

O indicador é operacional. Para adotá-lo como FPY oficial, a Qualidade precisa
garantir a captura de todas as placas da primeira passagem e definir como tratar
alarmes falsos. Para liberação do produto após reparo, a recomendação é registrar
reinspeção, resultado e responsável no histórico do mesmo serial.
[ASQ](https://asq.org/quality-resources/quality-glossary) ·
[Siemens](https://resources.sw.siemens.com/fi-FI/case-study-siemens-rastatt/) ·
[Omron](https://www.omron.com/global/en/technology/omrontechnics/vol54/009.html).

Validação na prévia com lote planejado de 10. Um serial sem falha e outro com
dois defeitos produziram **1 de 2 placas e 50%** no selo e no painel. Repetir uma
leitura manteve a contagem, e alternar para a OM histórica deixou a taxa
indisponível. O build do frontend, 57 testes de frontend, 113 testes de backend
e os testes de integração validaram gravação, reversão de lote, concorrência
e preservação do histórico.

## UX-07 — redefinição de senha

A administração envia somente a senha para `PUT /api/users/:id/password`.
A rota exige administrador autenticado e valida ID, tamanho mínimo de seis
caracteres e limite de 72 bytes do bcrypt. A senha digitada mantém os seus
caracteres, inclusive espaços externos. Dados extras são recusados nesse contrato.
Uma única atualização grava o hash e incrementa a versão das sessões.

O diálogo identifica o usuário e informa que as sessões anteriores serão
encerradas. Erros aparecem junto ao campo. O envio bloqueia alterações e ações
repetidas até concluir. Ao redefinir a própria senha, o administrador volta ao
login. Falta de confirmação orienta a conferir o acesso com a nova senha.

Validação com 129 testes de backend e build do frontend. Na prévia com banco
persistente e conta fictícia, duas sessões abertas foram recusadas após a troca,
a senha antiga foi rejeitada e a nova permitiu entrar com o perfil preservado.
O navegador confirmou identificação do usuário, aviso sobre sessões, validação
do campo vazio e cancelamento do diálogo. A troca efetiva foi exercitada pela
API. As contas fictícias criadas nessa verificação foram removidas.
