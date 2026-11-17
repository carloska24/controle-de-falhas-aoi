# Avaliação de prontidão para a fábrica e seleção de skills

Data: 17/11/2026. Código avaliado: commit `e67fd782d7c41ff133108c48ed8a55c6dabeba29`. Cenário confirmado: intranet.

**Parecer: não liberar esta versão para operação oficial com dados reais.** Há bloqueadores reproduzidos de inicialização e persistência, além de falhas de segurança e apresentação incompleta de dados. A arquitetura Next.js + Express + PostgreSQL é uma base adequada para evoluir. A capacidade necessária depende do número de terminais, volume e metas de continuidade ainda não informados.

Esta avaliação reúne três frentes de análise: backend/segurança, frontend/fluxos e arquitetura/operação. Foram revisadas as conclusões cruzando rotas, validação e controladores. Não houve teste contra banco real, alteração de código funcional ou acesso ao servidor da fábrica. Ausência de evidência operacional no repositório não prova ausência desses controles na empresa.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| Importar backend com URL de banco isolada/inacessível | Falha: `ReferenceError: clearDemoData is not defined` |
| `npm test -- --runInBand`, com ambiente isolado | 1 suíte falhou antes de executar testes; 0 testes executados |
| Falha de banco simulada em `startOM`, com Prisma substituído em memória | Resposta de sucesso mesmo após erro de persistência |
| Frontend: `npx --no-install tsc --noEmit --incremental false` | Passou |
| Frontend: `npm run build` | Passou; páginas geradas com Next.js 16.3.0 |
| Frontend: `npm run lint` | Falhou: comando `next lint` interpretado como diretório inexistente |
| `npm audit --omit=dev --json` backend | 22 dependências afetadas: 1 crítica, 18 altas e 3 moderadas |
| `npm audit --omit=dev --json` frontend | 6 dependências afetadas: 2 críticas, 3 altas e 1 moderada |

Os números de audit representam dependências afetadas, incluindo transitivas; não equivalem a ataques demonstrados ou a falhas independentes. A explorabilidade exige verificar a versão e o recurso efetivamente usado. A árvore de produção do backend inclui a ferramenta Prisma e suas dependências. Não foi executado `npm audit fix` nem o build do backend, pois este modifica o banco.

## Riscos prioritários

P0: impede execução. P1: bloqueia uso real pelos riscos de dados/segurança. P2: melhoria necessária para confiabilidade, usabilidade ou manutenção; criticidade final depende do processo fabril.

### 1. P0 — Backend não inicia

`backend/src/controllers/debugController.js:157` exporta `clearDemoData`, que não existe. `backend/server.js:26` importa as rotas incondicionalmente. Desativar debug por variável de ambiente não elimina esse erro de importação.

**Ação:** corrigir o contrato de exportação/rotas e testar inicialização com debug desativado e banco de homologação. Acrescentar teste de inicialização na integração contínua.

### 2. P1 — Atualização pode aceitar perda de dados e criar administradores conhecidos

`backend/package.json:14` executa `prisma db push --accept-data-loss` e seed durante o build. `backend/prisma/seed.js:21` define três administradores com senhas fixas e publicadas. Isso é comportamento do código; não foi verificada a existência dessas contas no banco da empresa.

**Ação:** separar compilação, migração e criação inicial de administrador; versionar migrações compatíveis com o Prisma usado, revisar SQL e testar sobre cópia restaurada. Remover contas de demonstração da produção e criar credenciais individuais. Atualizar documentação e fixar runtime compatível: o lock do Prisma 7.4.1 exige Node ^20.19, ^22.12 ou >=24; o README ainda sugere 18+.

### 3. P1 — OM confirmada sem gravação e transições sem atomicidade

`backend/src/controllers/omController.js:50` captura falhas no salvamento; `:183` prossegue com resposta de sucesso. A simulação confirmou esse comportamento. Pausa, retomada e finalização removem o estado anterior antes de salvar o próximo (`:230`, `:247`, `:263`). Uma falha intermediária pode deixar a OM sem estado persistido. O objeto em memória da linha 4 mantém uma cópia por processo.

