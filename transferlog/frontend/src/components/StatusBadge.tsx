import type { StatusTransferencia } from "../api/types";

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

export function StatusBadge({ status }: { status: StatusTransferencia }) {
  return <span className={`badge ${TONES[status]}`}>{LABELS[status]}</span>;
}
