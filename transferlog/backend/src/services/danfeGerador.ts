import PDFDocument from "pdfkit";
import * as bwipjs from "bwip-js";
import type { NfeCompleta, ItemCompleto } from "./nfeXmlCompletoParser";

const MARGEM = 24;
const LARGURA_PAGINA = 595.28;
const ALTURA_PAGINA = 841.89;
const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;
const LIMITE_INFERIOR = ALTURA_PAGINA - MARGEM - 20;

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moedaPrecisa(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function dataHora(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dataCurta(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function horaCurta(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

function chaveFormatada(chave: string): string {
  return (chave.match(/.{1,4}/g) ?? [chave]).join(" ");
}

function formatarCnpj(v?: string): string {
  if (!v || v.length !== 14) return v ?? "—";
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatarCpf(v?: string): string {
  if (!v || v.length !== 11) return v ?? "—";
  return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarDocumento(cnpj?: string, cpf?: string): string {
  if (cnpj) return formatarCnpj(cnpj);
  if (cpf) return formatarCpf(cpf);
  return "—";
}

async function gerarBarcodeBuffer(chave: string): Promise<Buffer | null> {
  if (!chave) return null;
  try {
    return await bwipjs.toBuffer({
      bcid: "code128",
      text: chave,
      scale: 2,
      height: 12,
      includetext: false,
    });
  } catch {
    return null;
  }
}

interface CampoGrade {
  label: string;
  valor: string;
  frac: number;
}

/** Desenha uma linha de células lado a lado, cada uma com label pequeno em cima e valor em negrito embaixo. */
function linhaGrade(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  largura: number,
  altura: number,
  campos: CampoGrade[],
  offsetValor = 10,
) {
  let cx = x;
  for (const c of campos) {
    const w = c.frac * largura;
    doc.rect(cx, y, w, altura).stroke();
    doc.fontSize(5.5).font("Helvetica").text(c.label, cx + 2, y + 2, { width: w - 4 });
    doc.fontSize(7).font("Helvetica-Bold").text(c.valor, cx + 2, y + offsetValor, {
      width: w - 4,
      height: altura - offsetValor - 2,
      ellipsis: true,
    });
    cx += w;
  }
}

function tituloSecao(doc: PDFKit.PDFDocument, x: number, y: number, texto: string) {
  doc.fontSize(6).font("Helvetica").text(texto, x, y);
}

export async function gerarDanfePdf(nfe: NfeCompleta): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGEM, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const pronto = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const emHomologacao = nfe.tpAmb === "2";

  let y = MARGEM;

  // Canhoto (recibo do destinatário)
  const alturaCanhoto = 50;
  const largCanhotoDireita = 110;
  const largCanhotoEsquerda = LARGURA_UTIL - largCanhotoDireita;
  doc.rect(MARGEM, y, largCanhotoEsquerda, alturaCanhoto).stroke();
  doc.fontSize(7).font("Helvetica").text("RECEBEMOS DE ", MARGEM + 3, y + 3, { continued: true });
  doc.font("Helvetica-Bold").text(nfe.emitente.nome, { continued: false });
  doc.font("Helvetica").fontSize(6).text(
    "OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO",
    MARGEM + 3,
    y + 13,
    { width: largCanhotoEsquerda - 6 },
  );
  doc.moveTo(MARGEM, y + 34).lineTo(MARGEM + largCanhotoEsquerda, y + 34).stroke();
  doc.rect(MARGEM, y + 34, largCanhotoEsquerda * 0.4, alturaCanhoto - 34).stroke();
  doc.fontSize(5.5).text("DATA DE RECEBIMENTO", MARGEM + 3, y + 37);
  doc.rect(MARGEM + largCanhotoEsquerda * 0.4, y + 34, largCanhotoEsquerda * 0.6, alturaCanhoto - 34).stroke();
  doc.fontSize(5.5).text("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", MARGEM + largCanhotoEsquerda * 0.4 + 3, y + 37);

  const xCanhotoDireita = MARGEM + largCanhotoEsquerda;
  doc.rect(xCanhotoDireita, y, largCanhotoDireita, alturaCanhoto).stroke();
  doc.fontSize(9).font("Helvetica-Bold").text("NF-e", xCanhotoDireita + 5, y + 6);
  doc.fontSize(7).text(`Nº. ${nfe.numeroNF}`, xCanhotoDireita + 5, y + 22);
  doc.text(`SÉRIE ${nfe.serie}`, xCanhotoDireita + 5, y + 34);
  y += alturaCanhoto + 5;

  // Bloco "Identificação do Emitente" — inclui DANFE, chave/barcode, natureza,
  // protocolo e IE/CNPJ, exatamente como no leiaute oficial (um único quadro).
  const alturaTopo = 94;
  const largEmit = LARGURA_UTIL * 0.34;
  const largDanfe = LARGURA_UTIL * 0.18;
  const largChave = LARGURA_UTIL - largEmit - largDanfe;

  doc.rect(MARGEM, y, largEmit, alturaTopo).stroke();
  doc.fontSize(6).font("Helvetica-Bold").text("IDENTIFICAÇÃO DO EMITENTE", MARGEM + 3, y + 3, { width: largEmit - 6 });
  doc.fontSize(8).font("Helvetica-Bold").text(nfe.emitente.nome, MARGEM + 3, y + 13, { width: largEmit - 6 });
  const endEmit = `${nfe.emitente.endereco.logradouro}, ${nfe.emitente.endereco.numero} - ${nfe.emitente.endereco.bairro} - ${nfe.emitente.endereco.municipio}/${nfe.emitente.endereco.uf}`;
  doc.fontSize(6.5).font("Helvetica").text(endEmit, MARGEM + 3, y + 25, { width: largEmit - 6 });
  doc.text(`CEP: ${nfe.emitente.endereco.cep}`, MARGEM + 3, y + 37, { width: largEmit - 6 });
  if (nfe.emitente.endereco.fone) {
    doc.text(`Fone: ${nfe.emitente.endereco.fone}`, MARGEM + 3, y + 47, { width: largEmit - 6 });
  }

  const xDanfe = MARGEM + largEmit;
  doc.rect(xDanfe, y, largDanfe, alturaTopo).stroke();
  doc.fontSize(15).font("Helvetica-Bold").text("DANFE", xDanfe + 4, y + 4, { width: largDanfe - 8 });
  doc.fontSize(5.5).font("Helvetica").text("Documento Auxiliar da Nota Fiscal Eletrônica", xDanfe + 4, y + 22, { width: largDanfe - 8 });
  doc.fontSize(5.5).text("0 - ENTRADA", xDanfe + 4, y + 40);
  doc.text("1 - SAÍDA", xDanfe + 4, y + 48);
  doc.rect(xDanfe + largDanfe - 24, y + 38, 16, 16).stroke();
  doc.fontSize(9).font("Helvetica-Bold").text("1", xDanfe + largDanfe - 20, y + 42);
  doc.fontSize(6.5).text(`Nº ${nfe.numeroNF}`, xDanfe + 4, y + 60);
  doc.text(`Série ${nfe.serie}`, xDanfe + 4, y + 70);
  // "FL x de N" é carimbado depois, quando o total de páginas já é conhecido.

  const xChave = xDanfe + largDanfe;
  doc.rect(xChave, y, largChave, alturaTopo).stroke();
  const barcode = await gerarBarcodeBuffer(nfe.chaveAcesso);
  if (barcode) {
    doc.image(barcode, xChave + 6, y + 3, { width: largChave - 12, height: 28 });
  }
  doc.fontSize(6.5).font("Helvetica-Bold").text(chaveFormatada(nfe.chaveAcesso) || "—", xChave + 6, y + 33, {
    width: largChave - 12,
  });
  doc.fontSize(5.5).font("Helvetica").text(
    "Consulta de autenticidade no portal nacional da NF-e ou no site da SEFAZ autorizadora",
    xChave + 6,
    y + 45,
    { width: largChave - 12 },
  );
  doc.text("PROTOCOLO DE AUTORIZAÇÃO DE USO", xChave + 6, y + 60);
  doc.fontSize(6.5).font("Helvetica-Bold").text(
    nfe.protocolo ? `${nfe.protocolo}  ${dataHora(nfe.dataAutorizacao)}` : "—",
    xChave + 6,
    y + 68,
    { width: largChave - 12 },
  );
  if (emHomologacao) {
    doc.fontSize(7).fillColor("red").text("SEM VALOR FISCAL — HOMOLOGAÇÃO", xChave + 6, y + 33, { width: largChave - 12 });
    doc.fillColor("black");
  }
  y += alturaTopo;

  // Natureza da operação | Protocolo (linha adicional dentro do mesmo quadro do emitente)
  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 22, [
    { label: "NATUREZA DA OPERAÇÃO", valor: nfe.naturezaOperacao || "—", frac: 0.65 },
    { label: "PROTOCOLO DE AUTORIZAÇÃO (DATA E HORA)", valor: nfe.protocolo ? dataHora(nfe.dataAutorizacao) : "—", frac: 0.35 },
  ]);
  y += 22;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 22, [
    { label: "INSCRIÇÃO ESTADUAL", valor: nfe.emitente.ie ?? "—", frac: 0.34 },
    { label: "INSC. EST. DO SUBST. TRIBUTÁRIO", valor: "—", frac: 0.33 },
    { label: "CNPJ", valor: formatarDocumento(nfe.emitente.cnpj, nfe.emitente.cpf), frac: 0.33 },
  ]);
  y += 22 + 6;

  // Destinatário/remetente
  y = desenharDestinatario(doc, y, nfe);

  // Cálculo do imposto
  y = desenharCalculoImposto(doc, y, nfe);

  // Transportador / volumes
  y = desenharTransporte(doc, y, nfe);

  // Itens — pode ocupar múltiplas páginas
  y = desenharItens(doc, y, nfe.itens);

  // Cálculo do ISSQN (seção padrão da DANFE; sempre em branco para transferências de mercadoria)
  if (y + 24 > LIMITE_INFERIOR) {
    doc.addPage();
    y = MARGEM;
  }
  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 24, [
    { label: "INSCRIÇÃO MUNICIPAL", valor: "—", frac: 0.25 },
    { label: "VALOR TOTAL DOS SERVIÇOS", valor: "—", frac: 0.25 },
    { label: "BASE DE CÁLCULO DO ISSQN", valor: "—", frac: 0.25 },
    { label: "VALOR DO ISSQN", valor: "—", frac: 0.25 },
  ]);
  y += 24 + 6;

  // Dados adicionais
  if (y + 70 > LIMITE_INFERIOR) {
    doc.addPage();
    y = MARGEM;
  }
  const alturaAdic = 90;
  const largComplementares = LARGURA_UTIL * 0.7;
  doc.rect(MARGEM, y, largComplementares, alturaAdic).stroke();
  tituloSecao(doc, MARGEM + 3, y + 2, "DADOS ADICIONAIS — INFORMAÇÕES COMPLEMENTARES");
  doc.fontSize(6.5).font("Helvetica").text(
    nfe.informacoesComplementares || "—",
    MARGEM + 3,
    y + 12,
    { width: largComplementares - 6, height: alturaAdic - 16 },
  );
  doc.rect(MARGEM + largComplementares, y, LARGURA_UTIL - largComplementares, alturaAdic).stroke();
  tituloSecao(doc, MARGEM + largComplementares + 3, y + 2, "RESERVADO AO FISCO");

  // Numeração de páginas ("FL x de N"): o quadro do cabeçalho só existe na página 1.
  const totalPaginas = doc.bufferedPageRange().count;
  doc.switchToPage(0);
  doc.fontSize(6.5).font("Helvetica").text(`FL 1 de ${totalPaginas}`, xDanfe + 4, MARGEM + alturaCanhoto + 5 + 80);

  doc.end();
  return pronto;
}

function desenharDestinatario(doc: PDFKit.PDFDocument, y: number, nfe: NfeCompleta): number {
  const d = nfe.destinatario;
  tituloSecao(doc, MARGEM, y, "DESTINATÁRIO/REMETENTE");
  y += 8;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "NOME/RAZÃO SOCIAL", valor: d.nome, frac: 0.55 },
    { label: "CNPJ/CPF", valor: formatarDocumento(d.cnpj, d.cpf), frac: 0.25 },
    { label: "DATA DA EMISSÃO", valor: dataCurta(nfe.dataEmissao), frac: 0.2 },
  ]);
  y += 20;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "ENDEREÇO", valor: `${d.endereco.logradouro}, ${d.endereco.numero}`, frac: 0.45 },
    { label: "BAIRRO/DISTRITO", valor: d.endereco.bairro, frac: 0.2 },
    { label: "CEP", valor: d.endereco.cep, frac: 0.15 },
    { label: "DATA DA ENTRADA/SAÍDA", valor: dataCurta(nfe.dataSaidaEntrada), frac: 0.2 },
  ]);
  y += 20;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "MUNICÍPIO", valor: d.endereco.municipio, frac: 0.25 },
    { label: "FONE/FAX", valor: d.endereco.fone ?? "—", frac: 0.17 },
    { label: "UF", valor: d.endereco.uf, frac: 0.08 },
    { label: "INSCRIÇÃO ESTADUAL", valor: d.ie ?? "—", frac: 0.25 },
    { label: "HORA DE SAÍDA", valor: horaCurta(nfe.dataSaidaEntrada), frac: 0.25 },
  ]);
  y += 20;

  doc.rect(MARGEM, y, LARGURA_UTIL, 16).stroke();
  doc.fontSize(5.5).font("Helvetica").text("FATURA", MARGEM + 3, y + 2);
  y += 16 + 6;

  return y;
}

