# 🎯 Padrão de Projeto - Sistema Base

Este documento define os padrões, tecnologias e estruturas que devem ser utilizados em **TODOS** os novos projetos criados a partir deste sistema base.

## 📋 Índice

1. [Tecnologias Principais](#tecnologias-principais)
2. [Estrutura de Projeto](#estrutura-de-projeto)
3. [Dependências Obrigatórias](#dependências-obrigatórias)
4. [Padrões de Estilo (CSS/Tailwind)](#padrões-de-estilo-csstailwind)
5. [Padrões de Código TypeScript/React](#padrões-de-código-typescriptreact)
6. [Configurações de Arquivos](#configurações-de-arquivos)
7. [Arquitetura de Componentes](#arquitetura-de-componentes)
8. [Instruções para Cursor AI](#instruções-para-cursor-ai)

---

## 🚀 Tecnologias Principais

### Frontend
- **Framework:** Next.js 16+ (App Router)
- **Linguagem:** TypeScript 5+
- **Estilização:** Tailwind CSS 3.4+
- **Animações:** Framer Motion 11+
- **Ícones:** Lucide React
- **Tabelas:** TanStack React Table
- **Gráficos:** Chart.js + React Chart.js 2
- **Utilitários:** 
  - `clsx` para classes condicionais
  - `tailwind-merge` para merge de classes Tailwind
  - `date-fns` para manipulação de datas

### Backend
- **Runtime:** Node.js (versão LTS)
- **Framework:** Express 5+
- **Banco de Dados:** SQLite3 (desenvolvimento) / PostgreSQL (produção)
- **Autenticação:** JWT (jsonwebtoken) + bcrypt
- **Validação:** Zod
- **Segurança:** CORS, cookie-parser, express-rate-limit
- **Logging:** Morgan

---

## 📁 Estrutura de Projeto

```
projeto/
├── nextjs-frontend/          # Frontend Next.js
│   ├── app/                   # App Router (Next.js 13+)
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Página inicial
│   │   ├── globals.css        # Estilos globais
│   │   ├── [modulos]/         # Módulos/páginas
│   │   └── login/             # Exemplo: página de login
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes UI base (Button, Input, etc)
│   │   └── [modulos]/         # Componentes por módulo
│   ├── lib/                   # Bibliotecas utilitárias
│   │   ├── api.ts             # Cliente API
│   │   └── utils.ts           # Funções utilitárias
│   ├── hooks/                 # Custom Hooks React
│   ├── types/                 # Tipos TypeScript
│   ├── public/                # Arquivos estáticos
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── next.config.js
│
└── backend/                   # Backend Express
    ├── server.js              # Servidor principal
    ├── database.js             # Configuração do banco
    ├── queries/                # Queries SQL
    ├── scripts/                # Scripts utilitários
    ├── tests/                  # Testes
    ├── package.json
    └── .env                    # Variáveis de ambiente
```

---

## 📦 Dependências Obrigatórias

### Frontend (`nextjs-frontend/package.json`)

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.21.3",
    "chart.js": "^4.4.4",
    "chartjs-adapter-date-fns": "^3.0.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.3.5",
    "lucide-react": "^0.400.0",
    "next": "^16.0.1",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^3.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5"
  }
}
```

### Backend (`backend/package.json`)

```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^5.1.0",
    "express-rate-limit": "^7.5.1",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.1",
    "node-fetch": "^2.7.0",
    "pg": "^8.16.3",
    "sqlite3": "^5.1.7",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^3.1.10",
    "supertest": "^6.3.3"
  }
}
```

---

## 🎨 Padrões de Estilo (CSS/Tailwind)

### 1. Variáveis CSS Globais (`globals.css`)

```css
:root {
  --bg-dark: #0f172a;        /* Background principal escuro */
  --panel: #1e293b;          /* Painéis/cards */
  --text: #e5e7eb;           /* Texto principal */
  --text-dim: #94a3b8;       /* Texto secundário */
  --primary: #22c55e;        /* Cor primária (verde) */
  --border-color: #334155;   /* Bordas */
  --metal-contact: #aeb2b5;  /* Elementos metálicos (se necessário) */
}
```

### 2. Fontes Google

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
```

**Uso:**
- **Inter:** Font principal (corpo de texto)
- **Poppins:** Títulos e destaques
- **Roboto Mono:** Código e valores numéricos
- **Roboto:** Textos alternativos

### 3. Reset CSS Básico

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: var(--bg-dark);
  color: var(--text);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 4. Configuração Tailwind (`tailwind.config.ts`)

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0f172a',
        'panel': '#1e293b',
        'text-dim': '#94a3b8',
        'primary': '#22c55e',
        'border-color': '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5. Padrões de Cores

**Backgrounds:**
- `bg-slate-950` ou `bg-[var(--bg-dark)]` - Background principal
- `bg-slate-900` - Background de painéis
- `bg-slate-800` - Background de cards

**Textos:**
- `text-white` ou `text-[var(--text)]` - Texto principal
- `text-slate-400` ou `text-[var(--text-dim)]` - Texto secundário
- `text-green-500` ou `text-[var(--primary)]` - Destaques/primário

**Bordas:**
- `border-slate-700` ou `border-[var(--border-color)]`

**Botões Primários:**
- `bg-gradient-to-r from-green-500 via-emerald-500 to-green-600`
- `hover:shadow-green-500/30`

### 6. Animações CSS

**Padrão para animações de componentes:**
- Sempre usar `animation-timing-function: linear` para movimento constante
- Evitar múltiplos keyframes intermediários que causem pausas
- Usar variáveis CSS para valores dinâmicos: `--start-rot`, `--end-rot`, `--drift`

---

## 💻 Padrões de Código TypeScript/React

### 1. Estrutura de Componente

```typescript
'use client'; // Se necessário (client component)

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconName } from 'lucide-react';

interface ComponentProps {
  // Props tipadas
}

export default function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Hooks
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Render
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-lg p-6"
    >
      {/* Conteúdo */}
    </motion.div>
  );
}
```

### 2. Nomenclatura

- **Componentes:** PascalCase (`UserForm.tsx`, `DataTable.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useAuth.ts`, `useData.ts`)
- **Utilitários:** camelCase (`api.ts`, `utils.ts`)
- **Tipos/Interfaces:** PascalCase (`UserData`, `ApiResponse`)

### 3. Imports Organizados

```typescript
// 1. React e Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Bibliotecas externas
import { motion } from 'framer-motion';
import { Icon } from 'lucide-react';

// 3. Componentes internos
import Button from '@/components/ui/Button';
import { Toast } from '@/components/Toast';

// 4. Utilitários e tipos
import { fetchData } from '@/lib/api';
import type { User } from '@/types';
```

### 4. Tratamento de Erros

```typescript
try {
  const data = await fetchData('/api/endpoint');
  // ...
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  showToast(message, 'error');
}
```

### 5. TypeScript Strict

- Sempre usar `strict: true` no `tsconfig.json`
- Tipar todas as props de componentes
- Usar `unknown` para erros catch
- Evitar `any` - usar tipos específicos

---

## ⚙️ Configurações de Arquivos

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

### `postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## 🏗️ Arquitetura de Componentes

### 1. Componentes UI Base (`components/ui/`)

Componentes reutilizáveis básicos:
- `Button.tsx` - Botões com variantes
- `Input.tsx` - Campos de entrada
- `Select.tsx` - Dropdowns
- `Dialog.tsx` - Modais
- `Toast.tsx` - Notificações
- `Badge.tsx` - Badges/etiquetas
- `Skeleton.tsx` - Loading states

### 2. Componentes de Módulo (`components/[modulo]/`)

Componentes específicos de cada módulo/funcionalidade.

### 3. Padrão de Botão

```typescript
import { motion } from 'framer-motion';
import { Icon } from 'lucide-react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  // ...
}

export default function Button({ variant = 'primary', ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        rounded-lg font-semibold transition-all
        ${variant === 'primary' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : ''}
        ${variant === 'secondary' ? 'bg-slate-800 text-white' : ''}
        ${variant === 'danger' ? 'bg-red-600 text-white' : ''}
      `}
      {...props}
    />
  );
}
```

---

## 🤖 Instruções para Cursor AI

### Ao Criar um Novo Projeto

Quando o usuário solicitar a criação de um novo projeto, você DEVE:

1. **Criar a estrutura de pastas conforme o padrão acima**

2. **Instalar todas as dependências do Frontend:**
```bash
cd nextjs-frontend
npm install next@^16.0.1 react@^18.3.1 react-dom@^18.3.1 typescript@^5 @types/node@^20 @types/react@^18 @types/react-dom@^18 tailwindcss@^3.4.4 postcss@^8.4.38 autoprefixer@^10.4.19 framer-motion@^11.3.5 lucide-react@^0.400.0 @tanstack/react-table@^8.21.3 chart.js@^4.4.4 react-chartjs-2@^5.2.0 chartjs-adapter-date-fns@^3.0.0 date-fns@^4.1.0 clsx@^2.1.1 tailwind-merge@^3.3.1
```

3. **Instalar todas as dependências do Backend:**
```bash
cd backend
npm install express@^5.1.0 cors@^2.8.5 dotenv@^16.6.1 cookie-parser@^1.4.6 jsonwebtoken@^9.0.2 bcrypt@^6.0.0 sqlite3@^5.1.7 pg@^8.16.3 zod@^3.25.76 express-rate-limit@^7.5.1 morgan@^1.10.1 node-fetch@^2.7.0 nodemon@^3.1.10 jest@^29.0.0 supertest@^6.3.3
```

4. **Criar arquivos de configuração:**
   - `nextjs-frontend/tsconfig.json` (conforme padrão)
   - `nextjs-frontend/tailwind.config.ts` (conforme padrão)
   - `nextjs-frontend/next.config.js` (conforme padrão)
   - `nextjs-frontend/postcss.config.js`
   - `nextjs-frontend/app/globals.css` (com variáveis CSS e fontes)

5. **Aplicar padrões de estilo:**
   - Usar variáveis CSS definidas em `:root`
   - Usar cores do tema (slate-900, green-500, etc)
   - Usar fontes: Inter (principal), Poppins (títulos), Roboto Mono (código)
   - Aplicar animações com Framer Motion
   - Usar Tailwind para estilização

6. **Estrutura de componentes:**
   - Criar `components/ui/` com componentes base
   - Organizar componentes por módulo em `components/[modulo]/`
   - Usar TypeScript com tipagem estrita
   - Seguir padrão de nomenclatura (PascalCase para componentes)

7. **Padrões de código:**
   - Sempre tipar props de componentes
   - Usar `'use client'` quando necessário
   - Organizar imports (React → Bibliotecas → Componentes → Utils)
   - Tratar erros adequadamente
   - Usar Framer Motion para animações
   - Usar Lucide React para ícones

### Comandos de Instalação Único

**Frontend (copie e cole):**
```bash
npm install next@^16.0.1 react@^18.3.1 react-dom@^18.3.1 typescript@^5 @types/node@^20 @types/react@^18 @types/react-dom@^18 tailwindcss@^3.4.4 postcss@^8.4.38 autoprefixer@^10.4.19 framer-motion@^11.3.5 lucide-react@^0.400.0 @tanstack/react-table@^8.21.3 chart.js@^4.4.4 react-chartjs-2@^5.2.0 chartjs-adapter-date-fns@^3.0.0 date-fns@^4.1.0 clsx@^2.1.1 tailwind-merge@^3.3.1
```

**Backend (copie e cole):**
```bash
npm install express@^5.1.0 cors@^2.8.5 dotenv@^16.6.1 cookie-parser@^1.4.6 jsonwebtoken@^9.0.2 bcrypt@^6.0.0 sqlite3@^5.1.7 pg@^8.16.3 zod@^3.25.76 express-rate-limit@^7.5.1 morgan@^1.10.1 node-fetch@^2.7.0
npm install --save-dev nodemon@^3.1.10 jest@^29.0.0 supertest@^6.3.3
```

---

## ✅ Checklist de Criação de Novo Projeto

- [ ] Estrutura de pastas criada
- [ ] Dependências do frontend instaladas
- [ ] Dependências do backend instaladas
- [ ] `tsconfig.json` configurado
- [ ] `tailwind.config.ts` configurado
- [ ] `next.config.js` configurado
- [ ] `globals.css` com variáveis CSS e fontes
- [ ] Componentes UI base criados
- [ ] Layout principal configurado
- [ ] API client configurado
- [ ] Autenticação configurada (se necessário)
- [ ] Banco de dados configurado
- [ ] Variáveis de ambiente configuradas

---

## 📝 Notas Importantes

1. **Sempre manter consistência:** Use os mesmos padrões de cores, fontes e estrutura em todo o projeto.

2. **Performance:** 
   - Use `'use client'` apenas quando necessário
   - Otimize imagens com Next.js Image
   - Use lazy loading para componentes pesados

3. **Acessibilidade:**
   - Sempre use `aria-label` em ícones
   - Mantenha contraste adequado de cores
   - Use `prefers-reduced-motion` para animações

4. **Segurança:**
   - Valide dados no backend com Zod
   - Use rate limiting
   - Proteja rotas sensíveis
   - Use HTTPS em produção

---

**Última atualização:** Janeiro 2025
**Versão do padrão:** 1.0.0