**Ação:** retornar sucesso somente após persistir; propagar erro; tornar transições transacionais. Evoluir para uma entidade de OM com status e versão no banco. Testar reinício, falha entre operações e comandos simultâneos. Enquanto houver cache autoritativo por processo, não escalar para várias instâncias.

### 4. P1 — Filas e indicadores consideram apenas os primeiros 50 itens

`backend/src/controllers/registroController.js:5` e `requisicaoController.js:5` usam limite padrão 50. Diversas telas ignoram `meta.totalPages`: operador (`frontend/app/operador/page.tsx:117`), reparo (`reparo/page.tsx:135`), almoxarifado (`almoxarifado/page.tsx:129`), qualidade (`qualidade/page.tsx:226`), relatórios de qualidade (`relatorios/qualidade/page.tsx:128`), reparo (`relatorios/reparo/page.tsx:117`) e conferência SMT (`smt/conferencia/page.tsx:58`).

Uma ocorrência antiga pode ficar fora da fila e dos filtros locais. Paginar o array já recebido não recupera os demais registros. Esse achado não se aplica indistintamente a todos os relatórios: controle-falhas já lê metadata da sua API.

**Ação:** paginação e filtros no servidor; totais/agregações/exportação sobre o conjunto completo. Validar com mais de 50 e 200 itens e comparar resultados conhecidos por OM, período e status.

### 5. P1 — Sessão permanece em terminal compartilhado

`frontend/app/smt/conferencia/page.tsx:136` só limpa storage ao sair; não expira o cookie HttpOnly. O operador usa fallback `localhost` para logout (`operador/page.tsx:364`), embora o cliente comum detecte o host atual (`frontend/lib/api.ts:16`). Acesso por IP sem variável pode deixar a sessão aberta. Exclusão ou rebaixamento de usuário não revoga o JWT já emitido, aceito por até 8 horas (`backend/src/middleware/auth.js:17`; `authController.js:17`).

**Ação:** centralizar logout e expirar cookie com os mesmos atributos usados no login; testar saída/troca de turno nos terminais reais. Adotar revogação ou versão de sessão e validação de conta ativa.

### 6. P1 — Configuração de intranet pode habilitar desenvolvimento/debug

`backend/ecosystem.config.js:10` força `NODE_ENV=development`. Nesse modo, CORS aceita qualquer origem com credenciais; debug é habilitado por ambiente (`backend/src/routes/debugRoutes.js:7`). A rota de seed usa chave padrão e pode redefinir administrador. Também há fallback permissivo de CORS em produção sem `CORS_ORIGIN` (`server.js:62`).

