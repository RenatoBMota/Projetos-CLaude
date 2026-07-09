import { StatusTransferencia, TipoDivergencia, TipoEvento } from "@prisma/client";
import { prisma } from "../prisma";
import { NfeParsed, contarItensTotal, contarSkusDistintos } from "./nfeParser";
import { calcularPrazoPrevisto, obterPrazoHoras, resolverUnidadePorCnpj } from "./unidadeService";

export async function montarPreviaTransferencia(nfe: NfeParsed) {
  const origem = await resolverUnidadePorCnpj(nfe.emitenteCnpj);
  const destino = await resolverUnidadePorCnpj(nfe.destinatarioCnpj);
  const prazoHoras = await obterPrazoHoras(origem.id, destino.id);

  return {
    nfe,
    origem,
    destino,
    prazoHoras,
    qtdSku: contarSkusDistintos(nfe.itens),
    qtdItensTotal: contarItensTotal(nfe.itens),
  };
}

export async function criarTransferencia(
  nfe: NfeParsed,
  usuarioId: string,
  dataPedido: Date,
  xmlOriginal?: string,
) {
  const origem = await resolverUnidadePorCnpj(nfe.emitenteCnpj);
  const destino = await resolverUnidadePorCnpj(nfe.destinatarioCnpj);
  const prazoPrevisto = await calcularPrazoPrevisto(origem.id, destino.id, dataPedido);

  const existente = await prisma.transferencia.findUnique({
    where: {
      numeroNF_serie_origemId: {
        numeroNF: nfe.numeroNF,
        serie: nfe.serie,
        origemId: origem.id,
      },
    },
  });
  if (existente) {
    throw new Error(`Já existe uma transferência criada para a NF ${nfe.numeroNF}/${nfe.serie}`);
  }

  return prisma.transferencia.create({
    data: {
      numeroNF: nfe.numeroNF,
      serie: nfe.serie,
      numeroPedido: nfe.numeroPedido,
      origemId: origem.id,
      destinoId: destino.id,
      dataPedido,
      dataEmissao: nfe.dataEmissao,
      dataEmissaoConfiavel: nfe.dataEmissaoConfiavel,
      valorTotal: nfe.valorTotal,
      qtdVolumes: nfe.qtdVolumes,
      pesoBruto: nfe.pesoBruto,
      qtdSku: contarSkusDistintos(nfe.itens),
      qtdItensTotal: contarItensTotal(nfe.itens),
      prazoPrevisto,
      xmlOriginal,
      status: StatusTransferencia.PENDENTE_SEPARACAO,
      itens: {
        create: nfe.itens.map((item) => ({
          codigoInterno: item.codigoInterno,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          quantidade: item.quantidade,
        })),
      },
      eventos: {
        create: {
          tipo: TipoEvento.UPLOAD,
          usuarioId,
        },
      },
    },
    include: { itens: true, origem: true, destino: true },
  });
}

/**
 * Marca um item como separado (ou desfaz). Ao marcar o primeiro item de uma
 * transferência ainda "pendente de separação", o status avança para
 * "em separação" — dá visibilidade de que o time já começou a trabalhar nela.
 */
export async function marcarItemSeparado(
  transferenciaId: string,
  itemId: string,
  separado: boolean,
) {
  const item = await prisma.itemTransferencia.update({
    where: { id: itemId },
    data: { separado },
  });

  if (separado) {
    await prisma.transferencia.updateMany({
      where: { id: transferenciaId, status: StatusTransferencia.PENDENTE_SEPARACAO },
      data: { status: StatusTransferencia.EM_SEPARACAO },
    });
  }

  return item;
}

/** Conclui a separação: todos os itens devem estar marcados como separados. */
export async function concluirSeparacao(transferenciaId: string, usuarioId: string) {
  const transferencia = await prisma.transferencia.findUniqueOrThrow({
    where: { id: transferenciaId },
    include: { itens: true },
  });

  const faltamItens = transferencia.itens.some((i) => !i.separado);
  if (faltamItens) {
    throw new Error("Existem itens ainda não separados");
  }

  return prisma.transferencia.update({
    where: { id: transferenciaId },
    data: {
      status: StatusTransferencia.CARREGADO,
      dataSeparacaoConcluida: new Date(),
      eventos: { create: { tipo: TipoEvento.SEPARACAO, usuarioId, observacao: "Separação concluída" } },
    },
  });
}

