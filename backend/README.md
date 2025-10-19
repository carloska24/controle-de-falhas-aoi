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

Rodando o servidor (desenvolvimento)

1. Defina a porta opcionalmente (padrão 3001 neste projeto):

```powershell
# $env:PORT = '3001'
```

2. Inicie o servidor em modo dev (nodemon) e deixe o terminal aberto para ver logs:

```powershell
npm run dev
```

Verifique a saúde da API em outro terminal:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3001/health | ConvertFrom-Json
# Deve retornar um JSON com { status: 'ok', time: '...' }
```

Rodando os testes

```powershell
# No diretório backend
npm test -- --detectOpenHandles -i
```

Notas e variáveis de ambiente úteis
- `DEV_SEED_KEY`: chave usada pela rota de seed em desenvolvimento (padrão: `local-dev-2024`).
- `JWT_SECRET`: definir um segredo real em produção.
- `COOKIE_SECURE`: se `true`, o cookie será enviado apenas via HTTPS (deve ser true em produção quando SameSite=None).

CI
- Há um workflow em `.github/workflows/backend-tests.yml` que roda `npm ci` e `npm --prefix backend test`.

Se algo falhar
- Cole a saída do terminal (logs) aqui para eu ajudar a diagnosticar.

---
Feito por automação para facilitar desenvolvimento e CI.
# Backend - instruções rápidas

Pré-requisitos:
- Node.js (v16+ recomendado)
- npm

Instalar dependências:

```powershell
cd backend
npm install
```

Iniciar servidor em modo de desenvolvimento:

```powershell
npm run dev
```

Rodar o teste de integração (auth cookie flow):

```powershell
# a partir da raiz do repositório
npm --prefix "backend" run test:auth
```

Notas de produção:
- Em produção, defina `JWT_SECRET` e `CORS_ORIGIN`.
- Para cross-site cookies, configure `COOKIE_SECURE=true` e `COOKIE_SAMESITE=None` e sirva via HTTPS.
- O backend aceita tanto cookie HttpOnly quanto header Authorization para compatibilidade durante a migração.
