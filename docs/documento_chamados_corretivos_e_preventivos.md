# 📘 Documento Funcional – Chamados de Manutenção

Este documento define **como devem ser estruturados, operados e executados** os **Chamados Corretivos** e **Chamados Preventivos** em um sistema de Gestão da Manutenção (CMMS), garantindo padronização, rastreabilidade, auditoria e boa experiência do técnico em campo.

---

## 🔧 PARTE 1 — CHAMADOS CORRETIVOS

### 🎯 Objetivo

Atender **falhas, quebras ou anomalias** já ocorridas no ativo, restaurando sua condição operacional no menor tempo possível.

---

### 1️⃣ Definição

Chamado Corretivo é aberto **após a ocorrência de um problema**, geralmente de forma reativa.

Exemplos:

- Equipamento parado
- Ruído anormal
- Vazamento
- Falha elétrica ou mecânica

---

### 2️⃣ Quando deve ser criado

- Falha detectada por operador
- Alarme do sistema
- Inspeção visual
- Reclamação de produção

---

### 3️⃣ Estrutura do Chamado Corretivo

#### 📦 Dados Gerais

- ID do chamado
- Tipo: `corretiva`
- Prioridade: baixa | média | alta | crítica
- Status: aberto | em execução | pausado | finalizado
- Data/hora de abertura

#### 🏭 Ativo

- ID do ativo
- Nome
- Código patrimonial
- Setor / Local

#### 📝 Descrição do Problema

- Campo obrigatório
- Texto livre
- Deve descrever **o sintoma**, não a solução

Exemplo correto:

> "Bomba apresentando ruído excessivo e aquecimento"

---

### 4️⃣ Checklist Corretivo (dinâmico)

Checklist **dependente do tipo de ativo** ou da falha.

Exemplo:

- Desligar equipamento
- Bloquear energia
- Identificar causa da falha
- Testar após reparo

Campos:

- ID do item
- Descrição
- Obrigatório (true/false)

---

### 5️⃣ Execução do Chamado Corretivo

Durante a execução, devem ser registrados:

#### ⏱ Controle de Tempo

- Início do atendimento
- Pausas
- Fim do atendimento
- Tempo total automático

#### 📝 Apontamentos do Técnico

- Causa raiz identificada
- Serviço executado
- Observações adicionais

#### 📷 Evidências

- Fotos antes e depois
- Quantidade mínima recomendada: 2

#### 📦 Peças Utilizadas (opcional)

- Código da peça
- Quantidade

---

### 6️⃣ Finalização do Chamado Corretivo

Campos obrigatórios:

- Resultado:
  - Resolvido
  - Parcial
  - Não resolvido
- Apontamento final obrigatório

Efeitos da finalização:

- Atualiza status do chamado
- Gera histórico do ativo
- Alimenta indicadores (MTTR, falhas)

---

### 7️⃣ Indicadores Gerados

- MTTR (Tempo médio de reparo)
- Quantidade de falhas por ativo
- Causas mais recorrentes

---

---

## 🛠️ PARTE 2 — CHAMADOS PREVENTIVOS

### 🎯 Objetivo

**Evitar falhas**, manter confiabilidade e aumentar a vida útil dos ativos.

---

### 1️⃣ Definição

Chamado Preventivo é criado **de forma planejada**, baseado em:

- Tempo
- Horas de uso
- Ciclos
- Plano de manutenção

---

### 2️⃣ Quando deve ser criado

- Agenda periódica (ex: mensal)
- Atingir horas de funcionamento
- Ordem de serviço programada

Normalmente criado **automaticamente pelo sistema**.

---

### 3️⃣ Estrutura do Chamado Preventivo

#### 📦 Dados Gerais

- ID do chamado
- Tipo: `preventiva`
- Prioridade: geralmente média ou baixa
- Status: aberto | em execução | finalizado
- Data programada

#### 🏭 Ativo

- ID do ativo
- Nome
- Código patrimonial
- Setor / Local

#### 📋 Plano de Manutenção

- ID do plano
- Descrição do plano
- Periodicidade

---

### 4️⃣ Checklist Preventivo (obrigatório)

Checklist é o **coração da preventiva**.

Exemplo:

- Limpar equipamento
- Lubrificar eixo
- Verificar folgas
- Medir vibração
- Registrar leitura

Todos os itens devem ser:

- Obrigatórios
- Quantificáveis quando possível

---

### 5️⃣ Execução do Chamado Preventivo

#### ⏱ Controle de Tempo

- Registro automático
- Normalmente sem pausas

#### 📝 Apontamentos

- Campo opcional
- Usado apenas se houver anomalia

#### 📷 Evidências

- Foto final obrigatória

---

### 6️⃣ Finalização do Chamado Preventivo

Resultado padrão:

- Executado conforme plano

Resultados alternativos:

- Executado com anomalia
- Não executado (justificar)

Campos obrigatórios:

- Checklist 100% concluído
- Observação se houver desvio

---

### 7️⃣ Indicadores Gerados

- Percentual de preventivas executadas
- Aderência ao plano
- Redução de corretivas

---

## 🧠 Diferenças-chave (Resumo)

| Item        | Corretivo    | Preventivo   |
| ----------- | ------------ | ------------ |
| Origem      | Falha        | Planejamento |
| Criação     | Manual       | Automática   |
| Checklist   | Flexível     | Obrigatório  |
| Apontamento | Obrigatório  | Opcional     |
| Evidência   | Recomendado  | Obrigatório  |
| Indicadores | MTTR, falhas | Aderência    |

---

## ✅ Conclusão

Separar **corretiva** e **preventiva** garante:

- Dados confiáveis
- Auditoria clara
- Boa UX para o técnico
- Indicadores reais

Este modelo é compatível com:

- ISO 9001
- ISO 55000
- Boas práticas CMMS/EAM

---

📌 Documento pronto para:

- Desenvolvimento
- Validação com manutenção
- Auditoria
- Treinamento de equipe

