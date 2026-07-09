import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { contarItensTotal, contarSkusDistintos, parseNfeXml } from "../nfeParser";

const xml = readFileSync(
  join(__dirname, "fixtures", "nfe-exemplo.xml"),
  "utf-8",
);

describe("parseNfeXml", () => {
  it("extrai os dados principais da NF-e", () => {
    const nfe = parseNfeXml(xml);

    expect(nfe.numeroNF).toBe("2249");
    expect(nfe.serie).toBe("1");
    expect(nfe.numeroPedido).toBe("1493516");
    expect(nfe.emitenteCnpj).toBe("03554020006550");
    expect(nfe.destinatarioCnpj).toBe("03555402000140");
    expect(nfe.valorTotal).toBe(151.06);
    expect(nfe.qtdVolumes).toBe(40);
    expect(nfe.pesoBruto).toBe(40);
    expect(nfe.itens).toHaveLength(2);
    expect(nfe.dataEmissaoConfiavel).toBe(true);
    expect(nfe.dataEmissao.toISOString()).toBe(new Date("2026-07-04T10:00:00-03:00").toISOString());
  });

  it("conta SKUs distintos e itens totais", () => {
    const nfe = parseNfeXml(xml);

    expect(contarSkusDistintos(nfe.itens)).toBe(2);
    expect(contarItensTotal(nfe.itens)).toBe(40);
  });
});
