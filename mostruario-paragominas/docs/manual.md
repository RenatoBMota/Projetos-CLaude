# Manual do usuário — Mostruário Paragominas

O sistema controla as amostras de pisos enviadas ao mostruário das lojas,
**da requisição até a devolução**. O estoque do depósito continua no ERP.

## Acesso

- Entre com seu **e-mail** e **senha**.
- No primeiro acesso, o sistema pede para trocar a senha temporária que o
  administrador passou.
- Para trocar a senha depois: menu lateral › **Trocar senha**.
- Esqueceu a senha? Peça ao administrador para redefinir.

### Instalar como aplicativo

O sistema pode ser instalado no celular e no computador, com ícone próprio e
abrindo em tela cheia:

- **Android (Chrome):** menu ⋮ › **Instalar aplicativo** (ou o aviso que aparece na tela).
- **iPhone/iPad (Safari):** botão **Compartilhar** › **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço, ou
  menu do sistema › **Instalar aplicativo**.

Quando houver versão nova, aparece o aviso **"Nova versão disponível — Atualizar"**.
O tema claro/escuro segue o do aparelho; dá para trocar no menu (ícone de tela/lua/sol).

No celular, o menu fica embaixo: **Início, Requisições, Nova** (requisitante),
**Exposição** e **Mais** (relatórios, configuração, tema, senha, sair).

O menu mostra só o que o seu perfil pode usar. A tela **Início** mostra as
suas filas de trabalho (o que está esperando por você).

---

## Requisitante

**Criar uma requisição**

1. **Requisições › Nova requisição** (ou o botão na tela Início).
2. Escolha a filial e a prioridade; informe a finalidade e, se quiser, uma justificativa.
3. Em **Produtos**, digite parte do SKU ou da descrição e clique no produto para
   adicioná-lo. Ajuste a quantidade de cada item.
4. **Enviar para aprovação** — ou **Salvar rascunho** para terminar depois.

Rascunhos só você vê. Para continuar um rascunho: **Requisições › Minhas**,
abra a requisição e clique em **Editar**.

**Cancelar**: abra a requisição › **Cancelar requisição** (exige motivo).
Só é possível antes da primeira expedição.

---

## Requisitante geral (computador da loja)

Conta **compartilhada**, deixada aberta num computador da loja, para que os
**promotores** façam requisições sem precisar de login próprio.

1. O administrador cria um usuário (ex.: "Loja Paragominas") com o perfil
   **Requisitante geral** e a filial da loja, e deixa a sessão aberta no computador.
2. O promotor abre **Nova requisição**, preenche **Seu nome** (o sistema sugere
   os nomes já usados) e, se quiser, a **Empresa/marca**, escolhe os produtos e envia.
3. A tela confirma o protocolo e volta limpa para o próximo promotor.

O nome do promotor aparece nas listas, no detalhe, no histórico e nos relatórios
(rankings de requisitantes). O registro indica que foi feito pelo computador da loja.

---

## Aprovador comercial e aprovador logístico

1. **Início › Aprovação comercial** (ou logística) mostra o que espera você.
2. Abra a requisição e clique em **Aprovar** ou **Reprovar**.
   - **Aprovar com quantidade menor**: altere a quantidade do item e informe a
     **justificativa de cada item alterado** (0 = não atender o item).
   - **Reprovar**: escolha o motivo e escreva a **justificativa** (vale para a requisição inteira).
3. A logística só decide depois do comercial.

Ninguém aprova a própria requisição, **exceto o administrador**, que pode aprovar
qualquer etapa, inclusive das requisições que ele mesmo criou.

As justificativas aparecem embaixo de cada item na requisição
(ex.: "Aprovação logística: 10 → 6 — painel comporta só 6 peças").

---

## Depósito

**Expedição** — **Início › A expedir**, abra a requisição › **Registrar expedição**.
Informe o que saiu agora. Se sair **menos que o aprovado**, o sistema pede a
**justificativa do item** e pergunta se o restante **fica pendente** (sai depois)
ou é **cancelado**. Também é possível cancelar o saldo depois, em
**Cancelar saldo pendente** (com justificativa).

