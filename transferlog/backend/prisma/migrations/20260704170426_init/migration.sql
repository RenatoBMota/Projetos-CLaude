-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('CD', 'LOJA');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'LIDER_LOJA', 'OPERADOR', 'SEPARADOR', 'CONFERENTE', 'ANALISTA', 'AUDITORIA');

-- CreateEnum
CREATE TYPE "StatusTransferencia" AS ENUM ('PENDENTE_SEPARACAO', 'EM_SEPARACAO', 'CARREGADO', 'EM_TRANSITO', 'RECEBIDO', 'CONFERIDO_OK', 'CONFERIDO_DIVERGENTE', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoDivergencia" AS ENUM ('FALTOU', 'SOBROU', 'QUEBRADO', 'PRODUTO_ERRADO');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('UPLOAD', 'SEPARACAO', 'CARREGAMENTO', 'RECEBIMENTO', 'CONFERENCIA', 'CANCELAMENTO');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpjMatriz" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "tipo" "TipoUnidade" NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioUnidade" (
    "usuarioId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,

    CONSTRAINT "UsuarioUnidade_pkey" PRIMARY KEY ("usuarioId","unidadeId")
);

-- CreateTable
CREATE TABLE "RotaSLA" (
    "id" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "prazoHoras" INTEGER NOT NULL,

    CONSTRAINT "RotaSLA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL,
    "numeroNF" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "qtdVolumes" INTEGER NOT NULL,
    "pesoBruto" DECIMAL(12,3) NOT NULL,
    "qtdSku" INTEGER NOT NULL,
    "qtdItensTotal" INTEGER NOT NULL,
    "status" "StatusTransferencia" NOT NULL DEFAULT 'PENDENTE_SEPARACAO',
    "transportadora" TEXT,
    "veiculo" TEXT,
    "motorista" TEXT,
    "prazoPrevisto" TIMESTAMP(3) NOT NULL,
    "dataSeparacaoConcluida" TIMESTAMP(3),
    "dataCarregamento" TIMESTAMP(3),
    "dataRecebimento" TIMESTAMP(3),
    "dataConferencia" TIMESTAMP(3),
    "dataFinalizacao" TIMESTAMP(3),
    "xmlOriginal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTransferencia" (
    "id" TEXT NOT NULL,
    "transferenciaId" TEXT NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ncm" TEXT NOT NULL,
    "cfop" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "separado" BOOLEAN NOT NULL DEFAULT false,
    "quantidadeConferida" INTEGER,
    "divergenciaTipo" "TipoDivergencia",
    "divergenciaQtd" INTEGER,
    "divergenciaObs" TEXT,
    "divergenciaFotos" TEXT[],

    CONSTRAINT "ItemTransferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAuditoria" (
    "id" TEXT NOT NULL,
    "transferenciaId" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,
    "fotos" TEXT[],

    CONSTRAINT "EventoAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpjMatriz_key" ON "Empresa"("cnpjMatriz");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_cnpj_key" ON "Unidade"("cnpj");

-- CreateIndex
CREATE INDEX "Unidade_empresaId_idx" ON "Unidade"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "UsuarioUnidade_unidadeId_idx" ON "UsuarioUnidade"("unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "RotaSLA_origemId_destinoId_key" ON "RotaSLA"("origemId", "destinoId");

-- CreateIndex
CREATE INDEX "Transferencia_origemId_status_idx" ON "Transferencia"("origemId", "status");

-- CreateIndex
CREATE INDEX "Transferencia_destinoId_status_idx" ON "Transferencia"("destinoId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_numeroNF_serie_origemId_key" ON "Transferencia"("numeroNF", "serie", "origemId");

-- CreateIndex
CREATE INDEX "ItemTransferencia_transferenciaId_idx" ON "ItemTransferencia"("transferenciaId");

-- CreateIndex
CREATE INDEX "EventoAuditoria_transferenciaId_idx" ON "EventoAuditoria"("transferenciaId");

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioUnidade" ADD CONSTRAINT "UsuarioUnidade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioUnidade" ADD CONSTRAINT "UsuarioUnidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaSLA" ADD CONSTRAINT "RotaSLA_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaSLA" ADD CONSTRAINT "RotaSLA_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_origemId_fkey" FOREIGN KEY ("origemId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transferencia" ADD CONSTRAINT "Transferencia_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransferencia" ADD CONSTRAINT "ItemTransferencia_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAuditoria" ADD CONSTRAINT "EventoAuditoria_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoAuditoria" ADD CONSTRAINT "EventoAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
