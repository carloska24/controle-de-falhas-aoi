# Informações do Site e Deploy

Este documento centraliza as informações do site e como ele é publicado hoje, além de um passo‑a‑passo para configurar um domínio próprio no futuro.

## Onde está rodando hoje

- Frontend (site): Netlify
  - URL atual: https://stately-fairy-2fee40.netlify.app
  - Publica automaticamente a pasta `frontend/` em cada push no branch `main` (via `netlify.toml`).
- Backend (API): Render
  - URL atual: https://controle-de-falhas-aoi.onrender.com
  - Serviço Node/Express com banco PostgreSQL do Render.

## Fluxo de deploy atual

- Ao fazer `git push` no branch `main`:
  - Netlify: publica o frontend automaticamente (Auto publishing ON) usando `netlify.toml`:
    - publish = `frontend`
    - command = vazio (site estático puro)
  - Render: se o serviço estiver com Auto Deploy ligado para `main`, também publica a API automaticamente; se não, usar “Manual Deploy / Clear cache & deploy”.

## Variáveis de ambiente importantes (Render)

- `NODE_ENV=production` — obrigatório em produção.
- `JWT_SECRET` — segredo forte para assinar tokens JWT (obrigatório em produção).
- `CORS_ORIGIN` — lista de origens permitidas, separadas por vírgula. Ex.:
  - `https://stately-fairy-2fee40.netlify.app`
  - Inclua também domínios futuros (apex e www) quando habilitar domínio próprio.
- `DATABASE_URL` — string de conexão do PostgreSQL do Render.
- (Opcional) `DEMO_AUTO_PURGE_DAYS=7` — remove automaticamente dados DEMO mais antigos que N dias.

Um arquivo de exemplo foi adicionado: `backend/.env.render.example`.

## Como ficará quando usar domínio próprio (opcional/futuro)

Objetivo sugerido:
- Site (frontend): `https://controleaoicad.com` (apex) e `https://www.controleaoicad.com`
- API (backend): `https://api.controleaoicad.com`

Passos quando decidir:
1) Registrar o domínio (ex.: controleaoicad.com) em um registrador (Cloudflare Registrar, Porkbun, Namecheap…).
2) Netlify (Site settings → Domain management → Add custom domain):
   - Opção A: usar Netlify DNS (trocar nameservers no registrador). O Netlify cuida do apex e do www e emite SSL automático.
   - Opção B: manter DNS no registrador e criar registros:
     - `www` → CNAME para o subdomínio do Netlify (ex.: `stately-fairy-2fee40.netlify.app`).
     - `controleaoicad.com` (apex): usar ALIAS/ANAME para o host do Netlify; se o DNS não suportar, usar IPs do load balancer do Netlify (ver doc atualizada do Netlify).
3) Render (Settings → Custom Domains):
   - Adicionar `api.controleaoicad.com` e criar um CNAME no DNS apontando para `SEU-SERVICO.onrender.com`. SSL é emitido automaticamente.
4) Render (Environment):
   - Atualizar `CORS_ORIGIN` para incluir:
     - `https://controleaoicad.com, https://www.controleaoicad.com`
     - (se usar subdomínio da API) não é necessário incluir o próprio `api.controleaoicad.com` em CORS; inclua apenas as origens do site.
5) Frontend:
   - Mantendo a configuração atual, o frontend usa diretamente a URL pública da API. Se criar `api.controleaoicad.com`, podemos atualizar a base da API no frontend para esse subdomínio — ou usar um proxy no Netlify (ver abaixo).

### Alternativa: proxy /api no Netlify (sem CORS)

Se preferir, dá para proxyar as chamadas para a API via Netlify, evitando CORS. Exemplo de bloco (opcional) no `netlify.toml`:

```toml
# Exemplo — NÃO está ativo por padrão
# [[redirects]]
#   from = "/api/*"
#   to = "https://controle-de-falhas-aoi.onrender.com/:splat"
#   status = 200
#   force = true
```

Nesse caso, o frontend chamaria `/api/...` em vez de `https://controle-de-falhas-aoi.onrender.com/...` e tudo ficaria same-origin pelo Netlify.

## Checklists úteis

- Pós‑push:
  - Netlify: ver Deploys → status “Published”.
  - Render: ver Deploys/Logs do serviço Node → build/deploy concluído.
- Saúde:
  - API: `https://controle-de-falhas-aoi.onrender.com/health` (ou `https://api.controleaoicad.com/health` quando existir).
- CORS:
  - Em produção, se ver erro CORS no console, inclua o domínio do site em `CORS_ORIGIN` no Render.
- SSL:
  - Netlify e Render emitem SSL automaticamente quando o DNS está correto.

## Estado atual (manter como está por enquanto)

- Continuamos publicando o site pelo Netlify (domínio `*.netlify.app`) e a API pelo Render.
- Quando decidir o domínio, seguimos os passos acima e eu atualizo os arquivos necessários (base da API no frontend ou proxy no Netlify) e as variáveis no Render.

---
Qualquer decisão futura (registrador escolhido, uso de Netlify DNS, subdomínio da API, proxy /api) me avise que eu aplico e valido tudo para você.
