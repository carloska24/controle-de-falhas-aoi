# Checklist de Aceite - Intranet (Go-Live Interno)

Use este checklist para homologar a entrega do sistema AOI em rede interna da empresa.

## 1) Infraestrutura de rede

- [ ] Servidor com IP fixo ou DHCP reservado.
- [ ] DNS interno (opcional) apontando para o servidor.
- [ ] Firewall liberado para TCP 3000 e 3001.
- [ ] Latência da rede local estável entre áreas de uso.

## 2) Banco de dados e segurança

- [ ] PostgreSQL ativo e estável.
- [ ] `DATABASE_URL` validado no backend.
- [ ] `JWT_SECRET` forte configurado.
- [ ] `DEBUG_ROUTES_ENABLED=false` em produção interna.
- [ ] Backup inicial validado (dump completo).

## 3) Serviços em execução contínua

- [ ] Backend rodando via PM2 (`Aoi_Backend`).
- [ ] Frontend rodando via PM2 (`Aoi_Frontend`).
- [ ] `pm2 save` executado.
- [ ] Inicialização automática pós-reboot testada.

## 4) Saúde técnica (API + DB)

- [ ] `GET /health` responde `200`.
- [ ] `GET /health/db` responde `200`.
- [ ] Sonda de estabilidade executada:
  - [ ] `npm run probe:intranet`
  - [ ] Disponibilidade >= 99% para `/health` e `/health/db`.

## 5) Testes funcionais por perfil (mínimo)

- [ ] `admin`: login, gestão de usuários, relatórios.
- [ ] `operator`: iniciar/pausar/retomar/finalizar OM, lançar falha.
- [ ] `reparo`: alterar status de registro, filtros e listagem.
- [ ] `qualidade`: acesso relatórios de qualidade e controle de falhas.
- [ ] `almoxarifado`: atualizar status/itens de requisição.
- [ ] `lider_smt`: conferência SMT e atualização de tipo de defeito.

## 6) Teste de permissões (RBAC)

- [ ] `npm run smoke:rbac` executado para cada perfil de produção.
- [ ] Nenhum perfil acessa endpoint fora da sua alçada.

## 7) Critérios de aceite final

- [ ] Sistema acessível de todas as áreas operacionais da fábrica.
- [ ] Sem erros críticos de autenticação/autorização.
- [ ] Sem travamentos em fluxos principais no turno de pico.
- [ ] Time local de suporte treinado para rotina diária.

## 8) Comandos operacionais úteis (PowerShell)

```powershell
# Status dos serviços
pm2 status

# Logs rápidos
pm2 logs Aoi_Backend --lines 100
pm2 logs Aoi_Frontend --lines 100

# Sonda de disponibilidade/latência
cd backend
$env:PROBE_BASE_URL="http://IP_DO_SERVIDOR:3001"
$env:PROBE_ITERATIONS="30"
$env:PROBE_INTERVAL_MS="1000"
npm run probe:intranet
```