function desenharCalculoImposto(doc: PDFKit.PDFDocument, y: number, nfe: NfeCompleta): number {
  tituloSecao(doc, MARGEM, y, "CÁLCULO DO IMPOSTO");
  y += 8;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "BASE DE CÁLCULO DO ICMS", valor: moeda(nfe.valorBaseCalculoIcms), frac: 0.2 },
    { label: "VALOR DO ICMS", valor: moeda(nfe.valorIcms), frac: 0.2 },
    { label: "BASE DE CÁLCULO DO ICMS ST", valor: moeda(nfe.valorBaseCalculoIcmsSt), frac: 0.2 },
    { label: "VALOR DO ICMS SUBSTITUIÇÃO", valor: moeda(nfe.valorIcmsSt), frac: 0.2 },
    { label: "VALOR TOTAL DOS PRODUTOS", valor: moeda(nfe.valorTotalProdutos), frac: 0.2 },
  ]);
  y += 20;

  linhaGrade(
    doc,
    MARGEM,
    y,
    LARGURA_UTIL,
    26,
    [
      { label: "VALOR DO FRETE", valor: moeda(nfe.valorFrete), frac: 1 / 6 },
      { label: "VALOR DO SEGURO", valor: moeda(nfe.valorSeguro), frac: 1 / 6 },
      { label: "VALOR DO DESCONTO", valor: moeda(nfe.valorDesconto), frac: 1 / 6 },
      { label: "OUTRAS DESPESAS ACESSÓRIAS", valor: moeda(nfe.valorOutrasDespesas), frac: 1 / 6 },
      { label: "VALOR DO IPI", valor: moeda(nfe.valorIpi), frac: 1 / 6 },
      { label: "VALOR TOTAL DA NOTA", valor: moeda(nfe.valorTotalNota), frac: 1 / 6 },
    ],
    16,
  );
  y += 26 + 6;

  return y;
}

