import { Prioridade, StatusTratativa } from "@prisma/client";
import { prisma } from "../prisma";
import { calcularOtif } from "./otifService";
import { nomeUnidade } from "./unidadeService";

type UnidadeNome = { razaoSocial: string; nomeFantasia: string | null };

function nomeRota(t: { origem: UnidadeNome; destino: UnidadeNome }): string {
  return `${nomeUnidade(t.origem)} → ${nomeUnidade(t.destino)}`;
}

function agruparPorValor(
  pares: Array<{ chave: string; valor: number }>,
): Array<{ nome: string; valorTotal: number; quantidade: number; valorMedio: number }> {
  const grupos: Record<string, { valorTotal: number; quantidade: number }> = {};
  for (const { chave, valor } of pares) {
    grupos[chave] ??= { valorTotal: 0, quantidade: 0 };
    grupos[chave].valorTotal += valor;
    grupos[chave].quantidade += 1;
  }
  return Object.entries(grupos)
    .map(([nome, v]) => ({ nome, valorTotal: v.valorTotal, quantidade: v.quantidade, valorMedio: v.valorTotal / v.quantidade }))
    .sort((a, b) => b.valorTotal - a.valorTotal);
}

/** Relatório 1: custo de frete por rota e por transportadora no período — apoia decisão de contrato/rota. */
export async function relatorioCustoFrete(dataInicio: Date, dataFim: Date) {
  const transferencias = await prisma.transferencia.findMany({
    where: { dataPedido: { gte: dataInicio, lte: dataFim }, valorFrete: { not: null } },
    include: { origem: true, destino: true, transportadora: true },
  });

  return {
    porRota: agruparPorValor(transferencias.map((t) => ({ chave: nomeRota(t), valor: Number(t.valorFrete) }))),
    porTransportadora: agruparPorValor(
      transferencias.map((t) => ({ chave: t.transportadora?.nome ?? "Sem transportadora", valor: Number(t.valorFrete) })),
    ),
  };
}

/** Relatório 2: performance por transportadora (OTIF, atraso médio, tratativas e devoluções geradas). */
export async function relatorioPerformanceTransportadoras(dataInicio: Date, dataFim: Date) {
  const transferencias = await prisma.transferencia.findMany({
    where: { dataPedido: { gte: dataInicio, lte: dataFim } },
    include: { itens: true, transportadora: true, devolucoes: true },
  });

  interface Acc {
    total: number;
    onTimeApurados: number;
    onTimeOk: number;
    somaAtrasoHoras: number;
    qtdAtrasos: number;
    tratativas: number;
    devolucoes: number;
  }
  const grupos: Record<string, Acc> = {};

  for (const t of transferencias) {
    const nome = t.transportadora?.nome;
    if (!nome) continue;
    grupos[nome] ??= { total: 0, onTimeApurados: 0, onTimeOk: 0, somaAtrasoHoras: 0, qtdAtrasos: 0, tratativas: 0, devolucoes: 0 };
    const g = grupos[nome];
    g.total += 1;

    const otif = calcularOtif(t, t.itens);
    if (otif.onTime !== null) {
      g.onTimeApurados += 1;
      if (otif.onTime) {
        g.onTimeOk += 1;
      } else if (t.dataRecebimento) {
        g.qtdAtrasos += 1;
        g.somaAtrasoHoras += (t.dataRecebimento.getTime() - t.prazoPrevisto.getTime()) / (1000 * 60 * 60);
      }
    }
    if (t.tratativaStatus) g.tratativas += 1;
    if (t.devolucoes.length > 0) g.devolucoes += 1;
  }

  return Object.entries(grupos)
    .map(([transportadora, g]) => ({
      transportadora,
      totalTransferencias: g.total,
      onTimePercentual: g.onTimeApurados ? (g.onTimeOk / g.onTimeApurados) * 100 : null,
      atrasoMedioHoras: g.qtdAtrasos ? g.somaAtrasoHoras / g.qtdAtrasos : null,
      qtdTratativas: g.tratativas,
      qtdDevolucoes: g.devolucoes,
    }))
    .sort((a, b) => b.totalTransferencias - a.totalTransferencias);
}

