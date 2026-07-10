import PDFDocument from "pdfkit";
import * as bwipjs from "bwip-js";
import type { NfeCompleta, ItemCompleto } from "./nfeXmlCompletoParser";

const MARGEM = 28;
const LARGURA_PAGINA = 595.28;
const LARGURA_UTIL = LARGURA_PAGINA - MARGEM * 2;

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataHora(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function dataCurta(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function chaveFormatada(chave: string): string {
  return (chave.match(/.{1,4}/g) ?? [chave]).join(" ");
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

function caixa(doc: PDFKit.PDFDocument, x: number, y: number, largura: number, altura: number, titulo: string) {
  doc.rect(x, y, largura, altura).stroke();
  doc.fontSize(6).font("Helvetica").text(titulo, x + 3, y + 2, { width: largura - 6 });
}

function campo(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  largura: number,
  valor: string,
  tamanho = 8,
) {
  doc.fontSize(tamanho).font("Helvetica-Bold").text(valor, x + 3, y + 10, { width: largura - 6 });
}

export async function gerarDanfePdf(nfe: NfeCompleta): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGEM });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const pronto = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const emHomologacao = nfe.tpAmb === "2";

  let y = MARGEM;

  // Canhoto (recibo do destinatário)
  const alturaCanhoto = 55;
  doc.rect(MARGEM, y, LARGURA_UTIL, alturaCanhoto).stroke();
  doc.fontSize(6).font("Helvetica").text(
    `RECEBEMOS DE ${nfe.emitente.nome} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`,
    MARGEM + 3,
    y + 2,
    { width: LARGURA_UTIL - 130 },
  );
  doc.text("DATA DE RECEBIMENTO", MARGEM + 3, y + 30);
  doc.rect(MARGEM, y + 40, LARGURA_UTIL - 130, 1).stroke();
  doc.text("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", MARGEM + 3, y + 43);

  const xCanhotoDireita = MARGEM + LARGURA_UTIL - 125;
  doc.rect(xCanhotoDireita, y, 125, alturaCanhoto).stroke();
  doc.fontSize(9).font("Helvetica-Bold").text("NF-e", xCanhotoDireita + 5, y + 8);
  doc.fontSize(7).font("Helvetica").text(
    `Nº ${nfe.numeroNF}  SÉRIE ${nfe.serie}`,
    xCanhotoDireita + 5,
    y + 24,
  );
  doc.text(dataCurta(nfe.dataEmissao), xCanhotoDireita + 5, y + 38);
  y += alturaCanhoto + 6;

  // Cabeçalho: identificação DANFE + chave de acesso / barcode
  const alturaCabecalho = 100;
  const largColEsq = 110;
  const largColDir = 150;
  const largColMeio = LARGURA_UTIL - largColEsq - largColDir;

  doc.rect(MARGEM, y, largColEsq, alturaCabecalho).stroke();
  doc.fontSize(16).font("Helvetica-Bold").text("DANFE", MARGEM + 5, y + 8, { width: largColEsq - 10 });
  doc.fontSize(6).font("Helvetica").text(
    "Documento Auxiliar da Nota Fiscal Eletrônica",
    MARGEM + 5,
    y + 32,
    { width: largColEsq - 10 },
  );
  doc.text("0 - ENTRADA", MARGEM + 5, y + 55);
  doc.text("1 - SAÍDA", MARGEM + 5, y + 65);
  doc.rect(MARGEM + 75, y + 53, 20, 20).stroke();
  doc.fontSize(10).text("1", MARGEM + 82, y + 59);
  doc.fontSize(6).text(`Nº ${nfe.numeroNF}`, MARGEM + 5, y + 80);
  doc.text(`Série ${nfe.serie}`, MARGEM + 5, y + 89);

  const xMeio = MARGEM + largColEsq;
  doc.rect(xMeio, y, largColMeio, alturaCabecalho).stroke();
  doc.fontSize(6).font("Helvetica").text("CHAVE DE ACESSO", xMeio + 5, y + 4);
  doc.fontSize(8).font("Helvetica-Bold").text(chaveFormatada(nfe.chaveAcesso) || "—", xMeio + 5, y + 13, {
    width: largColMeio - 10,
  });
  doc.fontSize(6).font("Helvetica").text(
    "Consulta de autenticidade no portal nacional da NF-e ou no site da SEFAZ autorizadora",
    xMeio + 5,
    y + 30,
    { width: largColMeio - 10 },
  );
  doc.text("PROTOCOLO DE AUTORIZAÇÃO DE USO", xMeio + 5, y + 55);
  doc.fontSize(7).font("Helvetica-Bold").text(
    nfe.protocolo ? `${nfe.protocolo} — ${dataHora(nfe.dataAutorizacao)}` : "—",
    xMeio + 5,
    y + 64,
    { width: largColMeio - 10 },
  );

  const xDireita = xMeio + largColMeio;
  doc.rect(xDireita, y, largColDir, alturaCabecalho).stroke();
  const barcode = await gerarBarcodeBuffer(nfe.chaveAcesso);
  if (barcode) {
    doc.image(barcode, xDireita + 8, y + 8, { width: largColDir - 16, height: 45 });
  }
  if (emHomologacao) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor("red").text(
      "SEM VALOR FISCAL — AMBIENTE DE HOMOLOGAÇÃO",
      xDireita + 5,
      y + 60,
      { width: largColDir - 10 },
    );
    doc.fillColor("black");
  }
  y += alturaCabecalho + 6;

  // Natureza da operação
  caixa(doc, MARGEM, y, LARGURA_UTIL, 24, "NATUREZA DA OPERAÇÃO");
  campo(doc, MARGEM, y, LARGURA_UTIL, nfe.naturezaOperacao || "—");
  y += 30;

  // Emitente
  y = desenharParticipante(doc, y, "IDENTIFICAÇÃO DO EMITENTE", nfe.emitente);
  // Destinatário
  y = desenharParticipante(doc, y, "IDENTIFICAÇÃO DO DESTINATÁRIO/REMETENTE", nfe.destinatario);

  // Cálculo do imposto
  y = desenharCalculoImposto(doc, y, nfe);

  // Transportador / volumes
  y = desenharTransporte(doc, y, nfe);

  // Itens — pode ocupar múltiplas páginas
  y = desenharItens(doc, y, nfe.itens);

  // Dados adicionais
  if (y > 720) {
    doc.addPage();
    y = MARGEM;
  }
  const alturaAdic = 70;
  caixa(doc, MARGEM, y, LARGURA_UTIL, alturaAdic, "DADOS ADICIONAIS — INFORMAÇÕES COMPLEMENTARES");
  doc.fontSize(7).font("Helvetica").text(
    nfe.informacoesComplementares || "—",
    MARGEM + 3,
    y + 12,
    { width: LARGURA_UTIL - 6, height: alturaAdic - 16 },
  );

  doc.end();
  return pronto;
}

