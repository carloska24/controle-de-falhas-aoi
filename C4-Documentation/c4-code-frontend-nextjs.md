# C4 Code Documentation - Next.js Frontend

## Overview

- **Name**: Next.js Frontend
- **Description**: Interface moderna do sistema de controle de falhas AOI.
- **Location**: `nextjs-frontend/`
- **Language**: TypeScript (React/Next.js)
- **Purpose**: Fornecer dashboards interativos, formulários de lançamento de falhas e análise de qualidade em tempo real.

## Code Elements

### app/operador/page.tsx

Página principal para operadores de linha.

- **checkAuth()**: Verifica a sessão local e valida com o backend `/api/auth/me`.
- **loadData()**: Busca registros de falhas via `/api/registros`.
- **loadOMs()**: Busca OMs ativas, pausadas e finalizadas.
- **omState**: Estado local que gerencia o timer (elapsed, isRunning, isPaused).
- **Atalhos de Teclado**:
  - `Espaço`: Pausa/Retoma OM.
  - `Ctrl+Enter`: Finaliza OM.
  - `Alt+S`: Inicia OM.

### app/qualidade/page.tsx

Dashboard analítico para administradores e qualidade.

- **calcularDPMOeSigma()**: Lógica matemática para calcular Defeitos por Milhão de Oportunidades e nível Sigma (IPC Standard).
- **Chart.js Integration**: Renderiza gráficos de tendência, Pareto de defeitos e análise por OM.
- **DPMO Configuration**: Permite configurar componentes por placa e pads SMD para cálculos precisos.

### components/index/

Componentes de negócio reutilizáveis.

- **ProTimer.tsx**: Exibe o timer da OM com efeitos visuais (shimmer).
- **ProForm.tsx**: Formulário complexo para lançamento de falhas e gestão de OMs.
- **ProTable.tsx**: Tabela interativa com ações em lote e exportação.
- **ProMetrics.tsx**: Exibe KPIs calculados em tempo real na barra lateral.

## Dependencies

- **Internas**: `@/lib/api.ts` (wrapper fetch), `@/hooks/useToast.ts`, `@/types/index.ts`
- **Externas**: `framer-motion`, `lucide-react`, `chart.js`, `tailwind-css`
