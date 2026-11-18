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
| Estado da OM entre terminais | UX-02 | Concluído nesta etapa. |
| Ações importantes e integridade dos lançamentos | UX-03 e validação do estado da OM no servidor | Próxima etapa. |
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

### Limites e próximo controle

Sincronização periódica tem atraso: até cinco segundos em condições normais;
falhas de rede podem acrescentar o timeout. Não é comunicação em tempo real.
Timeout ou cancelamento no cliente não comprovam rollback de um comando no servidor;
a próxima consulta reconcilia o estado que foi efetivamente confirmado no banco.

A consulta feita antes do envio reduz o risco na interface, mas não substitui uma
validação transacional no servidor. A revisão confirmou que `/api/registros/batch`
ainda permite criar registros sem verificar o estado da OM; o teste de integração
atual inclusive insere registros em uma OM já finalizada. Tratar esse ponto na
próxima etapa, com testes próprios e compatibilidade explícita para dados legados.
Essa mudança de contrato fica separada da sincronização para não interromper
importações e dados legados sem uma regra de compatibilidade definida.
Esta etapa não altera a regra desse endpoint nem certifica prontidão para produção.
