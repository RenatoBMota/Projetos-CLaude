-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('NORMAL', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatusTratativa" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA');

-- AlterEnum
ALTER TYPE "TipoEvento" ADD VALUE 'PONTO_CONTROLE';

-- CreateTable
CREATE TABLE "Transportadora" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transportadora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transportadora_nome_key" ON "Transportadora"("nome");

-- AlterTable: novas colunas (transportadora antiga fica por enquanto pro backfill abaixo)
ALTER TABLE "Transferencia"
  ADD COLUMN     "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN     "transferenciaOrigemId" TEXT,
  ADD COLUMN     "transportadoraId" TEXT,
  ADD COLUMN     "tratativaObservacao" TEXT,
  ADD COLUMN     "tratativaPrazo" TIMESTAMP(3),
  ADD COLUMN     "tratativaResponsavelId" TEXT,
  ADD COLUMN     "tratativaStatus" "StatusTratativa",
  ADD COLUMN     "valorFrete" DECIMAL(12,2),
  ADD COLUMN     "viagemNumero" TEXT;

-- Backfill: cria uma Transportadora pra cada nome distinto já usado em texto livre,
-- e aponta cada Transferencia existente pra ela — sem isso o histórico de
-- transportadora seria perdido ao remover a coluna antiga.
INSERT INTO "Transportadora" (id, nome)
SELECT gen_random_uuid()::text, dados.nome
FROM (
    SELECT DISTINCT trim("transportadora") AS nome
    FROM "Transferencia"
    WHERE "transportadora" IS NOT NULL AND trim("transportadora") <> ''
) dados;

UPDATE "Transferencia" t
SET "transportadoraId" = tr.id
FROM "Transportadora" tr
WHERE trim(t."transportadora") = tr.nome;

-- AlterTable: remove a coluna de texto livre, já migrada pra Transportadora
ALTER TABLE "Transferencia" DROP COLUMN "transportadora";

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "Transportadora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_tratativaResponsavelId_fkey" FOREIGN KEY ("tratativaResponsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_transferenciaOrigemId_fkey" FOREIGN KEY ("transferenciaOrigemId") REFERENCES "Transferencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