**Ação:** configuração explícita de produção, debug inacessível, origem permitida obrigatória e validação de ambiente ao iniciar. Servir UI/API por domínio interno com HTTPS, banco acessível somente pelo backend e regras de firewall definidas pela TI. Intranet também precisa proteger credenciais em trânsito; essa orientação segue as [práticas oficiais do Express](https://expressjs.com/en/advanced/best-practice-security/).

### 7. P1 — Dependências com alertas altos/críticos

O audit consultado identifica alertas inclusive no Next.js instalado. A rede interna reduz exposição externa, mas não substitui correções. Cada alerta deve ser triado por caminho de dependência, condição de exploração e uso no projeto.

**Ação:** atualizar em branch de correção, revisar compatibilidade e executar regressão. Evitar atualização forçada sem análise. Registrar resolução ou justificativa verificável por alerta.

### 8. P1/P2 — Rastreabilidade insuficiente

`backend/src/controllers/requisicaoController.js:80` lê `req.user.username`, mas o token define o nome de usuário em `email` (`authController.js:16`), levando ao autor `Sistema`. Não há histórico de edição/status/exclusão no schema; operadores e reparadores podem excluir registros (`registroRoutes.js:65`).

**Ação:** persistir ID do autor, instante, ação, valores anterior/novo e motivo; revisar permissões com Qualidade. Para registros oficiais, preferir cancelamento rastreável à exclusão física. Identificar política de retenção e regras de acesso da empresa.

### 9. P2 — Modelo, concorrência e duplicações

`backend/prisma/schema.prisma` guarda datas e itens como texto e OMs em três tabelas sem vínculos formais com registros/requisições. Status de registro pode receber texto arbitrário; edição admite quantidade negativa (`schemas.js:43`). Criação de requisição não tem chave de idempotência.

A conferência SMT envia uma cópia antiga de PN, serial, observação e outros campos (`frontend/app/smt/conferencia/page.tsx:92`). O update usa apenas ID, sem versão (`registroController.js:117`), podendo sobrescrever correções concorrentes. **O status de reparo não é sobrescrito nessa rota:** o schema remove esse campo do payload.

**Ação:** restrições de domínio, tipos adequados, relacionamentos e migração preservando dados; comandos específicos por ação, controle de versão e proteção contra reenvio duplicado.

### 10. P2 — Continuidade e operação ainda precisam de comprovação

Há runbook, checklist e guia de backup, o que é positivo. O checklist versionado está desmarcado. O script sugerido em `docs/GUIA_BACKUP_SGBD.md:48` imprime sucesso sem verificar o código de saída do dump. Não foram demonstrados agendamento ativo, restauração cronometrada, rollback ou disponibilidade durante um turno.

**Ação:** definir perda máxima aceitável de dados (RPO) e prazo de recuperação (RTO); automatizar backup com verificação e alerta, manter cópia protegida e testar restore separado. Implantar supervisão dos serviços, logs com rotação e alertas de API/banco. Não registrar corpo de login inválido: `schemas.js:95` pode incluir senha nos logs. Separar limpeza de demo do logout, que hoje exclui dados globais de demonstração.

## UX/UI: achados aplicados e direção recomendada

As [Web Design Guidelines da Vercel](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) foram lidas com suas [regras atuais](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) e aplicadas aos componentes. Esta é uma revisão de código, sem auditoria visual renderizada ou certificação de acessibilidade.

- `frontend/components/ui/Input.tsx:22` — label sem associação `htmlFor`/ID ou encapsulamento do input; corrigir associação e descrição dos erros.
- `frontend/components/ui/Input.tsx:59` — botão de senha sem nome acessível e fora da navegação por Tab.
- `frontend/components/ui/Dialog.tsx:47` — falta semântica de diálogo, foco inicial, contenção/devolução de foco e tratamento de Escape.
- `frontend/components/ui/Toast.tsx:44` — mensagens sem região viva; botão de fechar sem nome acessível. Há outro componente de toast no projeto; padronizar e confirmar quais telas usam cada um.
- `frontend/app/globals.css:296` — redução de movimento cobre `.smd-component`; os componentes Framer Motion analisados precisam tratar a preferência também.
- Filas de reparo/almoxarifado dependem de buscas ao montar ou de ações locais; incluir atualização controlada e horário da última sincronização.
- Reparo em lote usa chamadas individuais sequenciais; falha intermediária pode deixar aplicação parcial sem reconciliação clara (`frontend/app/reparo/page.tsx:304`). Apresentar resultado real por item ou executar lote atômico.

Direção proposta para validar com operadores: interface de operação industrial, com identificação clara de usuário, OM e lote; fila e formulário como elementos centrais; cores semânticas acompanhadas de texto; hierarquia tipográfica consistente; botões adequados ao dispositivo real; fluxo por teclado/leitor de código quando aplicável. Medir contraste e testar iluminação, tamanho dos monitores e eventual uso de luvas antes de fixar tema e densidade.

Exibir estados distinguíveis de enviando, salvo, falhou e desatualizado. Preservar preenchimento após erro de rede; proteger contra reenvio duplicado e avisar ao sair com dados não gravados. Definir tokens compartilhados de cor, tipografia e espaçamento e reduzir efeitos decorativos que atrapalhem a leitura. Estas são propostas, ainda sujeitas a validação nas telas reais.

## Skills selecionadas: critério e uso

Não existe classificação universal de qualidade. Foram consultados em 17/11/2026 o [ranking de instalações skills.sh](https://www.skills.sh/) e o [ranking de repositórios por estrelas](https://www.skillleaderboard.com/). Popularidade é um sinal de adoção. Posições mudam; ranking de repositório não prova que toda skill daquele pacote esteja no top 50 de instalações.

| Skill/pacote | Evidência de seleção | Aplicação ao AOI |
|---|---|---|
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Repositório #6 no ranking consultado por estrelas | Sistema visual, formulários, tabelas, padrões de interação e acessibilidade |
| [Impeccable](https://github.com/pbakaus/impeccable) | Repositório #12 no mesmo ranking | Revisão e refinamento de interface existente, clareza e estados de erro |
| [Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Skill #15 no ranking de instalações; repositório Anthropic #4 por estrelas | Direção visual específica para o contexto industrial |
| [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Repositório Vercel #33 por estrelas; skill #62 por instalações, fora do top 50 individual | Revisão aplicada de formulários, acessibilidade, foco, mensagens e interação |
| [React Best Practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md) | Mesmo repositório Vercel; skill #57 por instalações | Performance de tabelas, carregamento e renderização na etapa de implementação |
| [Code Review and Quality](https://github.com/addyosmani/agent-skills/blob/main/skills/code-review-and-quality/SKILL.md) | Repositório #10 por estrelas; cópia disponível no ambiente | Critérios usados para consolidar correção, simplicidade, arquitetura, segurança e desempenho |

Foram lidos os materiais de origem de UX/UI. A aplicação efetiva nesta avaliação foi a revisão pelas diretrizes Vercel e a consolidação de arquitetura/qualidade com skills locais. Os demais pacotes são recomendações para as próximas etapas; não foram instalados, executados ou usados para alterar telas. Não é necessário instalar os 50 pacotes para obter benefício. Skills orientam o trabalho do agente e não tornam o sistema automaticamente confiável.

## Plano de liberação e critérios de aceite

1. **Estabilização:** corrigir inicialização, deploy destrutivo, contas demo, configuração e alertas relevantes de segurança. Aceite: instalação limpa e startup em ambiente de homologação; migração preservando dados; testes de perfis passam.
2. **Integridade:** corrigir OMs, paginação, sessões, autoria, validação e concorrência. Aceite: nenhum sucesso após falha de gravação; restart preserva estados; filas e totais corretos acima de 200 registros; logout encerra sessão; conflito não sobrescreve dados silenciosamente.
3. **UX/UI:** padronizar componentes, foco, mensagens, tabelas e estados de sincronização. Aceite: fluxos principais completos por teclado e no dispositivo real; erros recuperáveis; validação com operadores, reparo, almoxarifado e Qualidade.
4. **Operação:** HTTPS interno, serviços supervisionados, backup/restore, logs e rollback. Aceite: restauração e reinício documentados dentro das metas acordadas com TI; responsáveis definidos.
5. **Piloto supervisionado:** uma linha/turno, com contingência e conciliação com o processo vigente. Exercitar perda de rede/banco, dois usuários na mesma OM, lote parcial e fechamento de turno. Só ampliar após aceite de Produção, Qualidade e TI.

Adicionar pipeline com instalação reproduzível, geração do cliente Prisma, testes isolados, lint válido, TypeScript e builds seguros. O Jest atual só descobre `.spec.js`; os arquivos de performance `.test.js` ficam fora do comando padrão. O script `test:auth` aponta para placeholder vazio. Portanto, os scripts existentes não comprovam cobertura de produção.

A estimativa de capacidade e o desenho final da infraestrutura dependem de usuários simultâneos, registros por turno, uso oficial ou auxiliar e metas RPO/RTO. O resultado atual justifica uma etapa de estabilização antes do piloto; não sustenta prometer um sistema sem falhas.
