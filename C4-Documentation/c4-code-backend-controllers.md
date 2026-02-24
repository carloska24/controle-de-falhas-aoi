# C4 Code Documentation - Backend Controllers

## Overview

- **Name**: Backend Controllers
- **Description**: Conjunto de controladores que gerenciam a lógica de negócio da API Express.
- **Location**: `backend/src/controllers/`
- **Language**: JavaScript (Node.js)
- **Purpose**: Lidar com requisições HTTP, interagir com o banco de dados SQLite e retornar respostas formatadas para o frontend.

## Code Elements

### authController.js

Gerencia o ciclo de vida da sessão do usuário.

- **login(req, res)**:
  - **Parâmetros**: `req.body.username`, `req.body.password`
  - **Retorno**: JSON com dados do usuário e Cookie `aoi_token`.
  - **Descrição**: Valida credenciais usando bcrypt e gera um JWT.
- **logout(req, res)**:
  - **Descrição**: Limpa os cookies de autenticação e **remove dados de demonstração (DEMO-\*)** do banco de dados.
- **me(req, res)**:
  - **Descrição**: Retorna os dados do usuário autenticado contidos no token.

### omController.js

Principal controlador para gestão de Ordens de Manutenção e cronometragem.

- **startOM(req, res)**: Inicia o cronômetro para uma OM.
- **pauseOM(req, res)**: Pausa uma OM ativa, calculando o tempo decorrido.
- **resumeOM(req, res)**: Reinicia uma OM pausada.
- **finishOM(req, res)**: Finaliza a OM e salva o tempo total no banco.
- **getRelatorioFalhas(req, res)**: Gera dados para o relatório de falhas com filtros por OM, status e data.

### registroController.js

Gerencia o lançamento e atualização de falhas individuais.

- **listRegistros(req, res)**: Lista falhas com suporte a paginação e filtros.
- **createRegistrosBatch(req, res)**: Cria múltiplos registros de falha em uma única transação.
- **updateStatusBatch(req, res)**: Atualiza o status (reparado, pendente, etc.) de várias falhas.

### userController.js

Administração de usuários do sistema.

- **listUsers(req, res)**: Retorna todos os usuários (apenas Admin).
- **createUser(req, res)**: Cria novo usuário com senha criptografada.

## Dependencies

- **Internas**: `../config/database.js`, `../middleware/auth.js`
- **Externas**: `jsonwebtoken`, `bcrypt`, `sqlite3`
