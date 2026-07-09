-- Sinaliza se a hora de dataEmissao veio de fonte confiável (XML sempre;
-- OCR de PDF só quando o protocolo de autorização com data/hora foi extraído).
-- Registros existentes assumem true (comportamento inalterado para eles).
ALTER TABLE "Transferencia" ADD COLUMN "dataEmissaoConfiavel" BOOLEAN NOT NULL DEFAULT true;
