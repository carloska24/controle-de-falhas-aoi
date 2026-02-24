# C4 Code Documentation - Backend Entry Point

## Overview

- **Name**: Server Entry Point
- **Description**: Ponto de entrada principal da aplicação backend Express.
- **Location**: `backend/server.js`
- **Language**: JavaScript (Node.js)
- **Purpose**: Configurar middlewares, montar rotas e iniciar o servidor HTTP.

## Code Elements

### server.js

Configuração global do servidor.

- **Main Middleware Stack**:
  - `cors`: Configurado dinamicamente para permitir acessos locais/intranet.
  - `express.json()`: Parsing de corpo de requisição.
  - `cookieParser()`: Gestão de tokens JWT em cookies.
- **Route Mounting**:
  - `/api/auth`: `authRoutes`
  - `/api/users`: `userRoutes`
  - `/api/registros`: `registroRoutes`
  - `/api/om`: `omRoutes`
- **startServer()**:
  - **Descrição**: Função assíncrona que inicializa o banco de dados, carrega OMs pausadas para a memória e inicia o listener na porta especificada.

## Dependencies

- **Internas**: `./src/config/database`, `./src/routes/*`, `./src/controllers/omController`
- **Externas**: `express`, `cors`, `dotenv`, `cookie-parser`
