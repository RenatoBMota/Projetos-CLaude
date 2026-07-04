# TransferLog — Torre de Controle de Transferências entre Filiais

> Nomes em avaliação: **Transfer Intelligence** / **Smart Transfer**

## 1. Visão do produto

Sistema para automatizar e controlar de ponta a ponta o processo de transferência de
mercadorias entre unidades (CD/Matriz/Lojas), eliminando o controle manual via
WhatsApp/planilha. O sistema lê o XML ou PDF da NF-e emitida pelo ERP, extrai
automaticamente os dados da transferência, acompanha o ciclo de vida do pedido
(separação → carregamento → trânsito → recebimento → conferência) e mede a
qualidade da entrega através de SLA e OTIF por rota e por filial.

Diferencial estratégico: não é apenas "controle de transferências", é um
**Transfer Control Tower** integrado ao WMS (Systock), com rastreabilidade completa
por evento (quem, quando, o quê, evidências), auditoria, alertas proativos e
indicadores gerenciais em tempo real.

## 2. Fluxo do processo (máquina de estados)

```
ERP emite NF
     │
Upload XML ou PDF
     │
Leitura automática (parse)
     │
Resumo da NF
     │
Pendente de Separação
     │
Separação
     │
Carregado
     │
Em trânsito
     │
Recebido
     │
Conferido
     │
Finalizado
```

Estados possíveis de uma transferência: `pendente_separacao`, `em_separacao`,
`carregado`, `em_transito`, `recebido`, `conferido_ok`, `conferido_divergente`,
`finalizado`, `cancelado`.

## 3. Extração automática de dados da NF (XML/PDF)

Campos a extrair automaticamente no upload:

- Número da NF
- Série
- Número do Pedido (canhoto superior)
- Emitente (razão social + CNPJ) → define **origem**
- Destinatário (razão social + CNPJ) → define **destino**
- Data de emissão
- Valor total da nota
- Quantidade de volumes
- Peso bruto
- Quantidade de SKUs distintos
- Lista completa de produtos: código interno, descrição, NCM, CFOP, quantidade

A origem e o destino são resolvidos **automaticamente pelo CNPJ** contra o
cadastro de unidades — o usuário nunca escolhe manualmente origem/destino.

## 4. Telas

### 4.1 Upload de Nota
- Drag-and-drop de XML ou PDF (ou seleção de arquivo)
- Campos complementares opcionais: transportadora, veículo, motorista, prazo
  previsto (calculado automaticamente pelo SLA da rota origem→destino)
- Botão "Ler NF" → dispara o parse e monta a transferência

### 4.2 Resumo da NF
- NF, Pedido, Origem, Destino, Valor, Volumes, Peso, Qtd. SKU, Qtd. total de itens
- Tabela de produtos (código, descrição, quantidade)
- Botão "Criar Transferência"

### 4.3 Fila da Origem
- Lista de transferências pendentes da unidade (Pedido, NF, Destino, Criada em,
  Prazo, Status)
- Ações: Ver / Separar / Cancelar

### 4.4 Separação
- Checklist dos produtos da NF (marcar item a item)
- Botão "Separação concluída"

### 4.5 Carregamento
- Motorista, veículo, hora de carregamento
- Botão "Marcar como Carregado" → status muda para "Em trânsito"

### 4.6 Recebimento / Conferência
- Não é um simples "Recebido": mede-se a **qualidade** da transferência
- Quantos SKUs da NF foram conferidos corretamente vs. divergentes
- Para cada item divergente: tipo de erro (Faltou / Sobrou / Quebrado / Produto
  errado), quantidade, observação, anexo de fotos
- Situação final: **Recebido OK** ou **Recebido com divergência**

## 5. Cadastro de Unidades

- Empresa (razão social, CNPJ matriz)
- Filiais: nome, CNPJ, cidade, UF, tipo (Centro de Distribuição / Loja), ativa
- O CNPJ de cada filial é o que permite ao sistema identificar automaticamente
  origem/destino ao ler a NF

## 6. Cadastro de Usuários e Permissões

Perfis:
- **Administrador** — acesso total
- **Supervisor Logística** — várias filiais atribuídas
- **Líder Loja** — somente sua loja
- **Operador** — somente notas da sua unidade
- **Separador** — ação de separação
- **Conferente** — ação de recebimento/conferência
- **Analista** — upload de NF
- **Auditoria** — somente relatórios

Cada usuário é vinculado a uma ou mais filiais; só enxerga transferências em que
sua(s) filial(is) participa(m) como origem ou destino (ex.: um operador da Loja 03
nunca vê uma transferência entre Loja 10 e Loja 20).

## 7. SLA por rota e cálculo de OTIF

- SLA configurável por par origem→destino (ex.: CD Matriz → Loja 03: 24h;
  CD Belém → Marabá: 48h; Matriz → Loja Centro: 12h)
- **On Time (OT)**: entregue dentro do SLA da rota
- **In Full (IF)**: todos os SKUs da NF conferidos sem divergência
- **OTIF = Sim** somente quando OT **e** IF são verdadeiros simultaneamente

## 8. Dashboard operacional (por filial, tela inicial)

Cada usuário vê apenas os números da(s) sua(s) filial(is):
- Transferências pendentes (aguardando separação / carregadas / em trânsito /
  aguardando conferência / com divergência)
- OTIF da filial (%)

## 9. Dashboard gerencial (Diretoria)

- Transferências em aberto
- Atrasadas por origem / por destino
- Tempo médio: faturamento→carregamento, em trânsito, separação, conferência
- OTIF geral, por filial, por rota
- Ranking de filiais com mais divergências
- Ranking de produtos mais divergentes
- Ranking de transportadoras mais usadas
- Valor financeiro das transferências pendentes
- Heatmap de rotas críticas

## 10. Rastreabilidade e auditoria

Cada evento do fluxo (upload, separação, carregamento, recebimento, conferência)
grava: data/hora, usuário responsável e evidências (fotos, observações). Isso
permite auditoria completa e histórico ponta a ponta por transferência.

## 11. Integrações

- ERP: origem do XML/PDF da NF-e (upload manual na v1; integração automática é
  evolução futura)
- WMS Systock: integração alvo para virar uma torre de controle logística
  completa (a definir: leitura de estoque/separação direto do Systock?)

## 12. Em aberto / decisões pendentes

- Stack tecnológica (backend, frontend, banco de dados, storage de fotos)
- Formato de entrada prioritário: XML da NFe (schema padrão, mais confiável) vs.
  PDF (requer OCR/parse menos confiável) — recomendação: priorizar XML
- Modelo de dados detalhado (entidades: Unidade, Usuário, Transferência, Item,
  EventoAuditoria, RotaSLA)
- Escopo do MVP (qual fatia entregar primeiro)
- Detalhes da integração com Systock (API disponível? banco compartilhado?)
- Notificações (e-mail, push, WhatsApp?) para alertas de atraso
