# Guia de Comandos para Gerenciamento de OMs

Este documento contém todos os comandos disponíveis para listar, excluir e gerenciar OMs (Ordens de Manutenção) no sistema.

---

## ⚠️ INFORMAÇÕES IMPORTANTES

1. **O backend precisa estar PARADO** antes de executar qualquer script de exclusão (SQLite não suporta múltiplos acessos de escrita)
2. **Após qualquer exclusão, reinicie o backend** para que as mudanças sejam aplicadas na memória
3. **Faça backup** do arquivo `backend/aoi.db` antes de executar scripts de exclusão

---

## 📂 Como Executar os Comandos

### Passo 1: Abra o Terminal (PowerShell)

### Passo 2: Navegue até a **PASTA RAIZ** do projeto

```powershell
cd c:\Workspace\controle-de-falhas-aoi
```

### Passo 3: Pare o backend (se estiver rodando)

Pressione `Ctrl+C` no terminal onde o backend está executando

### Passo 4: Execute o comando desejado (veja abaixo)

### Passo 5: Reinicie o backend

```powershell
cd nextjs-frontend
npm run dev
```

---

## 📋 LISTAR OMs (Consultas - Não alteram dados)

Estes comandos apenas listam informações, podem ser executados com o backend rodando.

### Listar OMs Pausadas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/listar_oms_pausadas.js
```

Mostra todas as OMs que estão pausadas no sistema.

---

### Buscar OMs Específicas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/buscar_oms_especificas.js
```

---

## 🗑️ DELETAR OMs PAUSADAS

### Deletar TODAS as OMs Pausadas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_oms_pausadas.js
```

Remove **todas** as OMs da tabela `oms_pausadas`.

---

### Deletar UMA OM Pausada Específica

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_om_pausada_especifica.js 35084
```

Substitua `35084` pelo número da OM que deseja excluir.

---

### Deletar VÁRIAS OMs Pausadas Específicas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_om_pausada_especifica.js 35084 35370 12345
```

Passe os números das OMs separados por espaço.

---

## 🗑️ DELETAR OMs ATIVAS (Em Andamento)

### Deletar TODAS as OMs Ativas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_oms_ativas.js
```

Remove **todas** as OMs da tabela `oms_ativas`.

---

## 🗑️ DELETAR OMs FINALIZADAS

### Deletar TODAS as OMs Finalizadas

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_todas_oms_mem.js
```

Remove **todas** as OMs da tabela `oms_finalizadas`.

---

### Deletar OMs Finalizadas por Status

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/cleanup_oms_finalizadas_mem.js
```

---

## 🧹 LIMPEZA GERAL DO SISTEMA

### Limpar TODOS os Registros de Defeitos

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/deletar_todos_registros.js
```

Remove todos os registros de defeitos da tabela `registros`.

---

### Limpar Requisições

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/cleanup_requisicoes.js
```

Remove todas as requisições de componentes.

---

### ⚠️ Limpar BANCO DE DADOS COMPLETO

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/clean_db.js
```

**CUIDADO**: Este comando limpa TODAS as tabelas do banco, incluindo:

- OMs finalizadas
- OMs pausadas
- OMs ativas
- Registros
- Requisições

---

## 📊 Tabela Resumo dos Comandos

| O que deletar           | Comando                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| OMs Pausadas (todas)    | `node backend/scripts/deletar_oms_pausadas.js`                   |
| OM Pausada (específica) | `node backend/scripts/deletar_om_pausada_especifica.js <numero>` |
| OMs Ativas (todas)      | `node backend/scripts/deletar_oms_ativas.js`                     |
| OMs Finalizadas (todas) | `node backend/scripts/deletar_todas_oms_mem.js`                  |
| Registros (todos)       | `node backend/scripts/deletar_todos_registros.js`                |
| Requisições (todas)     | `node backend/scripts/cleanup_requisicoes.js`                    |
| **TUDO**                | `node backend/scripts/clean_db.js`                               |

> **Lembre-se**: Todos os comandos devem ser executados a partir da pasta raiz: `c:\Workspace\controle-de-falhas-aoi`

---

## 🔧 Scripts Extras

Scripts adicionais disponíveis em `backend/scripts/extra/`:

| Script                           | Descrição                               |
| -------------------------------- | --------------------------------------- |
| `cleanup_oms_mem_especificas.js` | Deletar OMs específicas (edite o array) |
| `cleanup_oms_mem_finalizadas.js` | Deletar todas as OMs finalizadas        |
| `cleanup_oms_mem_iniciadas.js`   | Deletar OMs iniciadas                   |
| `cleanup_oms_mem_todas.js`       | Deletar TODAS as OMs                    |

Exemplo:

```powershell
cd c:\Workspace\controle-de-falhas-aoi
node backend/scripts/extra/cleanup_oms_mem_todas.js
```

---

## 📝 Fluxo Completo para Exclusão Segura

1. **Pare o backend** (Ctrl+C)
2. **Faça backup** do banco:
   ```powershell
   copy backend\aoi.db backend\aoi_backup.db
   ```
3. **Execute o comando** de exclusão desejado
4. **Reinicie o backend**:
   ```powershell
   cd nextjs-frontend
   npm run dev
   ```
5. **Verifique** se a exclusão foi aplicada no sistema

---

_Última atualização: Dezembro 2024_
