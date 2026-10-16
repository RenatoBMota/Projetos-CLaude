-- Cenário de teste do schema. Rodar num banco vazio após schema.sql:
--   psql -d <banco> -f schema.sql && psql -d <banco> -f teste_cenario.sql
-- As linhas comentadas com 'falha' devem retornar erro.
\set ON_ERROR_STOP 0
INSERT INTO filiais (codigo,nome) VALUES ('PGM','Paragominas');
INSERT INTO usuarios (nome,email,filial_id) VALUES ('Dep','d@x',1);
INSERT INTO produtos (sku,descricao,custo_referencia) VALUES ('P1','Porcelanato 60x60',50);
INSERT INTO solicitacoes (filial_id,requisitante_id,status) VALUES (1,1,'aguardando_aprovacao_comercial');
INSERT INTO itens_solicitacao (solicitacao_id,produto_id,quantidade_solicitada,custo_referencia) VALUES (1,1,10,50);
-- deve falhar: não aprovada
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'expedicao',5,1,'k0');
UPDATE solicitacoes SET status='aguardando_expedicao';
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'expedicao',6,1,'k1');
-- duplo clique: mesma chave -> falha
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'expedicao',6,1,'k1');
-- excede aprovado -> falha
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'expedicao',5,1,'k2');
SELECT status_item,qtd_expedida,qtd_em_loja,qtd_pendente_expedicao,valor_em_loja FROM vw_posicao_item;
UPDATE produtos SET custo_referencia=60;
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'expedicao',4,1,'k3');
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'devolucao_estoque',6,1,'k4');
-- descarte sem motivo -> falha
INSERT INTO movimentacoes (item_id,tipo,quantidade,usuario_id,chave_idempotencia) VALUES (1,'devolucao_descarte',2,1,'k5');
INSERT INTO movimentacoes (item_id,tipo,quantidade,motivo_id,usuario_id,chave_idempotencia) VALUES (1,'devolucao_descarte',2,1,1,'k5');
-- perda "Outro" sem observação -> falha
INSERT INTO movimentacoes (item_id,tipo,quantidade,motivo_id,usuario_id,chave_idempotencia) VALUES (1,'perda',2,10,1,'k6');
-- perda maior que em loja -> falha
INSERT INTO movimentacoes (item_id,tipo,quantidade,motivo_id,usuario_id,chave_idempotencia) VALUES (1,'perda',3,7,1,'k6');
SELECT status_item,qtd_em_loja,valor_em_loja FROM vw_posicao_item;
INSERT INTO movimentacoes (item_id,tipo,quantidade,motivo_id,usuario_id,chave_idempotencia) VALUES (1,'perda',2,7,1,'k6');
SELECT status_item,qtd_expedida,qtd_estoque,qtd_descarte,qtd_perda,qtd_em_loja,valor_descarte,valor_perda,dias_em_exposicao FROM vw_posicao_item;
-- apagar -> falha
DELETE FROM movimentacoes WHERE chave_idempotencia='k1';
-- estorno da perda
INSERT INTO movimentacoes (item_id,tipo,quantidade,motivo_id,estorno_de_id,usuario_id,chave_idempotencia) VALUES (1,'estorno',2,11,(SELECT id FROM movimentacoes WHERE chave_idempotencia='k6'),1,'k7');
SELECT status_item,qtd_perda,qtd_em_loja FROM vw_posicao_item;
SELECT tipo,quantidade,custo_unitario FROM movimentacoes ORDER BY id;
