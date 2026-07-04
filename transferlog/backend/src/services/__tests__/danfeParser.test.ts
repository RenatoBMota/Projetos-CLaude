import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDanfePdf } from "../danfeParser";

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
  }, 60_000);
});
