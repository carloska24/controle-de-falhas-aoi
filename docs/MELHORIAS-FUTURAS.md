# Relatório de Melhorias Sugeridas: Controle de Falhas AOI

Este relatório apresenta sugestões de melhoria contínua (Kaizen) e evolução arquitetural para tornar o sistema mais robusto, seguro e fácil de manter.

## 1. Segurança e Prova de Erros (Poka-Yoke)

### [CRÍTICO] Hardening de Autenticação

- **O Problema**: `JWT_SECRET` possui um valor padrão no código.
- **Melhoria**: Tornar a variável de ambiente obrigatória; o backend não deve iniciar se o segredo não estiver definido com força suficiente.
- **Técnica**: Fail-fast (Kaizen).

### [IMPORTANTE] Migração para TypeScript no Backend

- **O Problema**: Backend em JS puro permite erros de tipagem em tempo de execução que são difíceis de rastrear.
- **Melhoria**: Converter o backend para TypeScript para garantir contratos de dados estritos entre controladores e banco de dados.
- **Técnica**: Poka-Yoke por Design.

---

## 2. Manutenibilidade e Arquitetura

### [IMPORTANTE] Refatoração de Fat Pages (Operador)

- **O Problema**: `app/operador/page.tsx` possui quase 800 linhas, misturando lógica de timer, teclado, UI e API.
- **Melhoria**: Extrair a lógica do timer para um Custom Hook (`useOMTimer`) e a gestão de estado de falhas para outro (`useFalhas`).
- **Técnica**: Single Responsibility Principle (Architect Review).

### [NICE-TO-HAVE] Limpeza de Código Legado

- **O Problema**: A pasta `frontend/` (legado) ocupa espaço e pode confundir novos desenvolvedores.
- **Melhoria**: Remover a pasta legada após validar que todas as funcionalidades estão 100% no Next.js.
- **Técnica**: Eliminação de Muda (Desperdício) - Kaizen.

---

## 3. Confiabilidade e Performance

### [IMPORTANTE] Implementação de Testes Automatizados

- **O Problema**: Lógicas críticas (cálculo de DPMO/Sigma) não possuem testes de unidade.
- **Melhoria**: Adicionar Vitest ou Jest para testar as fórmulas matemáticas e os middlewares de permissão.
- **Técnica**: Standardized Work.

### [NICE-TO-HAVE] Migração para Banco de Dados Relacional (Postgres)

- **O Problema**: SQLite possui limitações de concorrência em ambientes de rede/cloud.
- **Melhoria**: Configurar o backend para suportar PostgreSQL em produção, mantendo SQLite apenas para dev.
- **Técnica**: Escalabilidade (Architect Review).

---

## 4. Plano de Ação Incremental (Abordagem Kaizen)

Para não interromper o fluxo de valor, as melhorias devem ser aplicadas em "ondas":

1. **Onda 1 (Segurança)**: Ajustar segredo JWT e validações básicas.
2. **Onda 2 (Refatoração)**: Extrair hooks no frontend para reduzir complexidade visual.
3. **Onda 3 (Qualidade)**: Adicionar os primeiros testes nas lógicas de cálculo.
4. **Onda 4 (Evolução)**: Migrar backend para TS e Banco para Postgres.

---

**Conclusão**: O projeto está em um ótimo estado funcional. Estas melhorias visam levar a solução de um "protótipo avançado" para um "sistema nível enterprise".
