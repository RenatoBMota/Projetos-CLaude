-- Adiciona a data do pedido, que passa a ser a base de todos os cálculos de
-- prazo/lead time (em vez da data de upload da NF). Preenche os registros
-- existentes com a dataEmissao como melhor aproximação disponível.
ALTER TABLE "Transferencia" ADD COLUMN "dataPedido" TIMESTAMP(3);

UPDATE "Transferencia" SET "dataPedido" = "dataEmissao" WHERE "dataPedido" IS NULL;

ALTER TABLE "Transferencia" ALTER COLUMN "dataPedido" SET NOT NULL;
