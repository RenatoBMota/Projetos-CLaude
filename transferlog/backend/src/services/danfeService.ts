import fs from "node:fs/promises";
import path from "node:path";
import { parseNfeXmlCompleto } from "./nfeXmlCompletoParser";
import { gerarDanfePdf } from "./danfeGerador";

export interface DanfeResultado {
  buffer: Buffer;
  nomeArquivo: string;
}

/**
 * Devolve a DANFE de uma transferência: se a nota foi enviada em PDF (DANFE
 * escaneada/OCR), o próprio arquivo original já é a DANFE. Se foi enviada em
 * XML, a DANFE é gerada a partir do XML original preservado no upload.
 */
export async function obterDanfe(numeroNF: string, xmlOriginal: string | null): Promise<DanfeResultado> {
  if (!xmlOriginal) {
    throw new Error("Arquivo original da NF não está disponível para esta transferência");
  }

  const ehPdf = path.extname(xmlOriginal).toLowerCase() === ".pdf";
  const conteudo = await fs.readFile(xmlOriginal, ehPdf ? undefined : "utf-8");

  if (ehPdf) {
    return { buffer: conteudo as Buffer, nomeArquivo: `DANFE-${numeroNF}.pdf` };
  }

  const nfe = parseNfeXmlCompleto(conteudo as string);
  const buffer = await gerarDanfePdf(nfe);
  return { buffer, nomeArquivo: `DANFE-${numeroNF}.pdf` };
}
