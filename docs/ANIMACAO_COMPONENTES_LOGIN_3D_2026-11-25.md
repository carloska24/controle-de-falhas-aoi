# Componentes eletrônicos do login — estudo e implementação 3D

Data: 25/11/2026. Branch: `codex/componentes-login-3d`.

## Escopo e ponto de retorno

A alteração é restrita à decoração com componentes eletrônicos. `LoginForm.tsx`, `login/page.tsx`, o logo e `globals.css` permanecem sem alterações. Isso preserva tamanhos, posições, tipografia, cores do formulário e comportamento da autenticação.

O estado anterior, incluindo o inicializador de produção e o DEMO administrativo, está salvo no commit `f759e30`, branch `codex/inicializador-producao-windows`. Main e GitHub não são atualizados por este experimento. Para voltar ao visual anterior, retomar essa branch e reconstruir/reiniciar o frontend; não é necessário reverter dados do banco.

## Skills consultadas

- `3d-web-experience`: escolha da stack, custo da cena, carregamento e alternativa sem WebGL.
- `threejs-animation`: animação procedural, avanço por tempo e controle do ciclo de renderização.
- `threejs-materials`: materiais PBR, rugosidade, metalicidade e texturas locais.
- `threejs-lighting`: iluminação de ambiente e luzes de recorte.

As skills estão instaladas localmente. Não foi necessário carregar um plugin nem enviar dados do projeto a um serviço de criação 3D.

## Comparação da stack

| Opção | Avaliação para este fundo |
| --- | --- |
| CSS/SVG | Excelente alternativa leve e estática; detalhes curvos e resposta de metais à luz exigiriam ilustrações pré-renderizadas ou muitas camadas. Mantida como fallback local. |
| Three.js direto | Escolhido: controle de materiais, geometria, ciclo de vida e carregamento independente do formulário, com uma dependência gráfica de runtime. |
| React Three Fiber | Boa opção para cenas React interativas. A documentação exige Fiber 8 com React 18 e Fiber 9 com React 19; o projeto usa React 18. Esta cena decorativa não precisa de uma nova camada de renderização React. |
| Spline | Útil quando a autoria passa por um editor visual. Para estes encapsulamentos, a autoria procedural em código mantém os modelos, texturas e revisão junto ao repositório. Não há dependência de um arquivo de cena publicado externamente. |
| Babylon.js | Motor com recursos amplos de aplicação/jogo 3D; o fundo não exige esse conjunto adicional. |
| Three.js WebGPU | Considerado. O renderer possui fallback WebGL2 e outro sistema de materiais; o WebGLRenderer atende a esta cena PBR pequena, sem introduzir WebGPU/TSL na aplicação. |
| GSAP/Anime.js | Não são renderizadores 3D. O movimento necessário cabe no loop do Three.js; não foi adicionada outra biblioteca de animação. |

Versões verificadas no registro npm e fixadas: `three@0.187.0` e `@types/three@0.187.0`. A importação dinâmica do módulo da cena separa o motor gráfico do código inicial do formulário. O runtime e os modelos são servidos pelo próprio frontend.

## Modelagem: 12 tipos distintos

| Modelo | Elementos visuais |
| --- | --- |
| Resistor de filme 1206 | Base cerâmica, filme escuro, terminações metálicas e marcação `103`. |
| Capacitor cerâmico MLCC | Corpo cerâmico sem inscrição, volume arredondado e terminais nas extremidades. |
| Capacitor de tântalo | Corpo moldado amarelo, marcação de valor/tensão e faixa de polaridade. |
| Eletrolítico SMD | Caneca de alumínio, base isolante, tampa com respiro e marcação de polaridade. |
| Diodo SMA | Resina moldada, faixa de cátodo e terminações separadas. |
| LED SMD | Base clara, contatos dourados, refletor e lente curva. |
| Indutor de potência | Ferrite, enrolamento helicoidal de cobre e marcação `4R7`. |
| SOIC-8 | Corpo moldado, oito terminais com ombro/curva/pé, marcação e referência do pino 1. |
| LQFP-32 | 32 terminais curvados, corpo fino e referência do pino 1. |
| Cristal de quartzo | Base isolante, tampa metálica, borda e marcação de frequência. |
| Transistor SOT-23 | Corpo retangular e três terminais em distribuição assimétrica. |
| Conector USB-C | Carcaça metálica arredondada e vazada, lingueta isolante, contatos e ancoragens. |

