import { api } from './api'
import { PageResponse, StatusAgendamento, TipoAgendamento, TipoOperacao, StatusSLA } from '@/types'

export interface DocumentoResponse {
  id: string
  tipoDocumento: string
  numero: string | null
  serie: string | null
  chaveAcesso: string | null
  emitente: string | null
  destinatario: string | null
  peso: number | null
  volumes: number | null
}

export interface HistoricoResponse {
  id: string
  statusAnterior: StatusAgendamento | null
  statusNovo: StatusAgendamento
  observacao: string | null
  usuarioId: string | null
  createdAt: string
}

export interface AgendamentoResponse {
  id: string
  codigo: string
  tipo: TipoAgendamento
  tipoOperacao: TipoOperacao
  status: StatusAgendamento
  filialId: string
  filialNome: string
  docaId: string | null
  docaCodigo: string | null
  janelaId: string
  janelaNome: string
  transportadoraId: string | null
  transportadoraNome: string | null
  fornecedorId: string | null
  fornecedorNome: string | null
  motoristaId: string | null
  motoristaNome: string | null
  veiculoId: string | null
  veiculoPlaca: string | null
  dataOperacao: string
  horarioInicio: string
  horarioFim: string
  pesoBruto: number | null
  pesoLiquido: number | null
  cubagem: number | null
  volumes: number | null
  observacoes: string | null
  protocolo: string | null
  qrCode: string | null
  slaStatus: StatusSLA
  noShow: boolean
  expiraEm: string | null
  documentos: DocumentoResponse[]
  historico: HistoricoResponse[]
  criadoEm: string
  atualizadoEm: string
}

export interface AgendamentoRequest {
  tipo?: TipoAgendamento
  tipoOperacao: TipoOperacao
  filialId: string
  docaId?: string
  janelaId: string
  transportadoraId?: string
  fornecedorId?: string
  motoristaId?: string
  veiculoId?: string
  dataOperacao: string
  horarioInicio: string
  pesoBruto?: number
  pesoLiquido?: number
  cubagem?: number
  volumes?: number
  observacoes?: string
  documentos?: {
    tipoDocumento: string
    numero?: string
    serie?: string
    chaveAcesso?: string
    emitente?: string
    destinatario?: string
    peso?: number
    volumes?: number
  }[]
}

export interface AgendamentoFiltros {
  filialId?: string
  status?: StatusAgendamento
  dataInicio?: string
  dataFim?: string
  busca?: string
  page?: number
  size?: number
}

export const agendamentoService = {
  listar: (filtros: AgendamentoFiltros = {}) =>
    api.get<{ data: PageResponse<AgendamentoResponse> }>('/agendamentos', {
      params: { ...filtros, page: filtros.page ?? 0, size: filtros.size ?? 20 },
    }),

  buscarPorId: (id: string) =>
    api.get<{ data: AgendamentoResponse }>(`/agendamentos/${id}`),

  criar: (data: AgendamentoRequest) =>
    api.post<{ data: AgendamentoResponse }>('/agendamentos', data),

  confirmar: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/confirmar`),

  cancelar: (id: string, motivo?: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/cancelar`, { motivo }),

  registrarChegada: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/chegada`),

  iniciarOperacao: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/iniciar-operacao`),

  finalizar: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/finalizar`),

  registrarNoShow: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/agendamentos/${id}/no-show`),
}
