import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extrairCabecalho, parseDanfePdf } from "../danfeParser";

const pdf = readFileSync(join(__dirname, "fixtures", "danfe-exemplo.pdf"));

describe("parseDanfePdf", () => {
  it("extrai os dados principais de um DANFE em PDF via OCR", async () => {
    const nfe = await parseDanfePdf(pdf);

    expect(nfe.numeroNF).toBe("2249");
    expect(nfe.serie).toBe("1");
    expect(nfe.numeroPedido).toBe("1493516");
    expect(nfe.emitenteCnpj).toBe("03555402000655");
    expect(nfe.destinatarioCnpj).toBe("03555402000140");
    expect(nfe.valorTotal).toBe(151.06);
    expect(nfe.qtdVolumes).toBe(40);
    expect(nfe.pesoBruto).toBe(40);
    expect(nfe.itens).toHaveLength(2);
    expect(nfe.itens[0]).toMatchObject({ codigoInterno: "361034", ncm: "85392190", cfop: "5409", quantidade: 20 });
    expect(nfe.itens[1]).toMatchObject({ codigoInterno: "377399", ncm: "85392190", cfop: "5409", quantidade: 20 });

    // Regressão: a hora de emissão vinha de um "T00:00:00" sem timezone, que ao
    // ser exibido em horário de Brasília (UTC-3) virava um "21:00:00" do dia
    // anterior — parecia dado real, mas era lixo. Confere que agora a hora vem
    // do protocolo de autorização (real) e a data continua correta.
    expect(nfe.dataEmissaoConfiavel).toBe(true);
    expect(nfe.dataEmissao.toISOString()).toBe(new Date("2026-07-04T08:44:07-03:00").toISOString());
  }, 60_000);

  it("cai para só a data (sem hora inventada) quando o protocolo de autorização não é reconhecido", () => {
    const textoSemProtocolo = `
      Nº. 2249
      SÉRIE 1
      Pedido: 1493516
      CNPJ
      03555402000655
      DESTINATÁRIO/REMETENTE
      NOME/RAZÃO SOCIAL CNPJ/CPF DATA DA EMISSÃO
      835 PARAGOMINAS HOME CENTER LTDA 03.555.402/0001-40 04/07/2026
    `;
    const cabecalho = extrairCabecalho(textoSemProtocolo);

    expect(cabecalho.dataEmissaoConfiavel).toBe(false);
    expect(cabecalho.dataEmissao.getUTCFullYear()).toBe(2026);
    expect(cabecalho.dataEmissao.getUTCMonth()).toBe(6); // julho (0-indexado)
    expect(cabecalho.dataEmissao.getUTCDate()).toBe(4);
  });
});
