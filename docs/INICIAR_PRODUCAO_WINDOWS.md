# Iniciar o AOI no Windows com um duplo clique

Na raiz do projeto, dê duplo clique em **Iniciar-Producao.bat**. Pode criar um atalho desse arquivo na área de trabalho; mantenha o arquivo original junto ao projeto.

O inicializador:

1. Confere as dependências, `backend/.env` e a build de produção em `frontend/.next`.
2. Conecta ao PostgreSQL configurado. Se o banco local estiver desligado, inicia a instalação portátil existente em `.tools/pgsql17/pgsql/bin`, usando os dados de `.tools/pgdata`.
3. Inicia backend e frontend em segundo plano, com `NODE_ENV=production`, sem executar migrações, seed ou limpeza de dados.
4. Confere a conexão do backend com o banco e a página de login antes de informar sucesso.
5. Abre `http://localhost:3000` no navegador padrão. A intranet continua usando a configuração de CORS e firewall existente.

Pode fechar a janela do inicializador. Os servidores continuam funcionando enquanto o computador estiver ligado. Após reiniciar o computador, execute o arquivo novamente. Um segundo duplo clique reutiliza as instâncias iniciadas por ele, sem duplicar processos.

## DEMO para administradores

Conforme solicitado, o atalho habilita `DEMO_ENABLED=true`, mantendo `DEBUG_ROUTES_ENABLED=false`. A criação e limpeza de DEMO exigem uma sessão administradora válida no backend; os demais perfis recebem 403. O botão de geração da tabela também fica visível somente para administradores.

As OMs fictícias continuam com prefixo reservado `DEMO-`. Ao clicar **Sair** com uma sessão administradora válida e DEMO habilitado, os dados DEMO compartilhados são limpos pela rotina existente; dados reais são preservados. Fechar a janela do inicializador ou o navegador não executa essa limpeza.

Se iniciar por outro método, configure `DEMO_ENABLED=true` no ambiente para permitir o mesmo comportamento. `DEMO_ENABLED=false` desabilita o recurso.

## Logs e erros

Os arquivos ficam em `.tools/production/` e são ignorados pelo Git:

- `backend.out.log` e `backend.err.log`;
- `frontend.out.log` e `frontend.err.log`;
- `postgresql.log`, quando o PostgreSQL foi iniciado pelo atalho;
- `servers.json`, com os PIDs das instâncias gerenciadas e identificadores da configuração/build, sem credenciais.

Se uma porta estiver ocupada por um servidor iniciado manualmente, o inicializador informa o conflito e não encerra esse processo. Feche essa instância antes de executar o arquivo. Quando houver uma nova build ou alteração de `.env`, encerre os processos indicados em `servers.json` antes de iniciar a nova versão; o inicializador não substitui uma versão em uso silenciosamente.

Para uma instalação PostgreSQL em outro caminho, configure no `backend/.env`:

```dotenv
AOI_POSTGRES_BIN=C:\caminho\postgresql\bin
AOI_POSTGRES_DATA=C:\caminho\dados-existentes
```

O inicializador não instala PostgreSQL e não cria um banco novo. Se a configuração apontar para um banco remoto indisponível ou credenciais inválidas, ele interrompe a inicialização com uma mensagem.

Depois de alterar o código do frontend, gere uma nova build antes de iniciar:

```powershell
cd frontend
npm run build
```

Para conferir a inicialização pelo terminal sem abrir o navegador:

```powershell
node scripts/start-production.cjs --no-browser
```

Este arquivo inicia os processos sob demanda. Ele não instala serviço do Windows, não inicia no boot e não substitui um supervisor que reinicie serviços após uma falha.
