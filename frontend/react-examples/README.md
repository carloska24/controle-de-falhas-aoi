# React Button (Tailwind) - Exemplos

Arquivos com exemplo de componente de botão usando classes Tailwind.

Arquivos:

- `Button.jsx` - componente React com variantes: `danger`, `amber`, `primary`, `ghost`.
- `../tailwind-buttons.html` - demo rápido usando Tailwind via CDN (apropriado para teste sem build).

Uso em Vite (React):

1. Crie um projeto Vite React (se ainda não existir):

```powershell
npm create vite@latest my-app -- --template react
cd my-app
npm install
```

2. Instale Tailwind (guia resumido):

```powershell
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. Configure `tailwind.config.cjs` para mirar seus arquivos:

```js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

4. Importe Tailwind em `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

5. Copie `Button.jsx` para `src/components/Button.jsx` e use em `App.jsx`:

```jsx
import Button from './components/Button'

export default function App(){
  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <Button variant="danger">Excluir Selecionados</Button>
      <Button variant="amber">Gerar Requisição</Button>
      <Button variant="primary">Iniciar OM</Button>
      <Button variant="ghost">Adicionar Demo</Button>
    </div>
  )
}
```

6. Rode em PowerShell:

```powershell
npm run dev
```

Uso em Next.js:

- Instale Tailwind seguindo a documentação oficial (Next.js + Tailwind). Em Next 13+ use o mesmo `Button.jsx` em `components/`.
- Importante: Next já tem rota e build; assegure `tailwind.config.js` inclui os diretórios `app`, `pages`, `components`.

Teste rápido sem build:

Abra `frontend/tailwind-buttons.html` no navegador; é um demo rápido com os mesmos estilos via CDN.

---

Se quiser, eu posso:

- Adicionar o component a um scaffold Vite dentro do repo (criar package.json, src, etc.)
- Integrar o botão no HTML atual do seu `frontend` (substituir classes em `admin.html`/outros)

Diga qual o próximo passo que eu executo.
