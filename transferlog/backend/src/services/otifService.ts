import { ItemTransferencia, Transferencia } from "@prisma/client";

export interface OtifResultado {
  onTime: boolean | null;
  inFull: boolean | null;
  otif: boolean | null;
}

/**
 * OTIF só pode ser apurado depois que a transferência foi conferida (todos os
 * itens têm quantidadeConferida preenchida). Antes disso os indicadores ficam
 * null (ainda não se aplicam).
 */
export function calcularOtif(
  transferencia: Pick<Transferencia, "prazoPrevisto" | "dataRecebimento">,
  itens: Pick<ItemTransferencia, "quantidade" | "quantidadeConferida" | "divergenciaTipo">[],
): OtifResultado {
  const conferenciaCompleta = itens.every((i) => i.quantidadeConferida !== null && i.quantidadeConferida !== undefined);
  if (!conferenciaCompleta || !transferencia.dataRecebimento) {
    return { onTime: null, inFull: null, otif: null };
  }

  const onTime = transferencia.dataRecebimento.getTime() <= transferencia.prazoPrevisto.getTime();
  const inFull = itens.every(
    (i) => i.quantidadeConferida === i.quantidade && !i.divergenciaTipo,
  );

  return { onTime, inFull, otif: onTime && inFull };
}

export interface MediasEtapas {
  faturamentoCarregamentoHoras: number | null;
  transitoHoras: number | null;
  separacaoHoras: number | null;
}

const NOME_ETAPA = {
  separacao: "Separação",
  faturamentoCarregamento: "Faturamento → carregamento",
  transito: "Trânsito",
} as const;

function duracaoHoras(inicio: Date | null | undefined, fim: Date | null | undefined): number | null {
  if (!inicio || !fim) return null;
  return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
}

/**
 * Aponta qual etapa provavelmente causou o atraso de uma entrega: a etapa
 * (dentre separação, faturamento→carregamento e trânsito — as únicas que
 * acontecem antes da chegada, e por isso podem afetar o On Time) cuja
 * duração real mais excedeu a média do período. Conferência fica de fora
 * porque só acontece depois da chegada, não pode ter causado o atraso.
 * Só faz sentido chamar para uma entrega com onTime === false.
 */
export function identificarEtapaAtraso(
  transferencia: Pick<Transferencia, "dataPedido" | "dataEmissao" | "dataSeparacaoConcluida" | "dataCarregamento" | "dataRecebimento">,
  medias: MediasEtapas,
): string | null {
  const etapas: Array<{ nome: string; real: number | null; media: number | null }> = [
    {
      nome: NOME_ETAPA.separacao,
      real: duracaoHoras(transferencia.dataPedido, transferencia.dataSeparacaoConcluida),
      media: medias.separacaoHoras,
    },
    {
      nome: NOME_ETAPA.faturamentoCarregamento,
      real: duracaoHoras(transferencia.dataEmissao, transferencia.dataCarregamento),
      media: medias.faturamentoCarregamentoHoras,
    },
    {
      nome: NOME_ETAPA.transito,
      real: duracaoHoras(transferencia.dataCarregamento, transferencia.dataRecebimento),
      media: medias.transitoHoras,
    },
  ];

  let pior: { nome: string; excesso: number } | null = null;
  for (const etapa of etapas) {
    if (etapa.real === null || etapa.media === null) continue;
    const excesso = etapa.real - etapa.media;
    if (excesso > 0 && (!pior || excesso > pior.excesso)) {
      pior = { nome: etapa.nome, excesso };
    }
  }
  return pior?.nome ?? null;
}
