# Auditoria funcional — andamento

Atualização: 18/11/2026. Branch: `codex/preparacao-intranet`.

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
| Integridade de novos lançamentos | Estado e versão da OM no servidor | Concluído nesta etapa. |
| Confirmações de ações importantes | UX-03 | Próxima etapa, preservando o visual. |
| Totais, filtros, CSV e estados de reparo | UX-04, UX-05, UX-11 | Pendente. |
| Definições de indicadores de qualidade | UX-06 | Pendente de definição com o processo de Qualidade. |
| Administração, datas, entregas e filas SMT | UX-07 a UX-10 | Pendente. |
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

Próxima etapa: UX-03, confirmações de ações importantes, mantendo a identidade visual.
