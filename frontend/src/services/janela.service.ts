import { api } from './api'
import { PageResponse, TipoProcesso, TipoRestritor } from '@/types'

export interface JanelaRestitorResponse {
  id: string
  tipo: TipoRestritor
  valor: string
}

export interface JanelaResponse {
  id: string
  nome: string
  tipoProcesso: TipoProcesso
  descricao: string | null
  prioridade: number
  filialId: string
  filialNome: string
  docaId: string | null
  docaCodigo: string | null
  areaOperacional: string | null
  capacidadeSimultanea: number
  duracaoAtendimento: number
  horarioInicio: string
  horarioFim: string
  slaAtraso: number | null
  tempoReagendamento: number
  tempoCancelamento: number
  tempoEdicaoTerceiros: number
  bufferEntreOperacoes: number
  obrigatorioEpi: boolean
  obrigatorioNfe: boolean
  obrigatorioXml: boolean
  obrigatorioLacre: boolean
  obrigatorioFotoCarga: boolean
  aceiteObrigatorio: boolean
  quemAprova: string | null
  slaAprovacao: number | null
  aprovacaoAutomatica: boolean
  ativo: boolean
  restritores: JanelaRestitorResponse[]
  criadoEm: string
  atualizadoEm: string
}

export interface JanelaRequest {
  nome: string
  tipoProcesso: TipoProcesso
  descricao?: string
  prioridade?: number
  filialId: string
  docaId?: string
  areaOperacional?: string
  capacidadeSimultanea?: number
  duracaoAtendimento: number
  horarioInicio: string
  horarioFim: string
  slaAtraso?: number
  tempoReagendamento?: number
  tempoCancelamento?: number
  tempoEdicaoTerceiros?: number
  bufferEntreOperacoes?: number
  obrigatorioEpi?: boolean
  obrigatorioNfe?: boolean
  obrigatorioXml?: boolean
  obrigatorioLacre?: boolean
  obrigatorioFotoCarga?: boolean
  aceiteObrigatorio?: boolean
  quemAprova?: string
  slaAprovacao?: number
  aprovacaoAutomatica?: boolean
  ativo?: boolean
  restritores?: { tipo: TipoRestritor; valor: string }[]
}

export const janelaService = {
  listar: (filialId: string, busca?: string, page = 0, size = 20) =>
    api.get<{ data: PageResponse<JanelaResponse> }>('/janelas', {
      params: { filialId, busca, page, size },
    }),

  listarAtivas: (filialId: string) =>
    api.get<{ data: JanelaResponse[] }>('/janelas/ativas', { params: { filialId } }),

  buscarPorId: (id: string) =>
    api.get<{ data: JanelaResponse }>(`/janelas/${id}`),

  criar: (data: JanelaRequest) =>
    api.post<{ data: JanelaResponse }>('/janelas', data),

  atualizar: (id: string, data: JanelaRequest) =>
    api.put<{ data: JanelaResponse }>(`/janelas/${id}`, data),

  excluir: (id: string) =>
    api.delete(`/janelas/${id}`),
}
