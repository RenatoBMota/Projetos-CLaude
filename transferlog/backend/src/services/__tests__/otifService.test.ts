import { describe, expect, it } from "vitest";
import { calcularOtif, identificarEtapaAtraso } from "../otifService";

describe("calcularOtif", () => {
  it("retorna nulls quando a conferência ainda não foi concluída", () => {
    const resultado = calcularOtif(
      { prazoPrevisto: new Date("2026-01-02T00:00:00Z"), dataRecebimento: null },
      [{ quantidade: 10, quantidadeConferida: null, divergenciaTipo: null }],
    );
    expect(resultado).toEqual({ onTime: null, inFull: null, otif: null });
  });

  it("onTime falso quando recebido depois do prazo", () => {
    const resultado = calcularOtif(
      { prazoPrevisto: new Date("2026-01-01T18:00:00Z"), dataRecebimento: new Date("2026-01-01T19:00:00Z") },
      [{ quantidade: 10, quantidadeConferida: 10, divergenciaTipo: null }],
    );
    expect(resultado.onTime).toBe(false);
    expect(resultado.inFull).toBe(true);
    expect(resultado.otif).toBe(false);
  });
});

const medias = { separacaoHoras: 10, faturamentoCarregamentoHoras: 5, transitoHoras: 20 };

describe("identificarEtapaAtraso", () => {
  it("aponta a etapa cujo excesso sobre a média foi maior", () => {
    const nome = identificarEtapaAtraso(
      {
        dataPedido: new Date("2026-01-01T00:00:00Z"),
        dataEmissao: new Date("2026-01-01T00:00:00Z"),
        // separação: 30h real vs 10h média -> excesso 20h
        dataSeparacaoConcluida: new Date("2026-01-02T06:00:00Z"),
        // faturamento->carregamento: 6h real vs 5h média -> excesso 1h
        dataCarregamento: new Date("2026-01-01T06:00:00Z"),
        // trânsito: 22h real vs 20h média -> excesso 2h
        dataRecebimento: new Date("2026-01-02T04:00:00Z"),
      },
      medias,
    );
    expect(nome).toBe("Separação");
  });

  it("retorna null quando nenhuma etapa excedeu a média", () => {
    const nome = identificarEtapaAtraso(
      {
        dataPedido: new Date("2026-01-01T00:00:00Z"),
        dataEmissao: new Date("2026-01-01T00:00:00Z"),
        dataSeparacaoConcluida: new Date("2026-01-01T05:00:00Z"),
        dataCarregamento: new Date("2026-01-01T02:00:00Z"),
        dataRecebimento: new Date("2026-01-01T10:00:00Z"),
      },
      medias,
    );
    expect(nome).toBeNull();
  });

  it("retorna null quando faltam datas pra calcular alguma etapa", () => {
    const nome = identificarEtapaAtraso(
      {
        dataPedido: new Date("2026-01-01T00:00:00Z"),
        dataEmissao: new Date("2026-01-01T00:00:00Z"),
        dataSeparacaoConcluida: null,
        dataCarregamento: null,
        dataRecebimento: null,
      },
      medias,
    );
    expect(nome).toBeNull();
  });
});
