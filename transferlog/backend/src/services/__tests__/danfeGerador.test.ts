import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseNfeXmlCompleto } from "../nfeXmlCompletoParser";
import { gerarDanfePdf } from "../danfeGerador";

const xml = readFileSync(join(__dirname, "fixtures", "nfe-completa.xml"), "utf-8");

describe("parseNfeXmlCompleto", () => {
  it("extrai os campos completos necessários para a DANFE", () => {
    const nfe = parseNfeXmlCompleto(xml);

    expect(nfe.chaveAcesso).toBe("35260704200166000187550010000000246550000230");
    expect(nfe.numeroNF).toBe("2249");
    expect(nfe.naturezaOperacao).toBe("Transferência de mercadorias entre filiais");
    expect(nfe.protocolo).toBe("135260000012345");
    expect(nfe.emitente.nome).toBe("Paragominas Home Center Ltda");
    expect(nfe.emitente.endereco.municipio).toBe("Paragominas");
    expect(nfe.destinatario.ie).toBe("987654321");
    expect(nfe.itens).toHaveLength(2);
    expect(nfe.itens[0].valorIcms).toBe(12.6);
    expect(nfe.itens[0].valorIpi).toBe(3.5);
    expect(nfe.valorTotalNota).toBe(151.06);
    expect(nfe.transportadora?.placa).toBe("ABC1D23");
    expect(nfe.volumes[0].pesoBruto).toBe(40);
  });
});

describe("gerarDanfePdf", () => {
  it("gera um PDF válido a partir dos dados completos da NF-e", async () => {
    const nfe = parseNfeXmlCompleto(xml);
    const buffer = await gerarDanfePdf(nfe);

    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
