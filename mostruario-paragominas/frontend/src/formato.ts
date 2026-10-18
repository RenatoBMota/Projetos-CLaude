import { useEffect, useState } from "react";
import { api, Pagina } from "./api";

export const moeda = (v: unknown) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const qtd = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export const data = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString("pt-BR") : "—");

export const dataHora = (v: unknown) =>
  v ? new Date(String(v)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const STATUS: Record<string, { rotulo: string; cor: string }> = {
  rascunho: { rotulo: "Rascunho", cor: "" },
  aguardando_aprovacao_comercial: { rotulo: "Aguardando comercial", cor: "aviso" },
  aguardando_aprovacao_logistica: { rotulo: "Aguardando logística", cor: "aviso" },
  aguardando_expedicao: { rotulo: "Aguardando expedição", cor: "info" },
  em_exposicao: { rotulo: "Em exposição", cor: "ok" },
  devolucao_parcial: { rotulo: "Devolução parcial", cor: "ok" },
  encerrada: { rotulo: "Encerrada", cor: "" },
  reprovada: { rotulo: "Reprovada", cor: "ruim" },
  cancelada: { rotulo: "Cancelada", cor: "ruim" },
};

export const STATUS_ITEM: Record<string, string> = {
  sem_atendimento: "Sem atendimento",
  aguardando_expedicao: "Aguardando expedição",
  expedido_parcialmente: "Expedido parcialmente",
  em_exposicao: "Em exposição",
  devolucao_parcial: "Devolução parcial",
  encerrado: "Encerrado",
};

export const PRIORIDADES: Record<number, string> = { 1: "Alta", 2: "Normal", 3: "Baixa" };

export const TIPOS_MOV: Record<string, string> = {
  expedicao: "Expedição",
  devolucao_estoque: "Devolução → Estoque",
  devolucao_descarte: "Devolução → Descarte",
  perda: "Perda / não devolvida",
  estorno: "Estorno",
};

/** Chave para evitar registro duplicado (funciona também fora de HTTPS). */
export function novaChave(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export interface Motivo {
  id: number;
  tipo: string;
  descricao: string;
  exige_observacao: boolean;
}

export function useMotivos() {
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  useEffect(() => {
    api<Pagina<Motivo>>("/api/cadastros/motivos?ativos=true&limite=500").then((r) => setMotivos(r.itens));
  }, []);
  return (tipo: string) => motivos.filter((m) => m.tipo === tipo);
}

export interface Opcao {
  id: number;
  codigo: string;
  nome: string;
}

export function useFiliais() {
  const [filiais, setFiliais] = useState<Opcao[]>([]);
  useEffect(() => {
    api<Pagina<Opcao>>("/api/cadastros/filiais?ativos=true&limite=500").then((r) => setFiliais(r.itens));
  }, []);
  return filiais;
}
