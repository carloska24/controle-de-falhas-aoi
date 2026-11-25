# Backend AOI — desenvolvimento e implantação

Use Node.js 22.12+ da linha 22 ou 24+, npm e PostgreSQL. As versões precisam atender aos requisitos do Prisma 7.4.1 registrados no lockfile.

## Preparação

Na pasta `backend`:

```powershell
npm ci
Copy-Item .env.example .env
# Edite .env com DATABASE_URL, JWT_SECRET e CORS_ORIGIN.
npm run build
```

`npm run build` apenas gera o Prisma Client. Não conecta ao banco para aplicar schema, não aceita perda de dados e não cria usuários.

## Banco novo e vazio

Confirme a URL e que o banco de destino está vazio antes de executar:

```powershell
npm run db:migrate
```

A migração `20261117000000_baseline` reproduz o schema legado. Ela não contém as futuras melhorias de integridade descritas no plano de implementação.

## Banco já existente

Não execute a migração inicial sobre tabelas existentes. O projeto usava `db push`, sem histórico de migrações. Primeiro:

1. Faça backup e valide uma restauração em banco separado.
2. Compare o schema desse banco restaurado com `prisma/schema.prisma` usando a CLI instalada:

```powershell
npx --no-install prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

A URL usada é `DATABASE_URL` do ambiente escolhido. Esse comando é de leitura: código 0 indica ausência de diferenças detectadas pelo Prisma; 2 indica diferenças; 1 indica erro. Diferenças precisam de revisão antes de continuar. Verifique também objetos não modelados pelo Prisma (triggers, views e permissões).

3. Somente após confirmar correspondência, registre a baseline como já aplicada no banco restaurado:

```powershell
npx --no-install prisma migrate resolve --applied 20261117000000_baseline
npm run db:migrate
```

`migrate resolve` grava o histórico de migrações; não é uma verificação e não cria tabelas. Não use para esconder diferenças. Homologue a rotina na cópia antes de repetir no banco definitivo em janela acordada. Não use `--accept-data-loss`, reset ou remoção de tabelas para resolver conflitos.

## Criar o primeiro administrador

A criação é explícita, sem contas/senhas predefinidas e sem endpoint HTTP de seed. Defina as variáveis apenas para essa operação, com senha exclusiva de pelo menos 12 caracteres e no máximo 72 bytes (limite do bcrypt):

```powershell
$env:ADMIN_USERNAME = 'usuario.exclusivo'
$env:ADMIN_NAME = 'Administrador AOI'
$adminSecret = Read-Host 'Senha exclusiva do administrador' -AsSecureString
$env:ADMIN_PASSWORD = [Net.NetworkCredential]::new('', $adminSecret).Password
try {
    npm run admin:create
} finally {
    Remove-Item Env:ADMIN_PASSWORD
    Remove-Variable adminSecret
}
```

O comando recusa usuário existente e não redefine senha ou perfil. Contas antigas de demonstração permanecem no banco e precisam ser revisadas separadamente antes da implantação. Não registre senhas em comandos, logs ou Git.

## Executar

- Desenvolvimento: `NODE_ENV=development` e `npm run dev`.
- Produção: `NODE_ENV=production` e `npm start`.
- PM2: `pm2 start ecosystem.config.js` na pasta backend; o arquivo fixa produção, sem debug.
- Configure `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN` e atributos de cookie antes de iniciar.
- `CORS_ORIGIN` em produção é obrigatório: lista de origens HTTP/HTTPS exatas, separadas por vírgula, sem barra final ou caminho. Exemplo: `https://aoi.empresa.local`.
- Configure HTTPS interno e `COOKIE_SECURE=true` para a implantação definitiva. O frontend deve usar uma URL de API acessível pelos terminais.

As rotas DEMO `/api/debug/populate` e `/api/debug/clear` exigem sessão administradora válida e DEMO habilitado. `DEMO_ENABLED=true` habilita esses recursos também em produção; `DEMO_ENABLED=false` os desabilita. Se a variável não estiver definida, permanece a compatibilidade com `NODE_ENV=development` e `DEBUG_ROUTES_ENABLED=true`. O inicializador `Iniciar-Producao.bat` fixa produção, mantém `DEBUG_ROUTES_ENABLED=false` e habilita `DEMO_ENABLED=true` somente para administradores. A autorização consulta o perfil atual no banco. `/api/debug/seed-admin` continua removido em todos os ambientes. A limpeza remove somente o namespace reservado `DEMO-`, incluindo OMs, falhas, requisições, vínculos, entregas, inspeções, eventos, tabelas legadas e arquivos de exclusão dessas requisições.

