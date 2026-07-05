-- AlterEnum
BEGIN;
CREATE TYPE "TipoUnidade_new" AS ENUM ('MATRIZ', 'FILIAL');
ALTER TABLE "Unidade" ALTER COLUMN "tipo" TYPE "TipoUnidade_new" USING ("tipo"::text::"TipoUnidade_new");
ALTER TYPE "TipoUnidade" RENAME TO "TipoUnidade_old";
ALTER TYPE "TipoUnidade_new" RENAME TO "TipoUnidade";
DROP TYPE "TipoUnidade_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Unidade" DROP CONSTRAINT "Unidade_empresaId_fkey";

-- DropIndex
DROP INDEX "Unidade_empresaId_idx";

-- AlterTable
ALTER TABLE "Unidade" DROP COLUMN "cidade",
DROP COLUMN "empresaId",
DROP COLUMN "nome",
DROP COLUMN "uf",
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "razaoSocial" TEXT NOT NULL;

-- DropTable
DROP TABLE "Empresa";

