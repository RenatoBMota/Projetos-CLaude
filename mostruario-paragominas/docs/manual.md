# Manual do usuário — Mostruário Paragominas

O sistema controla as amostras de pisos enviadas ao mostruário das lojas,
**da requisição até a devolução**. O estoque do depósito continua no ERP.

## Acesso

- Entre com seu **e-mail** e **senha**.
- No primeiro acesso, o sistema pede para trocar a senha temporária que o
  administrador passou.
- Para trocar a senha depois: menu lateral › **Trocar senha**.
- Esqueceu a senha? Peça ao administrador para redefinir.

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

## Aprovador comercial e aprovador logístico

1. **Início › Aprovação comercial** (ou logística) mostra o que espera você.
2. Abra a requisição e clique em **Aprovar** ou **Reprovar**.
   - Ao aprovar, você pode **reduzir a quantidade** de um item. Use 0 para não atender o item.
   - Ao reprovar, escolha o motivo.
3. A logística só decide depois do comercial.

Ninguém aprova a própria requisição.

---

## Depósito

**Expedição** — **Início › A expedir**, abra a requisição › **Registrar expedição**.
Informe o que saiu agora (pode ser parcial; o restante fica pendente).
Se o restante não vai sair, use **Cancelar saldo pendente** e explique o motivo.

**Devolução** — abra a requisição (**Início › Em loja**) › **Registrar devolução**.
Para cada item, distribua a quantidade entre:

| Destino | Quando usar |
|---|---|
| **Estoque** | A peça voltou e pode ser usada de novo (dar entrada no ERP) |
| **Descarte** | A peça voltou sem condição de uso — escolha o motivo |
| **Perda** | A peça não voltou — escolha o motivo |

A requisição é **encerrada automaticamente** quando tudo o que foi enviado
tem destino.

**Anexos** — na requisição, em **Anexos**, envie fotos ou PDF (comprovante de
coleta, foto da peça avariada). No celular, dá para tirar a foto na hora.

**Lançar no ERP** — **Relatórios › Lançar no ERP** lista, por SKU, tudo o que
voltou para estoque no período. Use para dar entrada no ERP.

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
| Indicadores | Valor em exposição, pendências, taxas de aprovação, tempos médios, % de reaproveitamento, descarte e perda |
| Em exposição | Valor e quantidade nas lojas por filial, fornecedor, produto ou requisitante |
| Descarte e perda | Por filial e por motivo |
| Lançar no ERP | Devoluções para estoque, somadas por SKU |
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
| Requisitante | Criar e acompanhar requisições |
| Aprovador comercial | Aprovar/reprovar a 1ª etapa |
| Aprovador logístico | Aprovar/reprovar a 2ª etapa |
| Depósito | Expedição, devolução, perda e anexos |
| Gestor | Ver tudo, relatórios e estornos |
| Administrador | Configuração (cadastros e usuários) |

Um usuário pode ter vários perfis. A **filial de lotação** e a **abrangência**
definem quais filiais ele vê; deixe ambas em branco para um usuário
corporativo (vê todas). Para bloquear alguém, edite e desmarque **Ativo**.