function desenharParticipante(
  doc: PDFKit.PDFDocument,
  y: number,
  titulo: string,
  p: NfeCompleta["emitente"],
): number {
  const altura = 54;
  caixa(doc, MARGEM, y, LARGURA_UTIL, altura, titulo);
  campo(doc, MARGEM, y, LARGURA_UTIL, p.nome, 9);
  const linha2 =
    `${p.endereco.logradouro}, ${p.endereco.numero}${p.endereco.complemento ? ` - ${p.endereco.complemento}` : ""} - ` +
    `${p.endereco.bairro} - ${p.endereco.municipio}/${p.endereco.uf} - CEP ${p.endereco.cep}`;
  doc.fontSize(7).font("Helvetica").text(linha2, MARGEM + 3, y + 24, { width: LARGURA_UTIL - 6 });
  const doc_ident = p.cnpj ? `CNPJ: ${p.cnpj}` : p.cpf ? `CPF: ${p.cpf}` : "";
  const linha3 = [doc_ident, p.ie ? `IE: ${p.ie}` : "", p.endereco.fone ? `Fone: ${p.endereco.fone}` : ""]
    .filter(Boolean)
    .join("   ");
  doc.fontSize(7).text(linha3, MARGEM + 3, y + 38, { width: LARGURA_UTIL - 6 });
  return y + altura + 6;
}

function desenharCalculoImposto(doc: PDFKit.PDFDocument, y: number, nfe: NfeCompleta): number {
  const altura = 46;
  caixa(doc, MARGEM, y, LARGURA_UTIL, altura, "CÁLCULO DO IMPOSTO");
  const colunas = [
    ["BASE CÁLC. ICMS", moeda(nfe.valorBaseCalculoIcms)],
    ["VALOR ICMS", moeda(nfe.valorIcms)],
    ["BASE CÁLC. ICMS ST", moeda(nfe.valorBaseCalculoIcmsSt)],
    ["VALOR ICMS ST", moeda(nfe.valorIcmsSt)],
    ["VALOR IPI", moeda(nfe.valorIpi)],
    ["VALOR TOTAL PRODUTOS", moeda(nfe.valorTotalProdutos)],
  ];
  const colunas2 = [
    ["VALOR FRETE", moeda(nfe.valorFrete)],
    ["VALOR SEGURO", moeda(nfe.valorSeguro)],
    ["DESCONTO", moeda(nfe.valorDesconto)],
    ["OUTRAS DESPESAS", moeda(nfe.valorOutrasDespesas)],
    ["", ""],
    ["VALOR TOTAL DA NOTA", moeda(nfe.valorTotalNota)],
  ];
  const largCol = LARGURA_UTIL / 6;
  colunas.forEach(([label, valor], i) => {
    doc.fontSize(5.5).font("Helvetica").text(label, MARGEM + i * largCol + 2, y + 11, { width: largCol - 4 });
    doc.fontSize(7).font("Helvetica-Bold").text(valor, MARGEM + i * largCol + 2, y + 19, { width: largCol - 4 });
  });
  colunas2.forEach(([label, valor], i) => {
    if (!label) return;
    doc.fontSize(5.5).font("Helvetica").text(label, MARGEM + i * largCol + 2, y + 27, { width: largCol - 4 });
    doc.fontSize(7).font("Helvetica-Bold").text(valor, MARGEM + i * largCol + 2, y + 35, { width: largCol - 4 });
  });
  return y + altura + 6;
}

