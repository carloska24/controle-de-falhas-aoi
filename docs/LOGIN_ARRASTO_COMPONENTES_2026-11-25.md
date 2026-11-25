# Login: componentes menores e arrasto com mouse

Branch: `codex/login-arrastar-componentes`. Ponto de retorno: `514dcf9`, na branch `codex/componentes-login-3d`.

- Componentes 15% menores, tanto na cena WebGL2 quanto na ilustração SVG alternativa.
- Mouse: o cursor indica `grab` sobre uma peça e `grabbing` durante o arrasto. A captura do ponteiro permite continuar o gesto fora dos limites da peça.
- A detecção usa Raycaster e tolerância pequena em torno dos encapsulamentos menores. O cartão inteiro do login é excluído da captura.
- Ao soltar, a queda continua a partir da nova posição. O posicionamento vale somente para a página atual; não é salvo no banco.
- Perda de foco, cancelamento do ponteiro, redimensionamento e desmontagem encerram o gesto e liberam captura/cursor.
- A animação segue respeitando movimento reduzido; o mouse pode reposicionar a peça mesmo com movimento automático desabilitado.
- Touch/rolagem não são interceptados. O arrasto é para mouse e requer a cena WebGL2; a alternativa SVG continua estática.
- O fundo continua atrás do cartão e não substitui ações do formulário. Um clique gerado pelo fim do arrasto é suprimido para evitar ações acidentais.
- Seleção de texto bloqueada somente na superfície do login, incluindo título, marca e rótulos. `input`/`textarea` têm exceção explícita para seleção e edição normais.
- Nenhuma alteração de posição, dimensões ou conteúdo do formulário.

Verificação no navegador: arrasto real de capacitor para outra posição, liberação do ponteiro, continuidade da cena sem erros de console, título com `user-select: none` e campo de usuário com `user-select: text`. `Ctrl+A` selecionou os 13 caracteres do texto de teste dentro do campo; nenhuma autenticação ou escrita no banco foi executada.

Referências: [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html) e [Pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture). Skill aplicada: `threejs-interaction`.
