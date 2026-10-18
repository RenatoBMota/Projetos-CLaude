# Mostruário Paragominas — Escopo

Sistema web para controlar as amostras de pisos enviadas ao mostruário das
lojas, **da requisição até a devolução**.

O estoque do depósito **não** é controlado aqui: o ERP continua sendo a fonte
oficial. O sistema responde a três perguntas:

1. O que foi pedido, por quem, e quem aprovou?
2. O que está hoje em cada loja, desde quando e quanto vale?
3. O que voltou, e qual foi o destino (estoque, descarte ou perda)?

## Fluxo

1. **Requisição** — a loja cria o protocolo com um ou mais SKUs e quantidades.
2. **Aprovação comercial** — obrigatória, sempre primeiro.
3. **Aprovação logística** — a Logística confere disponibilidade no ERP e
   registra a decisão aqui.
4. **Separação e expedição** — o depósito registra a saída (pode ser parcial).
5. **Em exposição** — a quantidade fica sob responsabilidade da loja.
6. **Devolução / encerramento** — o depósito classifica cada quantidade:

| Destino | Quando | Exige |
|---|---|---|
| Estoque | Voltou em condição de uso | Quantidade e conferente |
| Descarte | Voltou sem condição de uso | Quantidade, motivo e conferente |
| Perda / não devolvida | Não voltou | Quantidade, motivo e quem registrou (depósito) |

Um item é **encerrado** quando: quantidade expedida = estoque + descarte + perda.

### Detalhes do fluxo

- A aprovação (comercial ou logística) pode **reduzir** a quantidade de um item;
  0 significa que o item não será atendido. Se todos ficarem em 0, a
  requisição deve ser reprovada.
- Ninguém aprova a própria requisição.
- A requisição pode ser cancelada (com motivo) até a primeira expedição.
- Se o depósito não conseguir expedir todo o aprovado, ele **cancela o saldo
  pendente** do item, com justificativa.
- Correções de lançamentos são feitas por **estorno**, apenas pelo gestor.
- Visibilidade: cada usuário vê as filiais da sua lotação e abrangência;
  gestor, administrador e usuários corporativos (sem filial) veem todas.

## Fora do escopo

- Saldo do depósito, disponibilidade e baixa contábil (ficam no ERP).
- Destino da peça depois da devolução.
- Prazo de permanência / alertas de vencimento (o sistema só exibe os dias em
  exposição).

## Regras de negócio

| Código | Regra |
|---|---|
| RN01 | Toda requisição tem protocolo único e histórico de status. |
| RN02 | A aprovação comercial ocorre antes da logística. |
| RN03 | Requisição reprovada ou cancelada não pode ser expedida. |
| RN04 | A expedição não pode ultrapassar a quantidade aprovada do item. |
| RN05 | Devolução + descarte + perda não podem ultrapassar o que foi expedido. |
| RN06 | Descarte e perda exigem motivo da lista fixa; "Outro" exige observação. |
| RN07 | O custo unitário é gravado na expedição e não muda se o cadastro mudar. |
| RN08 | Movimentações não são apagadas nem editadas; correção é por estorno. |
| RN09 | Confirmações são idempotentes (duplo clique não duplica registro). |
| RN10 | Cada usuário vê e age apenas nas filiais da sua abrangência. |
| RN11 | Por padrão, ninguém aprova a própria requisição. |

## Status

**Requisição:** Rascunho → Aguardando aprovação comercial → Aguardando
aprovação logística → Aguardando expedição → Em exposição → Devolução parcial
→ Encerrada. Desvios: Reprovada, Cancelada.

**Item** (derivado das movimentações): Aguardando expedição → Expedido
parcialmente → Em exposição → Devolução parcial → Encerrado.

## Perfis

| Perfil | Pode |
|---|---|
| Requisitante | Criar e acompanhar requisições da sua filial |
| Aprovador comercial | Aprovar/reprovar a 1ª etapa nas filiais da abrangência |
| Aprovador logístico | Aprovar/reprovar a 2ª etapa nas filiais da abrangência |
| Depósito | Registrar expedição, devolução (estoque/descarte) e perda |
| Gestor | Consultar tudo, relatórios e estornos |
| Administrador | Cadastros, usuários, perfis e listas de motivos |

Um usuário pode acumular vários perfis. A implantação começa com **um único
administrador**, criado por linha de comando; ele cria os demais usuários em
**Configuração › Usuários**, definindo perfis, filial de lotação e abrangência.
Usuários criados pelo administrador recebem senha temporária e precisam
trocá-la no primeiro acesso.

## Configuração

- **Cadastros:** Produtos, Fornecedores, Filiais e Motivos. Produtos podem ser
  importados da planilha do ERP (.xlsx/.csv), atualizando pelo SKU.
- **Usuários:** criação, perfis, abrangência, inativação e redefinição de senha.

## Motivos (lista fixa, editável pelo administrador)

**Descarte:** Quebrada / trincada · Riscada / manchada · Lascada nas bordas ·
Embalagem danificada · Produto fora de linha · Outro

**Perda:** Extraviada na loja · Danificada na loja sem retorno · Extraviada no
transporte · Outro

## Indicadores principais

- Quantidade e valor em exposição por loja, fornecedor, produto e requisitante.
- Dias em exposição (idade das amostras abertas).
- Valor e taxa de descarte e de perda por loja e fornecedor.
- Lead time de aprovação (por etapa) e de expedição.
- Relatório "a lançar no ERP": quantidades devolvidas para Estoque por período.

## Arquitetura

React + TypeScript · Python + FastAPI · PostgreSQL · Docker.
Modelo de dados em [`db/schema.sql`](../db/schema.sql).
