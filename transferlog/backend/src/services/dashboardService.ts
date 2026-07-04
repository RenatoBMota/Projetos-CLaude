import { Prisma, StatusTransferencia } from "@prisma/client";
import { prisma } from "../prisma";
import { calcularOtif } from "./otifService";

const STATUS_EM_ABERTO: StatusTransferencia[] = [
  StatusTransferencia.PENDENTE_SEPARACAO,
  StatusTransferencia.EM_SEPARACAO,
  StatusTransferencia.CARREGADO,
  StatusTransferencia.EM_TRANSITO,
  StatusTransferencia.RECEBIDO,
];

function mediaHoras(pares: Array<[Date | null, Date | null]>): number | null {
  const diffs = pares
    .filter((p): p is [Date, Date] => p[0] !== null && p[1] !== null)
    .map(([inicio, fim]) => (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60));
  if (diffs.length === 0) return null;
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

/** Painel inicial: números da unidade do usuário (origem ou destino). */
export async function dashboardOperacional(unidadeIds: string[]) {
  const escopo: Prisma.TransferenciaWhereInput = {
    OR: [{ origemId: { in: unidadeIds } }, { destinoId: { in: unidadeIds } }],
  };

  const [
    aguardandoSeparacao,
    carregadas,
    emTransito,
    aguardandoConferencia,
    comDivergencia,
    conferidas,
  ] = await Promise.all([
    prisma.transferencia.count({
      where: { ...escopo, status: { in: [StatusTransferencia.PENDENTE_SEPARACAO, StatusTransferencia.EM_SEPARACAO] } },
    }),
    prisma.transferencia.count({ where: { ...escopo, status: StatusTransferencia.CARREGADO } }),
    prisma.transferencia.count({ where: { ...escopo, status: StatusTransferencia.EM_TRANSITO } }),
    prisma.transferencia.count({ where: { ...escopo, status: StatusTransferencia.RECEBIDO } }),
    prisma.transferencia.count({ where: { ...escopo, status: StatusTransferencia.CONFERIDO_DIVERGENTE } }),
    prisma.transferencia.findMany({
      where: {
        ...escopo,
        status: { in: [StatusTransferencia.CONFERIDO_OK, StatusTransferencia.CONFERIDO_DIVERGENTE, StatusTransferencia.FINALIZADO] },
      },
      include: { itens: true },
    }),
  ]);

  const otifs = conferidas.map((t) => calcularOtif(t, t.itens).otif).filter((v): v is boolean => v !== null);
  const otifPercentual = otifs.length ? (otifs.filter(Boolean).length / otifs.length) * 100 : null;

  return {
    aguardandoSeparacao,
    carregadas,
    emTransito,
    aguardandoConferencia,
    comDivergencia,
    otifPercentual,
  };
}

/** Painel executivo: indicadores agregados de toda a operação. */
export async function dashboardGerencial() {
  const agora = new Date();

  const todas = await prisma.transferencia.findMany({
    include: { itens: true, origem: true, destino: true },
  });

  const emAberto = todas.filter((t) => STATUS_EM_ABERTO.includes(t.status));
  const atrasadas = emAberto.filter((t) => t.prazoPrevisto.getTime() < agora.getTime());

  const atrasadasPorOrigem = agrupar(atrasadas, (t) => t.origem.nome);
  const atrasadasPorDestino = agrupar(atrasadas, (t) => t.destino.nome);

  const tempoMedioFaturamentoCarregamento = mediaHoras(
    todas.map((t) => [t.dataEmissao, t.dataCarregamento]),
  );
  const tempoMedioTransito = mediaHoras(todas.map((t) => [t.dataCarregamento, t.dataRecebimento]));
  const tempoMedioSeparacao = mediaHoras(todas.map((t) => [t.createdAt, t.dataSeparacaoConcluida]));
  const tempoMedioConferencia = mediaHoras(todas.map((t) => [t.dataRecebimento, t.dataConferencia]));

  const statusConferidas: StatusTransferencia[] = [
    StatusTransferencia.CONFERIDO_OK,
    StatusTransferencia.CONFERIDO_DIVERGENTE,
    StatusTransferencia.FINALIZADO,
  ];
  const conferidas = todas.filter((t) => statusConferidas.includes(t.status));
  const otifPorTransferencia = conferidas.map((t) => ({
    transferencia: t,
    otif: calcularOtif(t, t.itens),
  }));
  const otifValidos = otifPorTransferencia.filter((o) => o.otif.otif !== null);
  const otifGeral = otifValidos.length
    ? (otifValidos.filter((o) => o.otif.otif).length / otifValidos.length) * 100
    : null;

  const otifPorFilial = percentualPorGrupo(otifValidos, (o) => o.transferencia.destino.nome, (o) => !!o.otif.otif);
  const otifPorRota = percentualPorGrupo(
    otifValidos,
    (o) => `${o.transferencia.origem.nome} → ${o.transferencia.destino.nome}`,
    (o) => !!o.otif.otif,
  );

  const rankingDivergenciasPorFilial = agrupar(
    todas.filter((t) => t.status === StatusTransferencia.CONFERIDO_DIVERGENTE || t.status === StatusTransferencia.FINALIZADO),
    (t) => t.destino.nome,
    (t) => t.itens.some((i) => i.divergenciaTipo !== null),
  );

  const produtosDivergentes: Record<string, number> = {};
  for (const t of todas) {
    for (const item of t.itens) {
      if (item.divergenciaTipo) {
        const chave = `${item.codigoInterno} - ${item.descricao}`;
        produtosDivergentes[chave] = (produtosDivergentes[chave] ?? 0) + 1;
      }
    }
  }

  const transportadoras: Record<string, number> = {};
  for (const t of todas) {
    if (t.transportadora) {
      transportadoras[t.transportadora] = (transportadoras[t.transportadora] ?? 0) + 1;
    }
  }

  const valorPendente = emAberto.reduce((acc, t) => acc + Number(t.valorTotal), 0);

  const heatmapRotas = agruparAtrasoPorRota(atrasadas);

  return {
    transferenciasEmAberto: emAberto.length,
    atrasadasPorOrigem,
    atrasadasPorDestino,
    tempoMedioFaturamentoCarregamentoHoras: tempoMedioFaturamentoCarregamento,
    tempoMedioTransitoHoras: tempoMedioTransito,
    tempoMedioSeparacaoHoras: tempoMedioSeparacao,
    tempoMedioConferenciaHoras: tempoMedioConferencia,
    otifGeralPercentual: otifGeral,
    otifPorFilial,
    otifPorRota,
    rankingDivergenciasPorFilial,
    rankingProdutosMaisDivergentes: Object.entries(produtosDivergentes)
      .map(([produto, quantidade]) => ({ produto, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    rankingTransportadoras: Object.entries(transportadoras)
      .map(([transportadora, quantidade]) => ({ transportadora, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    valorFinanceiroTransferenciasPendentes: valorPendente,
    heatmapRotasCriticas: heatmapRotas,
  };
}

function agrupar<T>(
  itens: T[],
  chave: (item: T) => string,
  filtroTrue?: (item: T) => boolean,
): Array<{ nome: string; quantidade: number }> {
  const contagem: Record<string, number> = {};
  for (const item of itens) {
    if (filtroTrue && !filtroTrue(item)) continue;
    const k = chave(item);
    contagem[k] = (contagem[k] ?? 0) + 1;
  }
  return Object.entries(contagem)
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

function percentualPorGrupo<T>(
  itens: T[],
  chave: (item: T) => string,
  ehSucesso: (item: T) => boolean,
): Array<{ nome: string; percentual: number; total: number }> {
  const grupos: Record<string, { sucesso: number; total: number }> = {};
  for (const item of itens) {
    const k = chave(item);
    grupos[k] ??= { sucesso: 0, total: 0 };
    grupos[k].total += 1;
    if (ehSucesso(item)) grupos[k].sucesso += 1;
  }
  return Object.entries(grupos).map(([nome, v]) => ({
    nome,
    percentual: (v.sucesso / v.total) * 100,
    total: v.total,
  }));
}

function agruparAtrasoPorRota(
  atrasadas: Array<{ origem: { nome: string }; destino: { nome: string }; prazoPrevisto: Date }>,
): Array<{ rota: string; quantidadeAtrasos: number }> {
  const contagem: Record<string, number> = {};
  for (const t of atrasadas) {
    const rota = `${t.origem.nome} → ${t.destino.nome}`;
    contagem[rota] = (contagem[rota] ?? 0) + 1;
  }
  return Object.entries(contagem)
    .map(([rota, quantidadeAtrasos]) => ({ rota, quantidadeAtrasos }))
    .sort((a, b) => b.quantidadeAtrasos - a.quantidadeAtrasos);
}
