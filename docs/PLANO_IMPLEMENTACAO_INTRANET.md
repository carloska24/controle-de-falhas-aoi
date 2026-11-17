# Etapas de preparação para uso na intranet

Branch: `codex/preparacao-intranet`. Base da avaliação: `e67fd78`.

## Etapa 1 — Inicialização e implantação segura

Implementada localmente em 17/11/2026:

- Corrigida a exportação inexistente de limpeza demo, com limpeza limitada a registros/requisições `DEMO-`.
- Removida a rota HTTP de criação/redefinição de administrador.
- Debug exige `NODE_ENV=development` e `DEBUG_ROUTES_ENABLED=true`; produção sempre retorna 404.
- Build somente gera o Prisma Client; não altera schema, apaga dados ou cria usuários.
- Migração inicial versionada a partir do schema atual; não aplicada ao banco.
- Bootstrap de administrador explícito, senha obrigatória e sem redefinição de contas existentes.
- PM2 configurado para produção e debug desativado.
- Produção recusa CORS ausente, curinga ou origem inválida.
- Testes padrão usam ambiente isolado e Prisma simulado; `test:auth` executa a suíte real.

Validação: 24 testes em 3 suítes passaram; build do backend passou com URL de banco fictícia/inacessível. A importação real do backend em modo produção passou, sem abrir listener ou consultar o banco. `prisma validate` passou. A suíte HTTP também exercita a importação dos controladores, healthcheck e autenticação. As migrações ainda precisam ser testadas em PostgreSQL de homologação. Build e testes não comprovam funcionamento integral na fábrica.

Contas antigas não são removidas automaticamente. Revisar administradores já existentes antes do piloto. O baseline não modifica o modelo de dados legado; as correções de integridade seguem na etapa 2. Instruções operacionais: [backend/README.md](../backend/README.md).

## Etapa 2 — Integridade dos dados e fluxos

Entregas implementadas em 17/11/2026:

- OMs passaram a usar `ordens_manufatura` como fonte de verdade. Cada transição e seu evento de histórico são gravados na mesma transação; controle de versão recusa concorrência. Falha de gravação retorna erro, sem sucesso falso nem estado apenas na memória.
- Conforme regra confirmada pelo usuário, OM finalizada não pode ser iniciada novamente. Reabertura não foi implementada.
- Migração preserva as tabelas antigas. Bloqueia dados ambíguos (OM ativa e pausada simultaneamente) e timestamps incompletos para revisão; execução aberta legada prevalece sobre uma finalização antiga, que continua arquivada na tabela anterior.
- Filas de registros/requisições agora carregam todas as páginas antes de atualizar indicadores. Backend valida paginação e usa ordem determinística; cada página tem contagem e dados no mesmo snapshot. O frontend detecta respostas incompletas, mudança de total e duplicatas, com limite explícito de 10 mil itens.
- Logout centralizado confirma revogação antes de sair. Tokens são validados no banco a cada chamada, e alterações cadastrais/senha/perfil invalidam versões anteriores. Logout invalida **todas as sessões da mesma conta**, inclusive outros terminais; usar contas individuais. Logout não exclui registros.
- Edição/status de registro exige `version`. SMT envia só os campos de conferência; lote de reparo é transacional e recusa versões antigas. Quantidades, estados e tamanhos de lote são validados.
- Requisições novas vinculam cada registro ao pedido de material, impedindo duplicação no reenvio. Autoria vem do usuário autenticado. Registros vinculados não podem ser apagados diretamente.
- Logs de validação não contêm o corpo/senha; consultas SQL deixam de ser registradas em produção. Pool de conexões pode ser limitado por `DATABASE_POOL_MAX` (1 no PGlite temporário).

Validação: 77 testes backend e 14 testes frontend passaram; builds backend/frontend e TypeScript passaram. O teste `npm run test:integration:isolated` usa sua própria instância PostgreSQL/PGlite descartável, sem ler o banco local: migra dados legados, confirma rollback SQL por falha de auditoria, testa 251 registros, conflito de versões, rollback de lote, solicitações simultâneas e revogação de sessão. Essa verificação não substitui carga/concorrência no PostgreSQL nativo da fábrica.

Prévia também conferida no navegador: login administrativo e tela do operador com **251 registros**, 21 páginas locais e métricas completas. O ambiente temporário contém a OM fictícia `OM-TESTE-ETAPA2`, aberta com lote de 500. A carga fictícia foi dividida em lotes menores devido a uma limitação do PGlite ao inserir muitos parâmetros de uma vez; não se trata de teste de capacidade do banco nativo.

Limites que permanecem para a homologação:

- A coleta de várias páginas ainda ocorre no cliente e não é um único snapshot entre páginas; mudanças simultâneas mantendo total e IDs sem repetição podem escapar. Para histórico grande, implementar filtros/agregação/exportação no servidor antes de ampliar além de 10 mil itens.
- Vínculos de pedidos legados não são inferidos. Antes de operar com dados antigos, reconciliar requisições existentes. Excluir explicitamente um pedido remove vínculos e permite nova solicitação.
- Histórico detalhado de OMs foi implementado; auditoria completa de edições/exclusões de falhas e requisições, e controle concorrente dos itens de almoxarifado, ainda precisam de extensão antes do uso como registro oficial.
- Aplicar frontend e backend juntos: versões antigas da interface não enviam `version`. Sessões anteriores à migração precisam de novo login.

Aceite em homologação: repetir testes de falha/reinício, filas com mais de 200 itens, troca de turno e concorrência em terminais reais; conferir restore antes de migrar dados da empresa. As migrações desta etapa foram aplicadas apenas a bancos descartáveis de teste.

## Etapa 3 — Dependências e testes de integração

- Remover `backend/.env` do versionamento sem apagar a configuração local: o arquivo já é rastreado, apesar da regra de ignore. Revisar o histórico e trocar credenciais se contiver valores reais.
- Atualizar dependências com alertas, revisar compatibilidade e executar regressão.
- Corrigir lint do frontend e adicionar fluxos de integração/end-to-end com banco descartável.
- Configurar CI com build seguro, testes, lint e verificação de tipos.

## Etapa 4 — UX/UI fabril

- Aplicar direção visual e padrões comuns às telas existentes.
- Corrigir foco dos diálogos, labels, teclado, mensagens e estados de sincronização.
- Preservar preenchimento em erros e impedir reenvio duplicado.
- Validar legibilidade, atalhos e fluxo com operadores nos equipamentos reais.

Referências selecionadas na avaliação: UI UX Pro Max, Impeccable, Frontend Design e Web Design Guidelines da Vercel. A revisão visual renderizada ocorre nesta etapa, após estabilizar os fluxos.

## Etapa 5 — Homologação e piloto

- HTTPS interno, backup com alertas, teste de restauração e rollback.
- Confirmar usuários simultâneos, volume por turno e se o sistema será registro oficial.
- Definir RPO/RTO e responsáveis por suporte com TI, Produção e Qualidade.
- Piloto supervisionado com contingência e teste de falha/reinício/troca de turno.

Liberação oficial depende desses critérios; a conclusão da etapa 1 não aprova o go-live.
