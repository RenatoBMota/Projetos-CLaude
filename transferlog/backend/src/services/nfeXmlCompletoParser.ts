import { XMLParser } from "fast-xml-parser";

export interface EnderecoCompleto {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  fone?: string;
}

export interface ParticipanteCompleto {
  nome: string;
  cnpj?: string;
  cpf?: string;
  ie?: string;
  endereco: EnderecoCompleto;
}

export interface ItemCompleto {
  numero: number;
  codigo: string;
  ean?: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  cstIcms?: string;
  baseCalculoIcms: number;
  aliquotaIcms: number;
  valorIcms: number;
  aliquotaIpi?: number;
  valorIpi?: number;
}

export interface TransportadoraCompleta {
  nome?: string;
  cnpj?: string;
  cpf?: string;
  ie?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  placa?: string;
  ufVeiculo?: string;
}

export interface VolumeCompleto {
  quantidade?: number;
  especie?: string;
  marca?: string;
  numeracao?: string;
  pesoLiquido?: number;
  pesoBruto?: number;
}

export interface NfeCompleta {
  chaveAcesso: string;
  numeroNF: string;
  serie: string;
  naturezaOperacao: string;
  dataEmissao: Date | null;
  dataSaidaEntrada: Date | null;
  tpAmb: string;
  protocolo?: string;
  dataAutorizacao: Date | null;

  emitente: ParticipanteCompleto;
  destinatario: ParticipanteCompleto;

  itens: ItemCompleto[];

  valorBaseCalculoIcms: number;
  valorIcms: number;
  valorBaseCalculoIcmsSt: number;
  valorIcmsSt: number;
  valorTotalProdutos: number;
  valorFrete: number;
  valorSeguro: number;
  valorDesconto: number;
  valorOutrasDespesas: number;
  valorIpi: number;
  valorTotalNota: number;

  modalidadeFrete: string;
  transportadora?: TransportadoraCompleta;
  volumes: VolumeCompleto[];

