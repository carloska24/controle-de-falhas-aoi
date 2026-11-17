# Frontend Next.js - Controle de Falhas AOI

Este é o frontend migrado para **Next.js** mantendo comunicação com o **backend Express original**.

## Verificações da etapa de integridade

Na pasta `frontend`, execute `npm run test:api` para testar paginação completa,
falhas entre páginas, alterações observáveis no conjunto de dados, limite de
consulta, logout e distinção entre sessão expirada (401) e falta de permissão (403).
Os testes usam o runner do Node e o TypeScript já instalado; não consultam servidor
ou banco reais. Valide os tipos com `npx --no-install tsc --noEmit --incremental false`.

As filas e relatórios que ainda filtram no cliente só publicam o resultado após
carregar todas as páginas de registros/requisições (200 itens por requisição,
limite explícito de 10.000 itens). Metadados inválidos, mudança de total, IDs
repetidos ou páginas incompletas geram erro em vez de um resultado parcial.
Isso remove o corte silencioso em 50 itens, mas não é uma estratégia de escala
para todo o histórico da fábrica: filtros/agregações/exportação no servidor e
uma consulta com snapshot devem preceder a ampliação para grandes volumes.
Alterações concorrentes com o mesmo total e sem IDs repetidos podem não ser
detectadas entre páginas; a consulta não representa um snapshot transacional.

Todas as telas encerram a sessão pela API antes de limpar o estado local e
navegar para o login. Falhas de rede ou de revogação são exibidas na tela atual.
Edições de registros e ações de reparo enviam a versão recebida do servidor;
conflitos exigem atualizar a lista, preservando alterações feitas em outro terminal.

## 🎯 Estrutura

```
nextjs-frontend/
├── app/                    # Páginas do Next.js (App Router)
│   ├── login/page.tsx      # Página de login migrada
│   ├── admin/page.tsx     # Página admin migrada
│   ├── layout.tsx          # Layout raiz
│   └── globals.css         # Estilos globais (inclui animação SMD)
├── components/             # Componentes React
│   ├── SMDAnimation.tsx    # Animação de componentes caindo ao fundo
│   └── Toast.tsx           # Notificações
├── hooks/                  # React Hooks customizados
│   └── useToast.ts         # Hook para toast notifications
└── lib/                    # Utilitários
    └── api.ts              # Configuração da API (comunicação com backend)
```

## ✨ Funcionalidades Preservadas

✅ **Animação SMD ao fundo** - Componentes eletrônicos caindo (exatamente como o original)  
✅ **Design escuro** - Mantém todas as cores e estilos  
✅ **Comunicação com backend** - Usa o backend Express na porta 3001  
✅ **Autenticação** - Cookies HttpOnly funcionando normalmente  

## 🚀 Como Rodar

### 1. Instalar dependências

```bash
cd nextjs-frontend
npm install
```

### 2. Garantir que o backend está rodando

O backend Express deve estar rodando na porta **3001**:
```bash
cd ../backend
npm run dev
```

### 3. Rodar o frontend Next.js

```bash
# Na pasta nextjs-frontend
npm run dev
```

O frontend Next.js rodará na porta **3000** e se comunicará automaticamente com o backend na porta 3001.

### 4. Acessar

- Frontend Next.js: http://localhost:3000
- Login: http://localhost:3000/login
- Admin: http://localhost:3000/admin (após login como admin)

## 🔧 Configuração

### Variáveis de Ambiente (opcional)

Crie um arquivo `.env.local` na pasta `nextjs-frontend`:

```env
# URL do backend (padrão: http://localhost:3001)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Ou em produção:
# NEXT_PUBLIC_API_URL=https://seu-backend.onrender.com
```

## 📝 Diferenças do Original

- **React Components** ao invés de HTML puro
- **TypeScript** para type safety
- **Framer Motion** para animações de toast
- **Lucide React** para ícones (mesmos visuais)
- **Tailwind CSS** para estilos (mantém design original)

## 🎨 Componentes Visuais Mantidos

1. **Animação SMD** - Componentes caindo ao fundo (preservado 100%)
2. **Logo SVG** - Mesmo logo do original
3. **Cores e tema** - Design escuro idêntico
4. **Formulários** - Mesma validação e estilos

## 🔄 Próximos Passos

- [ ] Migrar página principal (index)
- [ ] Migrar páginas de relatórios
- [ ] Migrar página de reparo
- [ ] Migrar página de almoxarifado

## 📦 Dependências Principais

- `next` - Framework React
- `react` / `react-dom` - Biblioteca React
- `framer-motion` - Animações
- `lucide-react` - Ícones
- `tailwindcss` - Estilos

## ⚠️ Notas Importantes

- **Backend** - API Express na porta 3001, com as migrações e os contratos descritos no guia do backend
- **Banco de dados** - PostgreSQL via Prisma
- **Autenticação** - Cookies HttpOnly funcionam normalmente
- **Estado das OMs** - Persistido no banco; finalização não permite reinício do mesmo número

---

**Implante frontend e backend juntos para manter os contratos de paginação, versão e sessão compatíveis.**