function desenharTransporte(doc: PDFKit.PDFDocument, y: number, nfe: NfeCompleta): number {
  const t = nfe.transportadora;
  tituloSecao(doc, MARGEM, y, "TRANSPORTADOR/VOLUMES TRANSPORTADOS");
  y += 8;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "RAZÃO SOCIAL", valor: t?.nome ?? "—", frac: 0.32 },
    { label: "FRETE POR CONTA", valor: nfe.modalidadeFrete, frac: 0.16 },
    { label: "CÓDIGO ANTT", valor: "—", frac: 0.1 },
    { label: "PLACA DO VEÍCULO", valor: t?.placa ?? "—", frac: 0.14 },
    { label: "UF", valor: t?.ufVeiculo ?? "—", frac: 0.06 },
    { label: "CNPJ/CPF", valor: formatarDocumento(t?.cnpj, t?.cpf), frac: 0.22 },
  ]);
  y += 20;

  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "LOGRADOURO", valor: t?.endereco ?? "—", frac: 0.5 },
    { label: "MUNICÍPIO", valor: t?.municipio ?? "—", frac: 0.3 },
    { label: "UF", valor: t?.uf ?? "—", frac: 0.08 },
    { label: "INSCRIÇÃO ESTADUAL", valor: t?.ie ?? "—", frac: 0.12 },
  ]);
  y += 20;

  const vol = nfe.volumes[0];
  linhaGrade(doc, MARGEM, y, LARGURA_UTIL, 20, [
    { label: "QUANTIDADE", valor: vol?.quantidade !== undefined ? String(vol.quantidade) : "—", frac: 0.16 },
    { label: "ESPÉCIE", valor: vol?.especie ?? "—", frac: 0.21 },
    { label: "MARCA", valor: vol?.marca ?? "—", frac: 0.21 },
    { label: "NUMERAÇÃO", valor: vol?.numeracao ?? "—", frac: 0.14 },
    { label: "PESO BRUTO", valor: vol?.pesoBruto !== undefined ? vol.pesoBruto.toFixed(3) : "—", frac: 0.14 },
    { label: "PESO LÍQUIDO", valor: vol?.pesoLiquido !== undefined ? vol.pesoLiquido.toFixed(3) : "—", frac: 0.14 },
  ]);
  y += 20 + 6;

  return y;
}

