import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";
import type { NfeItem, NfeParsed } from "./nfeParser";

const RENDER_SCALE = 3; // resolução maior ajuda o OCR a acertar números pequenos da tabela
const TESSDATA_PATH = path.join(__dirname, "..", "..", "tessdata");

async function renderPdfPageToPng(buffer: Buffer): Promise<Buffer> {
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx as never, viewport }).promise;

  return canvas.toBuffer("image/png");
}

async function ocrPng(png: Buffer): Promise<string> {
  const worker = await createWorker("por", undefined, { langPath: TESSDATA_PATH, cachePath: TESSDATA_PATH });
  try {
    const { data } = await worker.recognize(png);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function primeiroValor<T>(match: RegExpMatchArray | null, transform: (grupo: string) => T): T | undefined {
  return match ? transform(match[1]) : undefined;
}

function parseNumeroBr(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function extrairCabecalho(texto: string) {
  const numeroNF = primeiroValor(texto.match(/N[ºo°]\.?\s*(\d{1,10})/i), (v) => v);
  const serie = primeiroValor(texto.match(/S[ÉE]RIE\s*(\d{1,3})/i), (v) => v);
  const numeroPedido = primeiroValor(texto.match(/Pedido:?\s*(\d+)/i), (v) => v);

  // O CNPJ do emitente fica na linha de valores logo abaixo do cabeçalho
  // "INSCRIÇÃO ESTADUAL ... CNPJ" — procuramos a primeira sequência de 14 dígitos
  // nas linhas próximas a essa etiqueta.
  const linhas = texto.split("\n");
  const idxCabecalhoCnpj = linhas.findIndex((l) => /\bCNPJ\b/.test(l) && !/CNPJ\/CPF/i.test(l));
  let emitenteCnpj = "";
  if (idxCabecalhoCnpj >= 0) {
    for (let i = idxCabecalhoCnpj; i < Math.min(idxCabecalhoCnpj + 3, linhas.length); i++) {
      const token = linhas[i].split(/\s+/).map(onlyDigits).find((t) => t.length === 14);
      if (token) {
        emitenteCnpj = token;
        break;
      }
    }
  }

  const destinatarioMatch = texto.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  const destinatarioCnpj = destinatarioMatch ? onlyDigits(destinatarioMatch[1]) : "";

  const dataEmissaoMatch = destinatarioMatch
    ? texto.slice(destinatarioMatch.index).match(/(\d{2})\/(\d{2})\/(\d{4})/)
    : texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const dataEmissao = dataEmissaoMatch
    ? new Date(`${dataEmissaoMatch[3]}-${dataEmissaoMatch[2]}-${dataEmissaoMatch[1]}T00:00:00`)
    : new Date();

  const idxValorNota = linhas.findIndex((l) => /VALOR TOTAL DA NOTA/i.test(l));
  let valorTotal = 0;
  if (idxValorNota >= 0 && linhas[idxValorNota + 1]) {
    const numeros = linhas[idxValorNota + 1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
    if (numeros?.length) valorTotal = parseNumeroBr(numeros[numeros.length - 1]);
  }

  const idxVolumes = linhas.findIndex((l) => /QUANTIDADE/i.test(l) && /PESO BRUTO/i.test(l));
  let qtdVolumes = 0;
  let pesoBruto = 0;
  if (idxVolumes >= 0 && linhas[idxVolumes + 1]) {
    const linhaValores = linhas[idxVolumes + 1];
    const inteiro = linhaValores.match(/\d+/);
    const decimal = linhaValores.match(/\d+,\d{2}/);
    if (inteiro) qtdVolumes = Number(inteiro[0]);
    if (decimal) pesoBruto = parseNumeroBr(decimal[0]);
  }

  return { numeroNF, serie, numeroPedido, emitenteCnpj, destinatarioCnpj, dataEmissao, valorTotal, qtdVolumes, pesoBruto };
}

// O cabeçalho da tabela de itens ("Código | Descrição | NCM ...") costuma ter
// colunas finas demais para o OCR reconhecer de forma confiável, então em vez
// de ancorar pelo cabeçalho, procuramos diretamente linhas que casam com o
// formato de uma linha de item (código, descrição, NCM de 8 dígitos, CFOP,
// unidade, quantidade, valores) em todo o texto, parando em "FIM DOS PRODUTOS"
// quando esse marcador é reconhecido.
const LINHA_ITEM_REGEX =
  /^(\d{4,10})\s+(.+?)\s+(\d{8})\s*[[|]?\s*(\d{2,3})\s*[[|]?\s*(\d{4})\s*[|]?\s*([A-Z]{1,4})\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)/;

function extrairItens(texto: string): NfeItem[] {
  const linhas = texto.split("\n");
  const fim = linhas.findIndex((l) => /FIM DOS PRODUTOS/i.test(l));

  const itens: NfeItem[] = [];
  for (let i = 0; i < (fim > 0 ? fim : linhas.length); i++) {
    const linha = linhas[i].replace(/[[\]|]/g, " ").trim();
    const match = linha.match(LINHA_ITEM_REGEX);
    if (!match) continue;
    itens.push({
      codigoInterno: match[1],
      descricao: match[2].trim(),
      ncm: match[3],
      cfop: match[5],
      quantidade: Number(match[7]),
    });
  }

  return itens;
}

export async function parseDanfePdf(buffer: Buffer): Promise<NfeParsed> {
  const png = await renderPdfPageToPng(buffer);
  const texto = await ocrPng(png);

  const cabecalho = extrairCabecalho(texto);
  const itens = extrairItens(texto);

  if (!cabecalho.numeroNF || !cabecalho.emitenteCnpj || !cabecalho.destinatarioCnpj) {
    throw new Error(
      "Não foi possível extrair os dados essenciais do PDF (NF, CNPJ emitente/destinatário). Confira o arquivo ou use o XML da NF-e.",
    );
  }

  return {
    numeroNF: cabecalho.numeroNF,
    serie: cabecalho.serie ?? "1",
    numeroPedido: cabecalho.numeroPedido ?? "",
    emitenteCnpj: cabecalho.emitenteCnpj,
    emitenteNome: "",
    destinatarioCnpj: cabecalho.destinatarioCnpj,
    destinatarioNome: "",
    dataEmissao: cabecalho.dataEmissao,
    valorTotal: cabecalho.valorTotal,
    qtdVolumes: cabecalho.qtdVolumes,
    pesoBruto: cabecalho.pesoBruto,
    itens,
  };
}
