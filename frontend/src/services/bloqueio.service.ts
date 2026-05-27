import { api } from './api'
import { PageResponse, TipoBloqueio } from '@/types'

export interface BloqueioResponse {
  id: string
  tipo: TipoBloqueio
  filialId: string
  filialNome: string
  docaId: string | null
  docaCodigo: string | null
  janelaId: string | null
  janelaNome: string | null
  dataInicio: string
  dataFim: string
  horarioInicio: string | null
  horarioFim: string | null
  motivo: string
  observacao: string | null
  ativo: boolean
  criadoEm: string
}

export interface BloqueioRequest {
  tipo: TipoBloqueio
  filialId: string
  docaId?: string
  janelaId?: string
  dataInicio: string
  dataFim: string
  horarioInicio?: string
  horarioFim?: string
  motivo: string
  observacao?: string
  ativo?: boolean
}

export const bloqueioService = {
  listar: (filialId: string, busca?: string, page = 0, size = 20) =>
    api.get<{ data: PageResponse<BloqueioResponse> }>('/bloqueios', {
      params: { filialId, busca, page, size },
    }),

  buscarPorId: (id: string) =>
    api.get<{ data: BloqueioResponse }>(`/bloqueios/${id}`),

  criar: (data: BloqueioRequest) =>
    api.post<{ data: BloqueioResponse }>('/bloqueios', data),

  atualizar: (id: string, data: BloqueioRequest) =>
    api.put<{ data: BloqueioResponse }>(`/bloqueios/${id}`, data),

  excluir: (id: string) =>
    api.delete(`/bloqueios/${id}`),
}