const COLUNAS_ITENS: Array<{ label: string; largura: number; align?: "left" | "right" }> = [
  { label: "CÓDIGO", largura: 0.06 },
  { label: "DESCRIÇÃO DO PRODUTO/SERVIÇO", largura: 0.22 },
  { label: "NCM/SH", largura: 0.07 },
  { label: "CST", largura: 0.04 },
  { label: "CFOP", largura: 0.05 },
  { label: "UND", largura: 0.04 },
  { label: "QTD", largura: 0.05, align: "right" },
  { label: "V.UN.", largura: 0.08, align: "right" },
  { label: "V.TOTAL", largura: 0.08, align: "right" },
  { label: "BC.ICMS", largura: 0.07, align: "right" },
  { label: "V.ICMS", largura: 0.07, align: "right" },
  { label: "V.IPI", largura: 0.06, align: "right" },
  { label: "ALIQ.ICMS", largura: 0.06, align: "right" },
  { label: "ALIQ.IPI", largura: 0.05, align: "right" },
];

function desenharCabecalhoItens(doc: PDFKit.PDFDocument, y: number): number {
  const altura = 18;
  doc.rect(MARGEM, y, LARGURA_UTIL, altura).stroke();
  let x = MARGEM;
  doc.fontSize(5.5).font("Helvetica-Bold");
  for (const col of COLUNAS_ITENS) {
    const largura = col.largura * LARGURA_UTIL;
    doc.text(col.label, x + 2, y + 5, { width: largura - 4, align: col.align ?? "left" });
    x += largura;
  }
  return y + altura;
}