**Devolução (por produto)** — abra a requisição (**Início › Em loja**) e clique em
**Devolver** na linha do produto que voltou (ou em **Registrar devolução** e escolha
o produto). Dá para devolver só um produto da requisição; os outros continuam na loja.
Distribua a quantidade entre:

| Destino | Quando usar |
|---|---|
| **Estoque** | A peça voltou e pode ser usada de novo (reintegrada ao estoque) |
| **Descarte** | A peça voltou sem condição de uso — escolha o motivo |
| **Perda** | A peça não voltou — escolha o motivo |

A requisição é **encerrada automaticamente** quando tudo o que foi enviado
tem destino.

**Anexos** — na requisição, em **Anexos**, envie fotos ou PDF (comprovante de
coleta, foto da peça avariada). No celular, dá para tirar a foto na hora.

**Reintegrado ao estoque** — **Relatórios › Reintegrado ao estoque** lista, por SKU,
tudo o que voltou para o estoque no período (base para o lançamento no ERP).

---

## Gestor

- Vê todas as filiais, requisições e relatórios.
- **Estornar**: se um lançamento foi feito errado (expedição, devolução ou
  perda), abra a requisição › **Movimentações** › **Estornar**, com motivo.
  O lançamento original continua no histórico, riscado. Depois, o depósito
  lança o correto.
- Pode cancelar requisições que ainda não foram expedidas.

---

## Relatórios

Menu **Relatórios** (gestor, administrador, aprovadores e depósito). Filtre
por período, filial e fornecedor.

| Aba | O que mostra |
|---|---|
| Painel gerencial | Indicadores e gráficos: evolução mensal, destino das devoluções por filial, idade das amostras, rankings de filiais, produtos e requisitantes, requisições por situação |
| Em exposição | Valor e quantidade nas lojas por filial, fornecedor, produto ou requisitante |
| Descarte e perda | Por filial e por motivo |
| Reintegrado ao estoque | Devoluções para estoque, somadas por SKU |
| Movimentações | Todas as saídas e retornos do período |
| Requisições | Cada requisição, com valores e dias até expedir |
| Aprovações pendentes | O que está esperando aprovação e há quantos dias |

Cada tabela tem **Excel**, **CSV** e **Imprimir / PDF** (na janela de
impressão, escolha "Salvar como PDF").

A tela **Em exposição** (menu lateral) lista item a item o que está hoje em
cada loja e há quantos dias.

---

## Administrador

Menu **Configuração**:

- **Cadastros › Produtos, Fornecedores, Filiais, Motivos** — inclua e edite.
  Registros não são apagados: desmarque **Ativo** para tirá-los de uso.
- **Importar planilha** (aba Produtos) — envie a planilha exportada do ERP
  (.xlsx ou .csv). Baixe a planilha modelo para ver as colunas. Produtos já
  existentes são atualizados pelo SKU. Se alguma linha tiver erro, nada é
  gravado e o sistema mostra as linhas a corrigir.
- **Usuários** — crie os usuários com uma senha temporária e marque os perfis:

| Perfil | Pode |
|---|---|
| Requisitante | Criar e acompanhar requisições (conta pessoal) |
| Requisitante geral | Conta compartilhada da loja: cada promotor informa o próprio nome |
| Aprovador comercial | Aprovar/reprovar a 1ª etapa |
| Aprovador logístico | Aprovar/reprovar a 2ª etapa |
| Depósito | Expedição, devolução, perda e anexos |
| Gestor | Ver tudo, relatórios e estornos |
| Administrador | Configuração (cadastros e usuários) |

Um usuário pode ter vários perfis. A **filial de lotação** e a **abrangência**
definem quais filiais ele vê; deixe ambas em branco para um usuário
corporativo (vê todas). Para bloquear alguém, edite e desmarque **Ativo**.