O ícone DEMO da tabela do operador acrescenta 15 falhas, sem limpar os testes
anteriores. Cada clique padrão abre três OMs curtas novas, de `DEMO-001` a
`DEMO-999`, com cinco falhas por OM. Datas e horários são distribuídos nos últimos
30 dias e variam entre lotes para exercitar períodos e gráficos dos relatórios.
A quantidade por dia também varia, incluindo dias com mais ocorrências.
O serviço usa uma opção interna restrita a DEMO habilitado,
administrador autenticado e OMs `DEMO-`. Lançamentos normais
continuam recebendo exclusivamente a data do servidor. A inspeção da placa recebe
a mesma data simulada da falha. O timer da OM continua medindo a operação atual
de teste, não o período histórico fictício. A geração usa o mesmo serviço
dos lançamentos normais para gravar as falhas pendentes, o usuário autenticado e
as inspeções por OM/serial. Inclui exemplos Ausente, Danificado e Incorreto para
requisição e Possível Incorreto para conferência SMT. As requisições são criadas
pelo usuário na tabela, com as validações e proteção de duplicidade habituais.
Nos acessos rápidos ao estoque e reparo, ative DEMO para incluir essas OMs nas
consultas. O ensaio foi validado com administrador, incluindo entregas parcial e
total e seu histórico. Em produção, essas ações exigem a habilitação explícita
descrita acima e uma sessão administradora válida.

Ao clicar **Sair** com uma sessão administradora válida e DEMO habilitado,
`POST /api/auth/logout` limpa todos os dados DEMO compartilhados e revoga a sessão
na mesma transação. Isso inclui OMs ativas, pausadas e finalizadas. O cookie só é
limpo depois de confirmar a transação. Uma falha retorna 503, reverte a limpeza e
mantém a sessão para tentar novamente. Dados fora de `DEMO-` e contas são mantidos.
Vínculos cruzados entre requisições reais e falhas DEMO (ou o inverso) bloqueiam a
limpeza para preservar o material operacional. Sessões antigas, ausentes ou
inválidas não disparam exclusões. Saída de outros perfis e saída com DEMO
desabilitado continuam apenas encerrando a sessão. Fechar a aba não aciona essa limpeza.

### Exclusão de requisições

`DELETE /api/requisicoes/:id` exige `{ version, motivo }`, com motivo de 5 a 500
caracteres. O administrador pode excluir requisições com entregas, sem o bloqueio
anterior por chave estrangeira. O almoxarifado continua autorizado a excluir
pendências sem entrega/histórico. Os demais perfis não podem excluir requisições.
Uma transação confere a versão, arquiva a requisição, entregas e vínculos em
`exclusoes_requisicoes` com responsável, data e motivo, e remove a requisição
operacional. Falha no arquivo reverte toda a operação. A cópia histórica não tem
vínculo dependente da requisição excluída e permanece no banco para auditoria.

As falhas de origem permanecem e podem ser requisitadas novamente ou excluídas
depois de retirar a requisição vinculada. A exclusão não registra devolução física
de peças. A interface pede motivo e descreve essas consequências antes de enviar.
Clientes antigos sem versão/motivo precisam ser atualizados junto com a API.

## Verificações

```powershell
npm test -- --runInBand
npm run test:auth
npm run build
```

A suíte padrão configura ambiente isolado e simula Prisma nos testes de autenticação: não usa o banco do `.env`. Ela verifica cookies, acesso por perfil, bloqueio de debug, configuração de produção e bootstrap administrativo. Não substitui integração com PostgreSQL, restauração ou testes na fábrica.

Os antigos arquivos `performance_*.test.js` não fazem parte da suíte Jest padrão (`*.spec.js`); não são evidência de capacidade e não devem ser executados contra produção. `test:auth` agora executa a suíte de autenticação, em vez do placeholder legado.

`/health` verifica a API; `/health/db` verifica uma consulta ao banco. Os scripts `smoke:intranet`, `smoke:rbac` e `probe:intranet` operam sobre o endereço configurado e devem ser usados conscientemente em homologação.

O [plano por etapas](../docs/PLANO_IMPLEMENTACAO_INTRANET.md) registra as pendências antes de liberar operação oficial.

## Etapa 2: banco, sessões e integração

As novas migrações são aditivas: centralizam OMs preservando tabelas legadas, acrescentam versão aos registros e sessões, e vinculam registros às requisições novas. Faça backup/restore em homologação antes de executar `npm run db:migrate` em um banco existente. Estados legados ambíguos ou timestamps incompletos bloqueiam a migração de OMs para revisão.

OM finalizada permanece encerrada. Login antigo sem versão de sessão precisa ser renovado. Logout encerra todas as sessões daquela conta. Edite dados por versões atuais da interface: atualização de registro/status exige `version`, e lote de status exige `versions` por ID. Requisições agora retornam `{data, meta}`. Atualize UI e API na mesma entrega.

O teste de integração abaixo inicia e encerra uma instância local **descartável** com os componentes `@prisma/dev`/PGlite já fixados no lockfile. Nunca usa a URL do `.env`. As portas 55441–55443 devem estar livres. Não é teste de desempenho do PostgreSQL nativo:

```powershell
npm run test:integration:isolated
```

`DATABASE_POOL_MAX` aceita 1 a 50 conexões (padrão 10); use 1 com PGlite. Antes de levar dados legados à operação, reconcilie os pedidos de material anteriores à criação dos vínculos; a migração não infere quais registros os originaram.
