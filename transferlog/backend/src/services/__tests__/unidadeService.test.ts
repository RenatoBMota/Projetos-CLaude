import { describe, expect, it } from "vitest";
import { calcularPrazoPrevistoData, calcularPrazoUrgenteData } from "../unidadeService";

describe("calcularPrazoPrevistoData", () => {
  it("cai sempre às 18h de Brasília, não na mesma hora do pedido", () => {
    // Segunda 13/07/2026 09:57 em Brasília (UTC-3) = 12:57Z
    const pedido = new Date("2026-07-13T12:57:00Z");
    const prazo = calcularPrazoPrevistoData(pedido, 48); // 2 dias úteis
    // Quarta 15/07/2026 18:00 em Brasília = 21:00Z
    expect(prazo.toISOString()).toBe("2026-07-15T21:00:00.000Z");
  });

  it("pula sábado e domingo ao contar dias úteis", () => {
    // Sexta 17/07/2026 09:57 em Brasília = 12:57Z
    const pedido = new Date("2026-07-17T12:57:00Z");
    const prazo = calcularPrazoPrevistoData(pedido, 48); // 2 dias úteis
    // Sáb/Dom não contam -> terça 21/07/2026 18:00 em Brasília = 21:00Z
    expect(prazo.toISOString()).toBe("2026-07-21T21:00:00.000Z");
  });

  it("1 dia útil (24h) a partir de segunda cai na terça", () => {
    const pedido = new Date("2026-07-13T12:57:00Z");
    const prazo = calcularPrazoPrevistoData(pedido, 24);
    expect(prazo.toISOString()).toBe("2026-07-14T21:00:00.000Z");
  });

  it("pedido feito no próprio fim de semana também pula pro próximo dia útil", () => {
    // Sábado 18/07/2026 10:00 em Brasília = 13:00Z
    const pedido = new Date("2026-07-18T13:00:00Z");
    const prazo = calcularPrazoPrevistoData(pedido, 24); // 1 dia útil
    // Sáb -> domingo (não conta) -> segunda (conta) = segunda 20/07 18:00 Brasília = 21:00Z
    expect(prazo.toISOString()).toBe("2026-07-20T21:00:00.000Z");
  });
});

describe("calcularPrazoUrgenteData", () => {
  it("vence no mesmo dia útil às 18h quando o pedido é antes do corte", () => {
    // Segunda 13/07/2026 09:57 em Brasília = 12:57Z
    const pedido = new Date("2026-07-13T12:57:00Z");
    const prazo = calcularPrazoUrgenteData(pedido);
    expect(prazo.toISOString()).toBe("2026-07-13T21:00:00.000Z");
  });

  it("vence no próximo dia útil quando o pedido é feito depois das 18h", () => {
    // Segunda 13/07/2026 20:00 em Brasília = 23:00Z
    const pedido = new Date("2026-07-13T23:00:00Z");
    const prazo = calcularPrazoUrgenteData(pedido);
    // Terça 14/07/2026 18:00 em Brasília = 21:00Z
    expect(prazo.toISOString()).toBe("2026-07-14T21:00:00.000Z");
  });

  it("pedido no fim de semana vence na segunda-feira seguinte", () => {
    // Sábado 18/07/2026 10:00 em Brasília = 13:00Z
    const pedido = new Date("2026-07-18T13:00:00Z");
    const prazo = calcularPrazoUrgenteData(pedido);
    expect(prazo.toISOString()).toBe("2026-07-20T21:00:00.000Z");
  });
});
