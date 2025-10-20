# Resumo de Como devera funcionar sistema as

1) Tela de Login (Login.html)
Usuario entra com Usuario e Senha

- Se o usuario for admin, ele ja entra logodo na tela de cadastro de Usuario, o admin tem permissao de navegar para todas as paginas.

1) (A) Login por tipo de usuario.

- Se o usuario for (Operador de AOI), Tera acesso direto ao logar na tela de Registro de falhas, na tela de registro de falhas o operador podera ter acesso aos:

* Relatorios: Onde tera acesso ao botao Relatorio e registros de falhas, e Relatorio de reparos.
* Acessos rapidos: botao almoxarifado e Tela de Reparo.
* Tera acesso mesmas permissoes que o admim possui nessas telas.

1) (B) Se o usuario for Operador de Reparo, tera acesso somente a Tela de Repado.

1) (C) e o Usuario for Almoxarifado terá acesso somente a Tela de Almoxarifado.

1) (D) Se o usuario for Analista de Qualidade ele tera acesso a area da qualidade e tambem tera acesso ao Relatorio de Registro de Falhas, Analise de Qualidade e Relatorio de Reparos.


----------------------------------------------------------------------------
2) Tela Index.html (Tela de Controle de Falhas AOI)

Dentro da tela de Registros de Falhas
Ao entrar na tela de registros temos os campos onde sao inseridos as informaçoes:
* OM (Ordem de Montagem) *
* Qtd de Placas do Lote *
* Serial Number da Placa*
* Designador *
* Tipo de Defeito *
* Cod. Alt (Código Alternativo)*
* Descrição do Componente
* Observações

Observação: Todos que possuem (*) precisam de inserçao de dados obrigatorios.

# Antes de começar a inserir quaisquer falhas o usuario precisa inserir dados em "(Ordem de Montagem) *" e "Qtd de Placas do Lote *", pois precisamos documentar o tempo gasto por OMs, ao clicar em Iniciar OM, o timer "Tempo de Inspeção do Lote:" começa a ser marcado, esse timer precisa ser salvo em banco de dados, para documentar o tempo gasto na OM, nisso temos os botões pausa e retornar, o botao pausa paralisa o tempo, pois como precisamos passar placas de liberaçao de lote, precisamos passar algumas placas como amostral, ao paralisar precisamos depois retomar a OM com o tempo que foi salvo no Timer, e ao finalizar a OM, devera ser salvo com o texto "Tempo total do lote: 00:00:06" no final da planilha.
# Observaçao: O campo de busca por OM, devera buscar a OM pelo numero, e se a OM estiver pausada, poderemos seleciona-la na lista, e nisso aparecer um Modal escrito, Deseja continuar com a Inspeçao do Lote? Ao selecionar a OM a tela deverá aparecer os registros que ja foram feitos, o botão de Gerar requisicao de materiais deverá ser inteligente pois se ele ver que o registro de material ja foi solicitado para o item na planilha ele devera ignorar o pedido para essas placas.

# O botão gravar grava um registro na lista de Registro na planilha de Registros.
Ao gravar o registro o formulario precisa ser limpo imediatamente, deixando gravado de modo que fiquem travados os imput de OM (Ordem de Montagem) * e Qtd de Placas do Lote *, precisamos inserir um botão no formulario de Registro para "Começar nova OM", pois se pausarmos uma OM, e não finalizarmos precisaremos depois continuar essa OM, e como faremos para iniciarmos uma nova OM se não houver um botão para Iniciar nova OM se o botão Iniciar OM não esta aparecendo devido ele estar com uma OM em pausa? 
Nisso Quando clicamos em iniciar nova OM, o sistema Limpa toda a Tela de Controle de falhas, porem ao continuar por OMs vemos os dados na planilha.

Indo para o Card Qualidade do Lote
Nesse card devera ao Finalizamos uma OM o mesmo não deverá exibir Imputs para dados, ele devera Exibir um Status de Qualidade do Lote com O emoji adequado, e exibir o texto como exemplo (Falhas contadas: 12 de 20 itens inspecionados (60.0% de falhas).)

Ainda na tela (Index.html "Controle de Falhas AOI")
Temos o card Relatorios onde nele constam os botoes:
*Relatório de Registro de Falhas
*Relatório de Registro de Falhas
*Análise de Qualidade
*Qualidade (c/ Demo)
*Relatório de Reparo

# Iniciando falando sobre o Relatorio de Registro de Falhas
O mesmo devera conter os dados registrados na planilha de Registro de Falhas, as colunas são:
*OM|Cod. Alt|Serial|Designador|Defeito|Descrição|Data/Hora|Operador
Nesse relatorio, ao filtrar por OM, devera aparecer no final da planilha o ex:"Tempo total do lote: 00:00:06"

# Analise de Qualide, Devera permanecer como está.

# Tela Analise de Qualidade (com demo) devera permanecer como está.

# Tela Analise de Reparo devera permanecer como está.
/




