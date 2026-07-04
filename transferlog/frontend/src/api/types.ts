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

export interface Unidade {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  tipo: "CD" | "LOJA";
  ativa: boolean;
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
  dataEmissao: string;
  valorTotal: string;
  qtdVolumes: number;
  pesoBruto: string;
  qtdSku: number;
  qtdItensTotal: number;
  status: StatusTransferencia;
  transportadora: string | null;
  veiculo: string | null;
  motorista: string | null;
  prazoPrevisto: string;
  itens: ItemTransferencia[];
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

export interface DashboardOperacional {
  aguardandoSeparacao: number;
  carregadas: number;
  emTransito: number;
  aguardandoConferencia: number;
  comDivergencia: number;
  otifPercentual: number | null;
}