/** Relatório 3: produtos/filial com divergência recorrente — aponta problema sistêmico, não acaso. */
export async function relatorioDivergenciasRecorrentes(dataInicio: Date, dataFim: Date) {
  const transferencias = await prisma.transferencia.findMany({
    where: { dataPedido: { gte: dataInicio, lte: dataFim } },
    include: { itens: true, origem: true },
  });

  interface Acc { ocorrencias: number; qtdDivergente: number; ultimaOcorrenciaMs: number }
  const grupos: Record<string, Acc> = {};

  for (const t of transferencias) {
    for (const item of t.itens) {
      if (!item.divergenciaTipo) continue;
      const chave = `${item.codigoInterno} - ${item.descricao} (${nomeUnidade(t.origem)})`;
      grupos[chave] ??= { ocorrencias: 0, qtdDivergente: 0, ultimaOcorrenciaMs: 0 };
      grupos[chave].ocorrencias += 1;
      grupos[chave].qtdDivergente += item.divergenciaQtd ?? 0;
      grupos[chave].ultimaOcorrenciaMs = Math.max(
        grupos[chave].ultimaOcorrenciaMs,
        (t.dataConferencia ?? t.dataPedido).getTime(),
      );
    }
  }

  return Object.entries(grupos)
    .map(([produtoFilial, v]) => ({
      produtoFilial,
      ocorrencias: v.ocorrencias,
      qtdDivergente: v.qtdDivergente,
      ultimaOcorrencia: new Date(v.ultimaOcorrenciaMs),
    }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);
}

/** Relatório 4: tratativas de divergência ainda em aberto, ordenadas pela mais antiga — cobrança de SLA interno. */
export async function relatorioAgingTratativas() {
  const transferencias = await prisma.transferencia.findMany({
    where: { tratativaStatus: { in: [StatusTratativa.ABERTA, StatusTratativa.EM_ANDAMENTO] } },
    include: { origem: true, destino: true, tratativaResponsavel: { select: { id: true, nome: true } } },
  });

  const agora = new Date();
  return transferencias
    .map((t) => ({
      id: t.id,
      numeroNF: t.numeroNF,
      numeroPedido: t.numeroPedido,
      origem: nomeUnidade(t.origem),
      destino: nomeUnidade(t.destino),
      status: t.tratativaStatus,
      responsavel: t.tratativaResponsavel?.nome ?? null,
      prazo: t.tratativaPrazo,
      diasEmAberto: t.dataConferencia
        ? Math.floor((agora.getTime() - t.dataConferencia.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))
    .sort((a, b) => (b.diasEmAberto ?? 0) - (a.diasEmAberto ?? 0));
}

/** Relatório 5: frequência e custo das transferências urgentes vs. normais — apoia decisão de estoque de segurança. */
export async function relatorioUrgencias(dataInicio: Date, dataFim: Date) {
  const transferencias = await prisma.transferencia.findMany({
    where: { dataPedido: { gte: dataInicio, lte: dataFim } },
    include: { itens: true },
  });

  function resumo(lista: typeof transferencias) {
    const comFrete = lista.filter((t) => t.valorFrete !== null);
    const valorFreteMedio = comFrete.length
      ? comFrete.reduce((acc, t) => acc + Number(t.valorFrete), 0) / comFrete.length
      : null;
    const otifs = lista.map((t) => calcularOtif(t, t.itens).otif).filter((v): v is boolean => v !== null);
    const otifPercentual = otifs.length ? (otifs.filter(Boolean).length / otifs.length) * 100 : null;
    return { quantidade: lista.length, valorFreteMedio, otifPercentual };
  }

  const urgentes = transferencias.filter((t) => t.prioridade === Prioridade.URGENTE);
  const normais = transferencias.filter((t) => t.prioridade === Prioridade.NORMAL);

  return {
    urgentes: resumo(urgentes),
    normais: resumo(normais),
    percentualUrgentes: transferencias.length ? (urgentes.length / transferencias.length) * 100 : 0,
  };
}

/** Relatório 6: motivos de devolução (sobra/quebra) por volume — aponta problema de compra/previsão de demanda. */
export async function relatorioMotivosDevolucao(dataInicio: Date, dataFim: Date) {
  const devolucoes = await prisma.transferencia.findMany({
    where: { transferenciaOrigemId: { not: null }, dataPedido: { gte: dataInicio, lte: dataFim } },
    include: { itens: true, transferenciaOrigem: { include: { itens: true } } },
  });

  interface Acc { ocorrencias: number; quantidadeTotal: number }
  const porMotivo: Record<string, Acc> = {};

  for (const dev of devolucoes) {
    for (const item of dev.itens) {
      const original = dev.transferenciaOrigem?.itens.find((i) => i.codigoInterno === item.codigoInterno);
      const motivo = original?.divergenciaTipo ?? "Não identificado";
      porMotivo[motivo] ??= { ocorrencias: 0, quantidadeTotal: 0 };
      porMotivo[motivo].ocorrencias += 1;
      porMotivo[motivo].quantidadeTotal += item.quantidade;
    }
  }

  return {
    totalDevolucoes: devolucoes.length,
    porMotivo: Object.entries(porMotivo)
      .map(([motivo, v]) => ({ motivo, ocorrencias: v.ocorrencias, quantidadeTotal: v.quantidadeTotal }))
      .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal),
  };
}
