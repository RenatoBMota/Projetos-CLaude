export type Perfil =
  | "ADMINISTRADOR"
  | "SUPERVISOR"
  | "LIDER_LOJA"
  | "OPERADOR"
  | "SEPARADOR"
  | "CONFERENTE"
  | "ANALISTA"
  | "AUDITORIA";

export type StatusTransferencia =
  | "PENDENTE_SEPARACAO"
  | "EM_SEPARACAO"
  | "CARREGADO"
  | "EM_TRANSITO"
  | "RECEBIDO"
  | "CONFERIDO_OK"
  | "CONFERIDO_DIVERGENTE"
  | "FINALIZADO"
  | "CANCELADO";

export type TipoDivergencia = "FALTOU" | "SOBROU" | "QUEBRADO" | "PRODUTO_ERRADO";

export type TipoEvento = "UPLOAD" | "SEPARACAO" | "CARREGAMENTO" | "RECEBIMENTO" | "CONFERENCIA" | "CANCELAMENTO";

export interface EventoAuditoria {
  id: string;
  tipo: TipoEvento;
  dataHora: string;
  observacao: string | null;
  usuario: { nome: string };
}

export interface Unidade {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  tipo: "MATRIZ" | "FILIAL";
  ativa: boolean;
}

export function nomeUnidade(unidade: Pick<Unidade, "razaoSocial" | "nomeFantasia">): string {
  return unidade.nomeFantasia || unidade.razaoSocial;
}

export interface ItemTransferencia {
  id: string;
  codigoInterno: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  separado: boolean;
  quantidadeConferida: number | null;
  divergenciaTipo: TipoDivergencia | null;
  divergenciaQtd: number | null;
  divergenciaObs: string | null;
  divergenciaFotos: string[];
}

export interface Transferencia {
  id: string;
  numeroNF: string;
  serie: string;
  numeroPedido: string;
  origemId: string;
  destinoId: string;
  origem: Unidade;
  destino: Unidade;
  dataPedido: string;
  dataEmissao: string;
  dataEmissaoConfiavel: boolean;
  valorTotal: string;
  qtdVolumes: number;
  pesoBruto: string;
  qtdSku: number;
  qtdItensTotal: number;
  status: StatusTransferencia;
  transportadora: string | null;
  veiculo: string | null;
  motorista: string | null;
  numeroBonus: string | null;
  prazoPrevisto: string;
  itens: ItemTransferencia[];
  eventos: EventoAuditoria[];
  createdAt: string;
  otif?: { onTime: boolean | null; inFull: boolean | null; otif: boolean | null };
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  unidadeIds: string[];
}

export interface UsuarioListado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  unidades: Array<{ unidadeId: string; unidade: Unidade }>;
}

export interface DashboardOperacional {
  aguardandoSeparacao: number;
  carregadas: number;
  emTransito: number;
  aguardandoConferencia: number;
  comDivergencia: number;
  otifPercentual: number | null;
}