function desenharItens(doc: PDFKit.PDFDocument, yInicial: number, itens: ItemCompleto[]): number {
  let y = yInicial;
  tituloSecao(doc, MARGEM, y, "DADOS DO PRODUTO/SERVIÇO");
  y += 8;
  y = desenharCabecalhoItens(doc, y);

  const alturaLinha = 14;
  for (const item of itens) {
    if (y + alturaLinha > LIMITE_INFERIOR) {
      doc.addPage();
      y = MARGEM;
      y = desenharCabecalhoItens(doc, y);
    }
    let x = MARGEM;
    const valores = [
      item.codigo,
      item.descricao,
      item.ncm,
      item.cstIcms ?? "—",
      item.cfop,
      item.unidade,
      item.quantidade.toLocaleString("pt-BR"),
      moedaPrecisa(item.valorUnitario),
      moeda(item.valorTotal),
      moeda(item.baseCalculoIcms),
      moeda(item.valorIcms),
      item.valorIpi !== undefined ? moeda(item.valorIpi) : "0,00",
      moeda(item.aliquotaIcms),
      item.aliquotaIpi !== undefined ? moeda(item.aliquotaIpi) : "0,00",
    ];
    doc.fontSize(6).font("Helvetica");
    valores.forEach((valor, i) => {
      const col = COLUNAS_ITENS[i];
      const largura = col.largura * LARGURA_UTIL;
      doc.text(valor, x + 2, y + 3, { width: largura - 4, align: col.align ?? "left" });
      x += largura;
    });
    doc.rect(MARGEM, y, LARGURA_UTIL, alturaLinha).stroke();
    y += alturaLinha;
  }

  doc.fontSize(6).font("Helvetica-Bold").text("FIM DOS PRODUTOS", MARGEM, y + 3);
  return y + 12;
}