function desenharTransporte(doc: PDFKit.PDFDocument, y: number, nfe: NfeCompleta): number {
  const altura = 42;
  caixa(doc, MARGEM, y, LARGURA_UTIL, altura, "TRANSPORTADOR / VOLUMES TRANSPORTADOS");
  const t = nfe.transportadora;
  const linha1 = [
    t?.nome ? `Nome: ${t.nome}` : "",
    nfe.modalidadeFrete,
    t?.placa ? `Placa: ${t.placa}/${t.ufVeiculo ?? ""}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  doc.fontSize(7).font("Helvetica").text(linha1 || "—", MARGEM + 3, y + 12, { width: LARGURA_UTIL - 6 });

  const linha2 = [
    t?.cnpj ? `CNPJ: ${t.cnpj}` : t?.cpf ? `CPF: ${t.cpf}` : "",
    t?.endereco ? `End.: ${t.endereco}` : "",
    t?.municipio ? `${t.municipio}/${t.uf ?? ""}` : "",
    t?.ie ? `IE: ${t.ie}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  doc.fontSize(7).text(linha2 || "—", MARGEM + 3, y + 22, { width: LARGURA_UTIL - 6 });

  const vol = nfe.volumes[0];
  const linha3 = vol
    ? [
        vol.quantidade !== undefined ? `Qtd: ${vol.quantidade}` : "",
        vol.especie ? `Espécie: ${vol.especie}` : "",
        vol.marca ? `Marca: ${vol.marca}` : "",
        vol.pesoLiquido !== undefined ? `Peso líq.: ${vol.pesoLiquido.toFixed(3)} kg` : "",
        vol.pesoBruto !== undefined ? `Peso bruto: ${vol.pesoBruto.toFixed(3)} kg` : "",
      ]
        .filter(Boolean)
        .join("   ")
    : "—";
  doc.fontSize(7).text(linha3, MARGEM + 3, y + 32, { width: LARGURA_UTIL - 6 });

  return y + altura + 6;
}

const COLUNAS_ITENS: Array<{ label: string; largura: number; align?: "left" | "right" }> = [
  { label: "CÓDIGO", largura: 0.09 },
  { label: "DESCRIÇÃO", largura: 0.25 },
  { label: "NCM", largura: 0.08 },
  { label: "CST", largura: 0.06 },
  { label: "CFOP", largura: 0.06 },
  { label: "UN", largura: 0.05 },
  { label: "QTD", largura: 0.07, align: "right" },
  { label: "V. UNIT", largura: 0.09, align: "right" },
  { label: "V. TOTAL", largura: 0.09, align: "right" },
  { label: "V. ICMS", largura: 0.08, align: "right" },
  { label: "ALIQ. ICMS", largura: 0.08, align: "right" },
];

function desenharCabecalhoItens(doc: PDFKit.PDFDocument, y: number): number {
  const altura = 16;
  doc.rect(MARGEM, y, LARGURA_UTIL, altura).stroke();
  let x = MARGEM;
  doc.fontSize(6).font("Helvetica-Bold");
  for (const col of COLUNAS_ITENS) {
    const largura = col.largura * LARGURA_UTIL;
    doc.text(col.label, x + 2, y + 4, { width: largura - 4, align: col.align ?? "left" });
    x += largura;
  }
  return y + altura;
}

function desenharItens(doc: PDFKit.PDFDocument, yInicial: number, itens: ItemCompleto[]): number {
  let y = yInicial;
  doc.fontSize(6).font("Helvetica").text("DADOS DO PRODUTO / SERVIÇO", MARGEM, y);
  y += 8;
  y = desenharCabecalhoItens(doc, y);

  const alturaLinha = 14;
  for (const item of itens) {
    if (y + alturaLinha > 780) {
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
      moeda(item.valorUnitario),
      moeda(item.valorTotal),
      moeda(item.valorIcms),
      item.aliquotaIcms ? `${item.aliquotaIcms.toFixed(2)}%` : "—",
    ];
    doc.fontSize(6.5).font("Helvetica");
    valores.forEach((valor, i) => {
      const col = COLUNAS_ITENS[i];
      const largura = col.largura * LARGURA_UTIL;
      doc.text(valor, x + 2, y + 3, { width: largura - 4, align: col.align ?? "left" });
      x += largura;
    });
    doc.rect(MARGEM, y, LARGURA_UTIL, alturaLinha).stroke();
    y += alturaLinha;
  }
  return y + 6;
}