São representações artísticas dos encapsulamentos, com proporções ajustadas para legibilidade na tela; não são desenhos CAD de fabricação ou identificação garantida de peças. Faixas de polaridade variam conforme o tipo e o fabricante. Nomes/valores não se vinculam a registros reais da fábrica.

## Materiais, movimento e recursos

- PBR com metalicidade e rugosidade separadas para estanho, alumínio, cobre, ouro, resina, cerâmica e ferrite. Microtextura procedural compartilhada; inscrições geradas localmente em canvas.
- Ambiente de iluminação gerado por `RoomEnvironment`/PMREM, com duas luzes direcionais. Sem download de HDR, GLB, imagens ou fontes adicionais para a cena.
- Pinos e peças de cada modelo são unidos por material; repetições compartilham geometria e material.
- Até 18 objetos em desktop; 12 em telas estreitas. A posição inicial cobre a altura e distribui as peças nas laterais.
- Alvo de renderização: 30 quadros/s em desktop e 24 em telas estreitas. DPR limitado a 1,5 e a 1 respectivamente. São limites/alvos, não garantia em qualquer máquina.
- Adaptação reduz repetições e DPR se a medição indicar baixa taxa com custo alto de desenho. Janelas minimizadas podem limitar RAF a 1 Hz, o que não deve ser tratado como custo alto de GPU por si só.
- A preferência `prefers-reduced-motion` usa cena estática; abas ocultas interrompem o loop. O fundo continua sem capturar cliques ou teclado e fica oculto da árvore de acessibilidade.
- SVGs locais aparecem enquanto a cena carrega e quando WebGL2 não está disponível. Perda de contexto retorna a esse fallback; a restauração pode retomar a cena.
- Desmontagem cancela RAF, remove eventos/observador, descarta materiais, texturas, geometrias, mapa de ambiente e renderer.

## Conferências

- TypeScript e build de produção aprovados; 13 rotas geradas, sem novas rotas no produto.
- Na comparação desktop em 1440 × 1000, logo, título, formulário, campos e botão mantiveram exatamente as mesmas coordenadas e dimensões medidas antes da alteração.
- Prévia também revisada em 390 × 844, sem largura horizontal adicional.
- Modelos revisados individualmente em uma prancha local temporária, sem adicionar uma página ao produto.
- Na inspeção final do navegador integrado, em produção e 1440 × 1000, a telemetria registrou 30,0 quadros/s, cerca de 61 chamadas de desenho e 10,9 mil triângulos visíveis em uma amostra. A inicialização local ficou em aproximadamente 310 ms.
- Medições locais de submissão de um quadro ficaram na faixa de aproximadamente 0,5–2,2 ms em amostras do navegador. Isso não mede sozinho o custo completo de GPU nem garante FPS em outros equipamentos. A janela minimizada do Brave limitou a cadência de RAF a aproximadamente 1 Hz durante parte da inspeção; essas amostras não foram usadas como benchmark de desempenho em primeiro plano.
- Nenhuma criação, alteração, exclusão de registro ou chamada autenticada foi necessária para revisar a decoração.

## Fontes primárias consultadas

- [Three.js: WebGLRenderer e suporte WebGL2](https://threejs.org/docs/pages/WebGLRenderer)
- [Three.js: MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)
- [Three.js: RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html)
- [Three.js: otimização por união de geometrias](https://threejs.org/manual/pages/optimize-lots-of-objects.html)
- [Three.js: descarte de recursos](https://threejs.org/manual/pages/cleanup.html)
- [Three.js: WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer.html)
- [React Three Fiber: compatibilidade com React](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [Nexperia: encapsulamento SOT-23](https://www.nexperia.com/packages/SOT23.html)
- [Vishay: capacitores de tântalo moldados](https://www.vishay.com/en/capacitors/molded/)

Referências de movimento reduzido e carregamento client-side foram complementadas com a documentação do Next.js instalada no próprio projeto e a preferência nativa do navegador.