/** Confirma o carregamento físico no veículo e a saída para o destino. */
export async function marcarCarregado(
  transferenciaId: string,
  usuarioId: string,
  dados: { transportadora?: string; veiculo?: string; motorista?: string },
) {
  const transferencia = await prisma.transferencia.findUniqueOrThrow({
    where: { id: transferenciaId },
  });
  if (transferencia.status !== StatusTransferencia.CARREGADO) {
    throw new Error("Transferência precisa ter a separação concluída antes de ser carregada");
  }

  return prisma.transferencia.update({
    where: { id: transferenciaId },
    data: {
      ...dados,
      status: StatusTransferencia.EM_TRANSITO,
      dataCarregamento: new Date(),
      eventos: { create: { tipo: TipoEvento.CARREGAMENTO, usuarioId, observacao: JSON.stringify(dados) } },
    },
  });
}

/** Confirma a chegada física no destino, antes da conferência detalhada dos itens. */
export async function confirmarRecebimento(transferenciaId: string, usuarioId: string) {
  const transferencia = await prisma.transferencia.findUniqueOrThrow({
    where: { id: transferenciaId },
  });
  if (transferencia.status !== StatusTransferencia.EM_TRANSITO) {
    throw new Error("Transferência precisa estar em trânsito para ser recebida");
  }

  return prisma.transferencia.update({
    where: { id: transferenciaId },
    data: {
      status: StatusTransferencia.RECEBIDO,
      dataRecebimento: new Date(),
      eventos: { create: { tipo: TipoEvento.RECEBIMENTO, usuarioId, observacao: "Chegada confirmada" } },
    },
  });
}

export interface ConferenciaItemInput {
  itemId: string;
  quantidadeConferida: number;
  divergenciaTipo?: TipoDivergencia;
  divergenciaQtd?: number;
  divergenciaObs?: string;
  divergenciaFotos?: string[];
}

/** Registra a conferência SKU a SKU e conclui com "Recebido OK" ou "Recebido com divergência". */
export async function registrarConferencia(
  transferenciaId: string,
  usuarioId: string,
  itensConferidos: ConferenciaItemInput[],
  numeroBonus: string,
) {
  const transferencia = await prisma.transferencia.findUniqueOrThrow({
    where: { id: transferenciaId },
  });
  if (transferencia.status !== StatusTransferencia.RECEBIDO) {
    throw new Error("Transferência precisa ter o recebimento confirmado antes da conferência");
  }

  await prisma.$transaction(
    itensConferidos.map((item) =>
      prisma.itemTransferencia.update({
        where: { id: item.itemId },
        data: {
          quantidadeConferida: item.quantidadeConferida,
          divergenciaTipo: item.divergenciaTipo,
          divergenciaQtd: item.divergenciaQtd,
          divergenciaObs: item.divergenciaObs,
          divergenciaFotos: item.divergenciaFotos ?? [],
        },
      }),
    ),
  );

  const itens = await prisma.itemTransferencia.findMany({ where: { transferenciaId } });
  const temDivergencia = itens.some(
    (i) => i.divergenciaTipo !== null || i.quantidadeConferida !== i.quantidade,
  );

  return prisma.transferencia.update({
    where: { id: transferenciaId },
    data: {
      status: temDivergencia
        ? StatusTransferencia.CONFERIDO_DIVERGENTE
        : StatusTransferencia.CONFERIDO_OK,
      dataConferencia: new Date(),
      numeroBonus,
      eventos: {
        create: {
          tipo: TipoEvento.CONFERENCIA,
          usuarioId,
          observacao: `${temDivergencia ? "Recebido com divergência" : "Recebido OK"} — Bônus nº ${numeroBonus}`,
        },
      },
    },
    include: { itens: true },
  });
}

export async function finalizarTransferencia(transferenciaId: string, usuarioId: string) {
  const transferencia = await prisma.transferencia.findUniqueOrThrow({
    where: { id: transferenciaId },
  });

  const statusPermitidos: StatusTransferencia[] = [
    StatusTransferencia.CONFERIDO_OK,
    StatusTransferencia.CONFERIDO_DIVERGENTE,
  ];
  if (!statusPermitidos.includes(transferencia.status)) {
    throw new Error("Transferência precisa estar conferida para ser finalizada");
  }

  return prisma.transferencia.update({
    where: { id: transferenciaId },
    data: {
      status: StatusTransferencia.FINALIZADO,
      dataFinalizacao: new Date(),
      eventos: { create: { tipo: TipoEvento.CONFERENCIA, usuarioId, observacao: "Transferência finalizada" } },
    },
  });
}
