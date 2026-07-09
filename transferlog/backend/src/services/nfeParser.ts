import { XMLParser } from "fast-xml-parser";

export interface NfeItem {
  codigoInterno: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
}

export interface NfeParsed {
  numeroNF: string;
  serie: string;
  numeroPedido: string;
  emitenteCnpj: string;
  /** Nem sempre disponível (ex: extração via OCR de PDF) — apenas informativo, não é usado para resolver a unidade. */
  emitenteNome?: string;
  destinatarioCnpj: string;
  destinatarioNome?: string;
  dataEmissao: Date;
  /** Falso quando a hora de dataEmissao não é confiável (ex.: OCR sem o horário do protocolo de autorização). */
  dataEmissaoConfiavel: boolean;
  valorTotal: number;
  qtdVolumes: number;
  pesoBruto: number;
  itens: NfeItem[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // CNPJ e outros campos numéricos da NF-e têm zeros à esquerda significativos
  // (ex: CNPJ "03554020006550") que o parser numérico removeria.
  parseTagValue: false,
});

function onlyDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function extractNumeroPedido(det: any[], infCpl: string | undefined): string {
  const primeiroPedido = det
    .map((d) => d?.prod?.xPed)
    .find((xPed) => xPed !== undefined);
  if (primeiroPedido) return String(primeiroPedido);

  if (infCpl) {
    const match = infCpl.match(/pedido[:\s]*n?[ºo°]?\s*([0-9]+)/i);
    if (match) return match[1];
  }
  return "";
}

export function parseNfeXml(xml: string): NfeParsed {
  const doc = parser.parse(xml);
  const nfeProc = doc.nfeProc ?? doc;
  const nfe = nfeProc.NFe ?? nfeProc;
  const infNFe = nfe.infNFe;
  if (!infNFe) {
    throw new Error("XML não corresponde ao layout de NF-e (infNFe não encontrado)");
  }

  const ide = infNFe.ide;
  const emit = infNFe.emit;
  const dest = infNFe.dest;
  const total = infNFe.total?.ICMSTot;
  const transp = infNFe.transp;
  const det = asArray(infNFe.det);
  const infCpl = infNFe.infAdic?.infCpl;

  const volumes = asArray(transp?.vol);
  const qtdVolumes = volumes.reduce((acc, v) => acc + Number(v?.qVol ?? 0), 0);
  const pesoBruto = volumes.reduce((acc, v) => acc + Number(v?.pesoB ?? 0), 0);

  const itens: NfeItem[] = det.map((d) => ({
    codigoInterno: String(d.prod.cProd),
    descricao: String(d.prod.xProd),
    ncm: String(d.prod.NCM),
    cfop: String(d.prod.CFOP),
    quantidade: Number(d.prod.qCom),
  }));

  return {
    numeroNF: String(ide.nNF),
    serie: String(ide.serie),
    numeroPedido: extractNumeroPedido(det, infCpl),
    emitenteCnpj: onlyDigits(emit.CNPJ),
    emitenteNome: String(emit.xNome),
    destinatarioCnpj: onlyDigits(dest.CNPJ),
    destinatarioNome: String(dest.xNome),
    // dhEmi já traz o horário com offset (ex.: "2026-07-04T10:00:00-03:00"), confiável.
    // dEmi (layout antigo, sem hora) é só a data — evitamos inventar um horário.
    dataEmissao: ide.dhEmi ? new Date(ide.dhEmi) : new Date(`${ide.dEmi}T12:00:00-03:00`),
    dataEmissaoConfiavel: Boolean(ide.dhEmi),
    valorTotal: Number(total?.vNF ?? 0),
    qtdVolumes,
    pesoBruto,
    itens,
  };
}

export function contarSkusDistintos(itens: NfeItem[]): number {
  return new Set(itens.map((i) => i.codigoInterno)).size;
}

export function contarItensTotal(itens: NfeItem[]): number {
  return itens.reduce((acc, i) => acc + i.quantidade, 0);
}