  informacoesComplementares?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function opt(value: unknown): string | undefined {
  const s = str(value);
  return s === "" ? undefined : s;
}

const MODALIDADE_FRETE: Record<string, string> = {
  "0": "Contratação do frete por conta do remetente (CIF)",
  "1": "Contratação do frete por conta do destinatário (FOB)",
  "2": "Contratação do frete por conta de terceiros",
  "3": "Transporte próprio por conta do remetente",
  "4": "Transporte próprio por conta do destinatário",
  "9": "Sem frete",
};

function extrairEndereco(ender: any): EnderecoCompleto {
  return {
    logradouro: str(ender?.xLgr),
    numero: str(ender?.nro),
    complemento: opt(ender?.xCpl),
    bairro: str(ender?.xBairro),
    municipio: str(ender?.xMun),
    uf: str(ender?.UF),
    cep: str(ender?.CEP),
    fone: opt(ender?.fone),
  };
}

function extrairParticipante(node: any, enderTag: "enderEmit" | "enderDest"): ParticipanteCompleto {
  return {
    nome: str(node?.xNome),
    cnpj: opt(node?.CNPJ),
    cpf: opt(node?.CPF),
    ie: opt(node?.IE),
    endereco: extrairEndereco(node?.[enderTag]),
  };
}

/** Pega o primeiro grupo definido dentro de ICMS (varia por CST/CSOSN: ICMS00, ICMS60, ICMSSN102...). */
function grupoIcms(imposto: any): any {
  const icms = imposto?.ICMS;
  if (!icms) return {};
  const primeiro = Object.values(icms)[0];
  return primeiro ?? {};
}

/** IPI vem em IPITrib (tributado, com alíquota/valor) ou IPINT (não tributado). */
function grupoIpi(imposto: any): any {
  const ipi = imposto?.IPI;
  return ipi?.IPITrib ?? {};
}

export function parseNfeXmlCompleto(xml: string): NfeCompleta {
  const doc = parser.parse(xml);
  const nfeProc = doc.nfeProc ?? doc;
  const nfe = nfeProc.NFe ?? nfeProc;
  const infNFe = nfe.infNFe;
  if (!infNFe) {
    throw new Error("XML não corresponde ao layout de NF-e (infNFe não encontrado)");
  }

  const ide = infNFe.ide ?? {};
  const emit = infNFe.emit ?? {};
  const dest = infNFe.dest ?? {};
  const total = infNFe.total?.ICMSTot ?? {};
  const transp = infNFe.transp ?? {};
  const det = asArray(infNFe.det);
  const infProt = nfeProc.protNFe?.infProt;

  const chaveBruta = str(infNFe["@_Id"]);
  const chaveAcesso = chaveBruta.replace(/^NFe/i, "");

  const itens: ItemCompleto[] = det.map((d: any, i: number) => {
    const prod = d.prod ?? {};
    const icms = grupoIcms(d.imposto);
    const ipi = grupoIpi(d.imposto);
    return {
      numero: Number(d["@_nItem"] ?? i + 1),
      codigo: str(prod.cProd),
      ean: opt(prod.cEAN),
      descricao: str(prod.xProd),
      ncm: str(prod.NCM),
      cfop: str(prod.CFOP),
      unidade: str(prod.uCom),
      quantidade: num(prod.qCom),
      valorUnitario: num(prod.vUnCom),
      valorTotal: num(prod.vProd),
      cstIcms: opt(icms.CST ?? icms.CSOSN),
      baseCalculoIcms: num(icms.vBC),
      aliquotaIcms: num(icms.pICMS),
      valorIcms: num(icms.vICMS),
      aliquotaIpi: ipi.pIPI !== undefined ? num(ipi.pIPI) : undefined,
      valorIpi: ipi.vIPI !== undefined ? num(ipi.vIPI) : undefined,
    };
  });

  const volumes: VolumeCompleto[] = asArray(transp.vol).map((v: any) => ({
    quantidade: v.qVol !== undefined ? num(v.qVol) : undefined,
    especie: opt(v.esp),
    marca: opt(v.marca),
    numeracao: opt(v.nVol),
    pesoLiquido: v.pesoL !== undefined ? num(v.pesoL) : undefined,
    pesoBruto: v.pesoB !== undefined ? num(v.pesoB) : undefined,
  }));

  const transporta = transp.transporta;
  const veic = transp.veicTransp;
  const transportadora: TransportadoraCompleta | undefined =
    transporta || veic
      ? {
          nome: opt(transporta?.xNome),
          cnpj: opt(transporta?.CNPJ),
          cpf: opt(transporta?.CPF),
          ie: opt(transporta?.IE),
          endereco: opt(transporta?.xEnder),
          municipio: opt(transporta?.xMun),
          uf: opt(transporta?.UF),
          placa: opt(veic?.placa),
          ufVeiculo: opt(veic?.UF),
        }
      : undefined;

  return {
    chaveAcesso,
    numeroNF: str(ide.nNF),
    serie: str(ide.serie),
    naturezaOperacao: str(ide.natOp),
    dataEmissao: ide.dhEmi ? new Date(ide.dhEmi) : ide.dEmi ? new Date(`${ide.dEmi}T12:00:00-03:00`) : null,
    dataSaidaEntrada: ide.dhSaiEnt ? new Date(ide.dhSaiEnt) : null,
    tpAmb: str(ide.tpAmb ?? "1"),
    protocolo: opt(infProt?.nProt),
    dataAutorizacao: infProt?.dhRecbto ? new Date(infProt.dhRecbto) : null,

    emitente: extrairParticipante(emit, "enderEmit"),
    destinatario: extrairParticipante(dest, "enderDest"),

    itens,

    valorBaseCalculoIcms: num(total.vBC),
    valorIcms: num(total.vICMS),
    valorBaseCalculoIcmsSt: num(total.vBCST),
    valorIcmsSt: num(total.vICMSST),
    valorTotalProdutos: num(total.vProd),
    valorFrete: num(total.vFrete),
    valorSeguro: num(total.vSeg),
    valorDesconto: num(total.vDesc),
    valorOutrasDespesas: num(total.vOutro),
    valorIpi: num(total.vIPI),
    valorTotalNota: num(total.vNF),

    modalidadeFrete: MODALIDADE_FRETE[str(transp.modFrete)] ?? "Não informado",
    transportadora,
    volumes,

    informacoesComplementares: opt(infNFe.infAdic?.infCpl),
  };
}
