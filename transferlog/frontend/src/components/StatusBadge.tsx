import type { ItemTransferencia, StatusTransferencia } from "../api/types";

const LABELS: Record<StatusTransferencia, string> = {
  PENDENTE_SEPARACAO: "Pendente de separação",
  EM_SEPARACAO: "Em separação",
  CARREGADO: "Separado / pronto p/ carregar",
  EM_TRANSITO: "Em trânsito",
  RECEBIDO: "Aguardando conferência",
  CONFERIDO_OK: "Recebido OK",
  CONFERIDO_DIVERGENTE: "Recebido com divergência",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

const TONES: Record<StatusTransferencia, "neutral" | "ok" | "warn" | "danger"> = {
  PENDENTE_SEPARACAO: "neutral",
  EM_SEPARACAO: "warn",
  CARREGADO: "warn",
  EM_TRANSITO: "warn",
  RECEBIDO: "warn",
  CONFERIDO_OK: "ok",
  CONFERIDO_DIVERGENTE: "danger",
  FINALIZADO: "ok",
  CANCELADO: "danger",
};

export function temDivergencia(itens: ItemTransferencia[]): boolean {
  return itens.some(
    (i) => i.divergenciaTipo !== null || (i.quantidadeConferida !== null && i.quantidadeConferida !== i.quantidade),
  );
}

export function StatusBadge({
  status,
  itens,
}: {
  status: StatusTransferencia;
  itens?: ItemTransferencia[];
}) {
  const finalizadoComDivergencia = status === "FINALIZADO" && !!itens && temDivergencia(itens);
  const label = finalizadoComDivergencia ? "Finalizado com divergência" : LABELS[status];
  const tone = finalizadoComDivergencia ? "danger" : TONES[status];
  return <span className={`badge ${tone}`}>{label}</span>;
}
