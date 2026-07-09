import { StatusTransferencia } from "@prisma/client";
import { prisma } from "../prisma";
import { calcularOtif } from "./otifService";
import { nomeUnidade } from "./unidadeService";

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

/**
 * Painel inicial: números da unidade do usuário.
 *
 * Uma transferência pertence ao acompanhamento de uma única unidade por vez,
 * nunca das duas ao mesmo tempo: enquanto está sendo separada/carregada, é
 * responsabilidade da ORIGEM; a partir do momento em que sai (em trânsito),
 * a responsabilidade passa a ser do DESTINO (recebimento e conferência). O
 * OTIF é atribuído à origem — quem envia é responsável por cumprir o prazo
 * (On Time) e mandar tudo certo (In Full).
 */
export async function dashboardOperacional(unidadeIds: string[]) {
  const [
    aguardandoSeparacao,
    carregadas,
    emTransito,
    aguardandoConferencia,
    comDivergencia,
    conferidas,
  ] = await Promise.all([
    prisma.transferencia.count({
      where: { origemId: { in: unidadeIds }, status: { in: [StatusTransferencia.PENDENTE_SEPARACAO, StatusTransferencia.EM_SEPARACAO] } },
    }),
    prisma.transferencia.count({ where: { origemId: { in: unidadeIds }, status: StatusTransferencia.CARREGADO } }),
    prisma.transferencia.count({ where: { destinoId: { in: unidadeIds }, status: StatusTransferencia.EM_TRANSITO } }),
    prisma.transferencia.count({ where: { destinoId: { in: unidadeIds }, status: StatusTransferencia.RECEBIDO } }),
    prisma.transferencia.count({ where: { destinoId: { in: unidadeIds }, status: StatusTransferencia.CONFERIDO_DIVERGENTE } }),
    prisma.transferencia.findMany({
      where: {
        origemId: { in: unidadeIds },
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

/**
 * Painel para Administrador/Supervisor: números de cada filial separadamente
 * (em vez do agregado de "minhas unidades", que não se aplica a quem não
 * está vinculado a uma unidade específica). Quando `unidadeIds` é omitido,
 * traz todas as unidades ativas (uso do Administrador); quando informado,
 * restringe às unidades do Supervisor.
 */
export async function dashboardOperacionalPorFilial(unidadeIds?: string[]) {
  const unidades = await prisma.unidade.findMany({
    where: { ativa: true, ...(unidadeIds ? { id: { in: unidadeIds } } : {}) },
    orderBy: { razaoSocial: "asc" },
  });

  return Promise.all(
    unidades.map(async (unidade) => ({
      unidade,
      ...(await dashboardOperacional([unidade.id])),
    })),
  );
}

/** Painel executivo: indicadores agregados da operação no período informado (base: dataPedido). */
export async function dashboardGerencial(dataInicio: Date, dataFim: Date) {
  const agora = new Date();

  const todas = await prisma.transferencia.findMany({
    where: { dataPedido: { gte: dataInicio, lte: dataFim } },
    include: { itens: true, origem: true, destino: true },
  });

  const emAberto = todas.filter((t) => STATUS_EM_ABERTO.includes(t.status));
  const atrasadas = emAberto.filter((t) => t.prazoPrevisto.getTime() < agora.getTime());

  const atrasadasPorOrigem = agrupar(atrasadas, (t) => nomeUnidade(t.origem));
  const atrasadasPorDestino = agrupar(atrasadas, (t) => nomeUnidade(t.destino));

  const tempoMedioFaturamentoCarregamento = mediaHoras(
    todas.map((t) => [t.dataEmissao, t.dataCarregamento]),
  );
  const tempoMedioTransito = mediaHoras(todas.map((t) => [t.dataCarregamento, t.dataRecebimento]));
  const tempoMedioSeparacao = mediaHoras(todas.map((t) => [t.dataPedido, t.dataSeparacaoConcluida]));
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

  // OTIF é atribuído à origem: quem envia é responsável por On Time e In Full.
  const otifPorFilial = percentualPorGrupo(otifValidos, (o) => nomeUnidade(o.transferencia.origem), (o) => !!o.otif.otif);
  const otifPorRota = percentualPorGrupo(
    otifValidos,
    (o) => `${nomeUnidade(o.transferencia.origem)} → ${nomeUnidade(o.transferencia.destino)}`,
    (o) => !!o.otif.otif,
  );

  // Creditada à origem: o OTIF (In Full) também é atribuído a quem envia, então
  // a responsabilidade pela divergência acompanha a mesma unidade.
  const rankingDivergenciasPorFilial = agrupar(
    todas.filter((t) => t.status === StatusTransferencia.CONFERIDO_DIVERGENTE || t.status === StatusTransferencia.FINALIZADO),
    (t) => nomeUnidade(t.origem),
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
  const valorPorRota = agruparValorPorRota(todas);

  return {
    totalTransferenciasPeriodo: todas.length,
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
    valorPorRota,
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

type UnidadeNome = { razaoSocial: string; nomeFantasia: string | null };

function agruparAtrasoPorRota(
  atrasadas: Array<{ origem: UnidadeNome; destino: UnidadeNome; prazoPrevisto: Date }>,
): Array<{ rota: string; quantidadeAtrasos: number }> {
  const contagem: Record<string, number> = {};
  for (const t of atrasadas) {
    const rota = `${nomeUnidade(t.origem)} → ${nomeUnidade(t.destino)}`;
    contagem[rota] = (contagem[rota] ?? 0) + 1;
  }
  return Object.entries(contagem)
    .map(([rota, quantidadeAtrasos]) => ({ rota, quantidadeAtrasos }))
    .sort((a, b) => b.quantidadeAtrasos - a.quantidadeAtrasos);
}

function agruparValorPorRota(
  transferencias: Array<{ origem: UnidadeNome; destino: UnidadeNome; valorTotal: unknown }>,
): Array<{ rota: string; valor: number }> {
  const somas: Record<string, number> = {};
  for (const t of transferencias) {
    const rota = `${nomeUnidade(t.origem)} → ${nomeUnidade(t.destino)}`;
    somas[rota] = (somas[rota] ?? 0) + Number(t.valorTotal);
  }
  return Object.entries(somas)
    .map(([rota, valor]) => ({ rota, valor }))
    .sort((a, b) => b.valor - a.valor);
}
