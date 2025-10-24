# Backend — instruções rápidas

Instruções mínimas para rodar o servidor de desenvolvimento e a suíte de testes.

Pré-requisitos

- Node.js 18+ instalado
- Git (opcional)

Instalação

1. Entre na pasta do backend:

```powershell
cd C:\Users\joaob\OneDrive\Documentos\BRANCH\controle-de-falhas-aoi\backend
```

2. Instale dependências:

```powershell
npm ci
```

# Backend — instruções completas (Windows / PowerShell)

Este README descreve como clonar o repositório, instalar dependências, executar a API em desenvolvimento e rodar a suíte de testes no Windows (PowerShell). Inclui exemplos de variáveis de ambiente usadas pelo projeto.

Pré-requisitos

- Node.js 18+ (ou 16+ compatível)
- npm (ou yarn)
- Git

Clone (no PC da empresa)

```powershell
git clone --branch meu-trabalho-local https://github.com/carloska24/controle-de-falhas-aoi.git
cd controle-de-falhas-aoi
```

ou, se preferir clonar a branch principal e depois trocar de branch:

```powershell
git clone https://github.com/carloska24/controle-de-falhas-aoi.git
cd controle-de-falhas-aoi
git fetch origin
git checkout meu-trabalho-local
```

Instalar dependências (backend)

```powershell
cd backend
npm ci
```

Se preferir usar `npm install` em vez de `npm ci`:

```powershell
npm install
```

Variáveis de ambiente essenciais (exemplos)

- `JWT_SECRET`: segredo para assinar JWTs (IMPORTANTE em produção — use um valor forte/secreto).
- `DEV_SEED_KEY`: chave usada pelas rotas de seed em desenvolvimento. Valor padrão usado no projeto: `local-dev-2024`.
- `PORT`: porta em que o backend irá rodar (padrão 3001).
- `CORS_ORIGIN`: origem permitida para CORS (ex.: `http://localhost:5500` ou URL do frontend).
- `COOKIE_SECURE`: `true` ou `false`. Em produção com HTTPS e cross-site cookies, use `true` e `COOKIE_SAMESITE=None`.
- `NODE_ENV`: `development` (padrão) ou `production`.

Exemplo de como definir variáveis no PowerShell (session-local):

```powershell
# Definir temporariamente no terminal (apenas para a sessão atual)
$env:JWT_SECRET = "uma-senha-fraca-para-dev"
$env:DEV_SEED_KEY = "local-dev-2024"
$env:PORT = '3001'
$env:CORS_ORIGIN = 'http://localhost:5500'
$env:COOKIE_SECURE = 'false'
$env:NODE_ENV = 'development'
```

Rodando o servidor em desenvolvimento

1. A partir da pasta `backend` (após `npm ci`):

```powershell
npm run dev
```

Esse script usa nodemon para reiniciar automaticamente quando arquivos mudam. Deixe o terminal aberto para ver logs.

Verificando saúde da API (em outro terminal):

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3001/health | ConvertFrom-Json
```

Resposta esperada: JSON contendo algo como { "status": "ok", "time": "..." }

Rodando os testes

```powershell
# a partir da raiz do repositório
npm --prefix backend test -- --detectOpenHandles -i
```

Ou diretamente dentro de `backend`:

```powershell
cd backend
npm test -- --detectOpenHandles -i
```

Notas de segurança e produção

- Em produção, configure `JWT_SECRET` com um valor forte e não commitado.
- Para suportar cookies cross-site (frontend hospedado em outro domínio), configure:
  - `COOKIE_SECURE=true`
  - `COOKIE_SAMESITE=None`
  - Sirva via HTTPS
- Rotas de debug/seed são protegidas por `DEV_SEED_KEY` e devem ser desabilitadas em `NODE_ENV=production`.

CI

- Existe um workflow de GitHub Actions em `.github/workflows/backend-tests.yml` que executa os testes do backend. Configure secrets no repositório para `JWT_SECRET` em ambientes sensíveis.

Erros comuns e soluções rápidas

- "Impossível conectar-se ao servidor remoto" ao acessar `/health`: verifique se o servidor está em execução no terminal onde você rodou `npm run dev`.
- Testes Jest travando por handles abertos: o projeto já aplica `.unref()` em timers e exporta `initApp()` para testes; execute com `--detectOpenHandles` para detectar fontes.

Scripts úteis (resumo)

- `npm run dev` — iniciar servidor em modo dev (nodemon).
- `npm test` — rodar testes (backend).

Ajuda / contato

- Se quiser, posso gerar um script PowerShell de setup (instala dependências e define variáveis temporárias) ou um arquivo `.env.example` com os valores mínimos. Diga qual prefere.

---

Arquivo gerado automaticamente com instruções ampliadas para facilitar setup no Windows (PowerShell).

# Organização de Pastas e Scripts do Backend

A estrutura do backend foi organizada para facilitar manutenção e localização de arquivos:

- **logs/**: Arquivos de log do backend (erros, saídas, logs do servidor, etc).
  - **logs/old/**: Logs antigos e backups.
- **bin/**: Scripts utilitários e de setup, como scripts de simulação, reset de admin, inicialização e arquivos auxiliares (`*.ps1`, `*.bat`, `*.json`).
- **queries/**: Scripts de consulta, listagem e remoção de dados do banco (ex: `listar_oms.js`, `remover_om.js`, etc).
- **scripts/**: Scripts de manutenção e automação do backend.
  - **scripts/extra/**: Scripts de limpeza de OMs pouco usados ou redundantes.
  - **scripts/legacy/**: Scripts antigos ou obsoletos, mantidos apenas para referência.

> Mantenha apenas arquivos essenciais na raiz do backend. Use as subpastas para organizar logs, utilitários e scripts de manutenção.

Se mover ou criar novos scripts, siga esse padrão para manter o projeto limpo e fácil de entender.
