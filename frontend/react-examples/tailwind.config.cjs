module.exports = {
  // Incluir também os arquivos HTML/JS do diretório `frontend` pai
  content: [
    "./**/*.{html,js,jsx}",
    "../**/*.{html,js,jsx}"
  ],
  // Forçar geração de classes que podem não ser detectadas por análise estática
  safelist: [
    // cores e hover
    'bg-emerald-600','hover:bg-emerald-500','bg-sky-700','hover:bg-sky-600','bg-rose-700','hover:bg-rose-600','bg-amber-600','hover:bg-amber-500',
    // bordas e cores de texto
    'border-slate-600','text-slate-200','text-white','text-rose-600',
    // espaçamentos e layout
    'px-3','px-4','py-1','py-1.5','py-2','gap-2','inline-flex','items-center','rounded-md','shadow-sm',
    // estados
    'disabled:opacity-50','hover:bg-slate-700/30','hover:bg-rose-700/5'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
