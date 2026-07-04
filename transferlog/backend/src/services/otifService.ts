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
