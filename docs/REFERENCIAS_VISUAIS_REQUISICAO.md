# Referências visuais para o modal de requisição

Comparação realizada em 23/11/2026. Capturas oficiais observadas no navegador;
não houve acesso a instalações de clientes desses fornecedores. Esta etapa não
altera o modal da aplicação.

## Telas observadas

### ERPNext — Material Request

[Documentação e origem da captura](https://docs.frappe.io/erpnext/material-request)

![Requisição de materiais no ERPNext](https://docs.frappe.io/files/docs-20261022-buying-material-request-items.png?v=20261022)

O contexto do pedido ocupa a parte superior. A seção Items concentra código,
quantidade, depósito e unidade em uma grade. As informações administrativas e o
histórico ficam fora das linhas de materiais. A captura mostra uma requisição
com status Ordered; não é um modal de confirmação.

### Odoo 19 — operação de entrega

[Documentação e origem da captura](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/daily_operations/receipts_delivery_one_step.html)

![Operação de entrega no Odoo](https://www.odoo.com/documentation/19.0/_images/receipts-delivery-one-step-done-delivery.png)

O número do documento aparece com destaque, e o estado fica acima à direita.
Origem e referência precedem a aba Operations. A linha combina código e nome do
produto; demanda, quantidade e unidade ficam lado a lado. A tela de entrega é
referência para organizar dados operacionais, não um exemplo de requisição ao almoxarifado.

### SAP Fiori — Table Select Dialog

[Exemplo visual oficial](https://www.sap.com/design-system/fiori-design-web/v1-108/ui-elements/table-select-dialog)

![Exemplo de diálogo de seleção SAP](https://www.sap.com/design-system/fiori-design-web/v1-108/ui-elements/media_1d0daf335006e27ca534061c8966172506d8c7270.png?format=png&optimize=medium&width=750)

O exemplo mostra seleção de pedido de venda: título, busca, contagem de seleção
e tabela compacta. A identificação principal fica em evidência dentro da linha,
com texto secundário logo abaixo. Não se trata de uma tela de requisição de materiais.

## Adaptação proposta para AOI

Esta é uma interpretação para o nosso fluxo, não uma reprodução dessas interfaces.
Manter tema escuro, roxo para identificar a OM e verde na ação principal. Aproximar
PN e descrição na mesma célula, e reforçar a separação das ordens por cabeçalhos
com subtotal explícito. Exibir somente materiais ainda requisitáveis; confirmar
os vínculos no servidor antes de compor a previsão e revalidar ao enviar.

```text
Requisitar componentes                              ×
Destino: Almoxarifado
────────────────────────────────────────────────────
OM 12345678                         2 PNs · 3 unidades
Componente                                Quantidade
A153254-01                                      1 un.
Resistor 10k · 0603 · 1%
────────────────────────────────────────────────────
A153256-03                                      2 un.
Microcontrolador ATmega328P
────────────────────────────────────────────────────
OM 12345679                          1 PN · 1 unidade
A153255-02                                      1 un.
Capacitor 100nF · 0805 · 50V
────────────────────────────────────────────────────
Total: 4 unidades
                    [Voltar] [Confirmar requisição]
```

O modal atual já tem a grade e as ações bem separadas. A proposta muda a hierarquia:
OM mais reconhecível, código e descrição próximos e distinção explícita entre
quantidade de PNs e de unidades. Sem preço, fornecedor, contabilidade, saldo de
estoque não confirmado ou indicador de progresso em uma ação de etapa única.

Antes da implementação: validar o desenho com o usuário. Antes do aceite fabril:
conferir com operadores códigos parecidos, múltiplas OMs, grandes seleções e
componentes já requisitados.
