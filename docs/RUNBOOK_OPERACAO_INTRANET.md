# Runbook de Operação - Intranet (Controle de Falhas AOI)

Este runbook foca em ambiente interno de empresa (sem deploy cloud), com operação estável 24/7 na rede local.

## 1) Objetivo operacional

- Manter backend e frontend disponíveis continuamente para as estações da fábrica.
- Evitar quedas por reinício do Windows, troca de IP, falha de banco ou configuração CORS.
- Padronizar reação rápida para incidentes.

## 2) Topologia recomendada (LAN)

- Servidor interno com IP fixo (ou DHCP reservado), por exemplo: `192.168.0.50`.
- Backend em `http://192.168.0.50:3001`.
- Frontend em `http://192.168.0.50:3000`.
- Banco PostgreSQL no mesmo host ou servidor interno dedicado.

## 3) Variáveis de ambiente mínimas (backend/.env)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/aoi_db?schema=public
JWT_SECRET=CHAVE_FORTE_32_CARACTERES_OU_MAIS
CORS_ORIGIN=http://192.168.0.50:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=Lax
DEBUG_ROUTES_ENABLED=false
```

Notas:
- Em intranet HTTP, `COOKIE_SECURE=false` é esperado.
- `JWT_SECRET` é obrigatório.
- Em produção interna, debug deve ficar desativado por padrão.

## 4) Firewall e rede (Windows)

Liberar portas de entrada no servidor:
- TCP 3000 (frontend)
- TCP 3001 (backend)
- TCP 5432 (PostgreSQL), somente se o banco for remoto na LAN

Validar de outra máquina da rede:
- `http://IP_SERVIDOR:3000` (frontend)
- `http://IP_SERVIDOR:3001/health` (api)
- `http://IP_SERVIDOR:3001/health/db` (api + banco)

## 5) Operação com PM2 (obrigatório)

No servidor:

```bash
pm2 start server.js --name "Aoi_Backend" --cwd "C:\caminho\projeto\backend"
pm2 start npm --name "Aoi_Frontend" --cwd "C:\caminho\projeto\frontend" -- run start
pm2 save
```

Verificações:
- `pm2 status`
- `pm2 logs Aoi_Backend --lines 100`
- `pm2 logs Aoi_Frontend --lines 100`

## 6) Checklist de virada para produção interna

- [ ] IP fixo/DHCP reservado aplicado.
- [ ] Backend e frontend sob PM2.
- [ ] Portas liberadas no firewall.
- [ ] `JWT_SECRET` forte configurado.
- [ ] `CORS_ORIGIN` apontando para URL do frontend na LAN.
- [ ] `DEBUG_ROUTES_ENABLED=false`.
- [ ] `/health` e `/health/db` respondendo OK.
- [ ] Login com cada perfil validado (`admin`, `operator`, `reparo`, `qualidade`, `almoxarifado`, `lider_smt`).

## 7) Rotina diária (5 minutos)

1. Conferir `pm2 status`.
2. Conferir `/health` e `/health/db`.
3. Testar login rápido com usuário operacional.
4. Verificar espaço em disco e crescimento de logs.

## 8) Incidentes comuns e resposta

### 8.1 Frontend abre, mas não carrega dados
- Verificar `CORS_ORIGIN` e URL base da API.
- Conferir backend em `http://IP:3001/health`.
- Conferir autenticação e expiração de sessão.

### 8.2 API fora do ar após reinício do servidor
- Rodar `pm2 resurrect` (se necessário).
- Confirmar serviço de startup do PM2 no Windows.

### 8.3 Erro de banco
- Testar `http://IP:3001/health/db`.
- Verificar `DATABASE_URL`.
- Confirmar PostgreSQL ativo e acessível.

### 8.4 Lentidão em horário de pico
- Verificar uso de CPU/RAM da máquina host.
- Conferir logs e endpoint mais chamado.
- Considerar índices de banco nos filtros mais usados (`om`, `status`, `createdat`, `operador`).

## 9) Janela de manutenção segura

1. Avisar operação sobre janela curta.
2. `pm2 stop Aoi_Frontend` e `pm2 stop Aoi_Backend`.
3. Atualizar código e dependências.
4. Rodar validação básica (`npm run build` frontend, smoke de login).
5. `pm2 restart Aoi_Backend` e `pm2 restart Aoi_Frontend`.
6. Validar `/health`, `/health/db` e login.

## 10) Próximas melhorias recomendadas (foco intranet)

- Criar script de smoke test local para login + fluxo mínimo.
- Implementar rotação de logs.
- Padronizar backup e teste de restauração do PostgreSQL mensal.
- Documentar procedimento de rollback de versão.

## 11) Smoke test intranet (automatizado)

O backend possui script de verificação rápida:

```bash
cd backend
$env:SMOKE_BASE_URL="http://192.168.0.50:3001"
$env:SMOKE_USER="usuario_teste"
$env:SMOKE_PASSWORD="senha_teste"
npm run smoke:intranet
```

O teste valida:
- `/health`
- `/health/db`
- login com cookie `aoi_token`
- `/api/auth/me`
- `/api/registros` (consulta básica autenticada)
- logout

Validação de permissões por perfil:

```bash
cd backend
$env:SMOKE_BASE_URL="http://192.168.0.50:3001"
$env:SMOKE_USER="usuario_do_perfil"
$env:SMOKE_PASSWORD="senha_do_perfil"
npm run smoke:rbac
```

Repita para cada role de produção (admin, operator, reparo, qualidade, almoxarifado, lider_smt).

## 12) Sonda de estabilidade e latência (rede interna)

Use o script abaixo para medir disponibilidade e latência da API/banco na LAN:

```bash
cd backend
$env:PROBE_BASE_URL="http://192.168.0.50:3001"
$env:PROBE_ITERATIONS="30"
$env:PROBE_INTERVAL_MS="1000"
$env:PROBE_TIMEOUT_MS="4000"
npm run probe:intranet
```

Critério mínimo recomendado:
- Disponibilidade >= 99% em `/health`
- Disponibilidade >= 99% em `/health/db`
