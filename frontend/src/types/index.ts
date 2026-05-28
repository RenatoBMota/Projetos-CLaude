// ─── API Response Wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: { code: string; message: string }
  timestamp: string
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type StatusValidacaoDocumento = 'PENDENTE' | 'APROVADO' | 'REJEITADO'

export type StatusAgendamento =
  | 'CRIADO'
  | 'PENDENTE_ACEITE'
  | 'CONFIRMADO'
  | 'EM_TRANSITO'
  | 'CHEGADA_PATIO'
  | 'EM_DOCA'
  | 'EM_OPERACAO'
  | 'FINALIZADO'
  | 'CANCELADO'
  | 'NO_SHOW'

export type TipoOperacao = 'RECEBIMENTO' | 'EXPEDICAO' | 'DEVOLUCAO' | 'TRANSFERENCIA' | 'CROSS_DOCKING' | 'ESPECIAL'

export type TipoProcesso =
  | 'RECEBIMENTO'
  | 'EXPEDICAO'
  | 'CROSS_DOCKING'
  | 'DEVOLUCAO'
  | 'TRANSFERENCIA'
  | 'ESPECIAL'

export type TipoRestritor = 'TRANSPORTADORA' | 'FORNECEDOR' | 'TIPO_VEICULO' | 'TIPO_CARGA' | 'PRODUTO'

export type TipoAgendamento = 'AGENDAMENTO' | 'PRE_AGENDAMENTO'

export type StatusSLA = 'NO_PRAZO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO'

export type TipoBloqueio =
  | 'MANUTENCAO'
  | 'FERIADO'
  | 'INVENTARIO'
  | 'FALTA_ENERGIA'
  | 'OPERACAO_ESPECIAL'
  | 'SATURACAO'
  | 'AUDITORIA'
  | 'EMERGENCIA'

export type TipoDoca =
  | 'RECEBIMENTO'
  | 'EXPEDICAO'
  | 'CROSS_DOCKING'
  | 'DEVOLUCAO'
  | 'TRANSFERENCIA'
  | 'ESPECIAL'

export type TipoVeiculo = 'TRUCK' | 'TOCO' | 'CARRETA' | 'BITREM' | 'RODOTREM' | 'VUC' | 'UTILITARIO'

export type TipoCarroceria =
  | 'BAU'
  | 'SIDER'
  | 'GRANELEIRA'
  | 'REFRIGERADA'
  | 'ABERTA'
  | 'CONTAINER'

export type TipoDocumento = 'NF_E' | 'PEDIDO' | 'CT_E' | 'MDF_E' | 'DI' | 'DUE' | 'DTA' | 'ROMANEIO' | 'ASN'

export type Role =
  | 'ROLE_ADMIN'
  | 'ROLE_MANAGER'
  | 'ROLE_OPERATOR'
  | 'ROLE_SUPPLIER'
  | 'ROLE_CARRIER'
  | 'ROLE_AUDIT'

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}
