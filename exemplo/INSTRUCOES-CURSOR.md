# 🤖 Instruções para Cursor AI - Criar Novo Projeto

Este documento contém instruções específicas para o **Cursor AI** seguir ao criar um novo projeto baseado nos padrões definidos.

## 🎯 Quando Usar Este Documento

Quando o usuário solicitar:
- "Crie um novo projeto"
- "Inicie um novo sistema"
- "Crie um projeto do zero"
- Qualquer variação similar

## 📋 Checklist de Criação

### 1. Estrutura de Pastas

Crie a seguinte estrutura:

```
[nome-projeto]/
├── nextjs-frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   └── postcss.config.js
│
└── backend/
    ├── server.js
    ├── database.js
    ├── queries/
    ├── scripts/
    ├── tests/
    ├── package.json
    └── .env.example
```

### 2. Package.json do Frontend

Crie `nextjs-frontend/package.json`:

```json
{
  "name": "[nome-projeto]-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0",
    "dev:local": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
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

### 3. Package.json do Backend

Crie `backend/package.json`:

```json
{
  "name": "[nome-projeto]-backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node -r dotenv/config server.js",
    "dev": "nodemon -r dotenv/config --ext js,json,env server.js",
    "test": "jest"
  },
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
  },
  "jest": {
    "testEnvironment": "node",
    "testTimeout": 20000,
    "testMatch": ["**/?(*.)+(spec).js"]
  }
}
```

### 4. Arquivos de Configuração

#### `nextjs-frontend/tsconfig.json`

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

#### `nextjs-frontend/tailwind.config.ts`

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

#### `nextjs-frontend/next.config.js`

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

#### `nextjs-frontend/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 5. `nextjs-frontend/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-dark: #0f172a;
  --panel: #1e293b;
  --text: #e5e7eb;
  --text-dim: #94a3b8;
  --primary: #22c55e;
  --border-color: #334155;
  --metal-contact: #aeb2b5;
}

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

### 6. `nextjs-frontend/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '[Nome do Projeto]',
  description: 'Descrição do projeto',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

### 7. `nextjs-frontend/app/page.tsx`

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-white">Bem-vindo ao [Nome do Projeto]</h1>
    </div>
  );
}
```

### 8. Componentes UI Base

Crie pelo menos estes componentes em `nextjs-frontend/components/ui/`:

- `Button.tsx` - Botão reutilizável
- `Input.tsx` - Campo de entrada
- `Toast.tsx` - Sistema de notificações

### 9. Comandos para Executar

Após criar os arquivos, execute:

```bash
# Frontend
cd nextjs-frontend
npm install
npm run dev

# Backend (em outro terminal)
cd backend
npm install
npm run dev
```

## 🎨 Padrões de Estilo a Seguir

1. **Cores:**
   - Background: `bg-slate-950` ou `bg-[var(--bg-dark)]`
   - Painéis: `bg-slate-900`
   - Texto: `text-white` ou `text-slate-400`
   - Primário: `text-green-500` ou `bg-green-500`

2. **Fontes:**
   - Corpo: Inter
   - Títulos: Poppins
   - Código: Roboto Mono

3. **Animações:**
   - Usar Framer Motion
   - Padrão: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`

4. **Componentes:**
   - Sempre tipar props
   - Usar `'use client'` quando necessário
   - Organizar imports conforme padrão

## ✅ Checklist Final

Antes de finalizar, verifique:

- [ ] Todas as dependências instaladas
- [ ] Arquivos de configuração criados
- [ ] `globals.css` com variáveis CSS
- [ ] Layout principal funcionando
- [ ] Frontend rodando em `http://localhost:3000`
- [ ] Backend rodando em `http://localhost:3001`
- [ ] Estrutura de pastas correta
- [ ] TypeScript configurado corretamente
- [ ] Tailwind CSS funcionando

## 📝 Nota Importante

**SEMPRE** consulte o arquivo `PADRAO-PROJETO.md` para detalhes completos sobre padrões, tecnologias e boas práticas.

---

**Última atualização:** Janeiro 2025

