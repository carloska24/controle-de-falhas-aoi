# Arquitetura Geral do Sistema

---

## 1. Visão Geral

O sistema "Controle de Falhas AOI" é composto por dois grandes módulos:

- **Frontend**: SPA modular em HTML, CSS e JavaScript, com autenticação, controle de acesso por perfil, relatórios dinâmicos, exportação de dados e interface responsiva.
- **Backend**: API RESTful em Node.js/Express, com autenticação JWT, persistência em SQLite ou PostgreSQL, rotas protegidas, validação de dados (Zod), controle de logs, e scripts de manutenção.

---

## 2. Backend — Estrutura e Padrões

- **server.js**: Centraliza rotas, middleware, autenticação, controle de acesso, exportação de banco, persistência de OMs em memória, e inicialização do servidor.

  - Autenticação JWT via cookie HttpOnly
  - Controle de acesso por perfil (admin, operador, reparo, qualidade, almoxarifado)
  - Validação robusta com Zod
  - Persistência dinâmica: SQLite (dev/local) e PostgreSQL (produção)
  - Gerenciamento de OMs (em memória e banco)
  - CRUD de registros e requisições
  - Endpoints de relatórios e exportação
  - Rotas de debug/seed protegidas

- **database.js**: Bootstrap do SQLite, criação de tabelas, índices, seed de admin, helpers para queries assíncronas.

- **auth.test.js**: Testes automatizados de autenticação usando Jest/Supertest.

- **package.json**: Scripts para start/dev/test/export, dependências para API, banco, autenticação, testes, validação.

- **README.md**: Documentação detalhada para setup, variáveis de ambiente, scripts, estrutura de pastas, instruções para Windows/PowerShell.

---

## 3. Frontend — Estrutura e Integração

- Modularidade por tela: cada tela tem seu próprio HTML, JS e CSS.
- Autenticação integrada ao backend, uso de cookies HttpOnly, localStorage para metadados do usuário.
- Controle de acesso por perfil, redirecionamento e bloqueio de telas.
- Relatórios dinâmicos, exportação CSV, gráficos (Chart.js), filtros por OM/período.
- Utilitários centralizados em `utils.js`.
- UI responsiva, modais, toasts, animações, classes utilitárias inspiradas em Tailwind.

---

## 4. Padrões Avançados e Boas Práticas

- Validação robusta (Zod)
- Segurança: cookies HttpOnly, rate limit, CORS, bloqueio de rotas sensíveis
- Logs e debug por ambiente
- Testes automatizados
- Scripts de manutenção e setup

---

## 5. Pontos de Integração e Fluxos Críticos

- Login: POST `/api/auth/login` → cookie HttpOnly + user info → frontend armazena perfil/localStorage
- Registros: CRUD via `/api/registros`, batch, filtro por OM, exclusão de demos/admin
- Requisições: Criação/atualização/entrega via `/api/requisicoes`, agregação inteligente de itens
- OMs: Ciclo completo (start, pause, resume, finalizar), persistência em memória e banco, cálculo de tempo
- Relatórios: Endpoints para falhas e OMs finalizadas, frontend consome e exporta dados
- Admin: Gerenciamento de usuários, reset de senha, proteção contra exclusão do próprio admin

---

## 6. Pontos de Atenção e Oportunidades de Evolução

- Expansão de testes automatizados
- Monitoramento e logs estruturados
- Fortalecimento de políticas de segurança
- Otimização de performance e queries
- Automação de backup/restore e documentação de APIs

---

## 7. Conclusão

O projeto apresenta arquitetura sólida, modularidade, boas práticas de segurança e validação, integração eficiente entre frontend e backend, e estrutura pronta para manutenção e evolução. Recomenda-se expandir testes, monitoramento e documentação para garantir escalabilidade e robustez em produção.

---

## Sugestão

Se desejar, posso gerar diagramas de arquitetura, fluxogramas de integração, ou análises específicas de qualquer módulo ou fluxo do sistema. Basta solicitar o tipo de diagrama ou análise que deseja aprofundar.
