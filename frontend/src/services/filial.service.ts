import { api } from './api'

export interface FilialResponse {
  id: string; codigo: string; nome: string; razaoSocial: string; cnpj: string
  inscricaoEstadual?: string; endereco?: string; numero?: string; cidade: string
  uf: string; cep?: string; telefone?: string; email?: string
  horarioInicio?: string; horarioFim?: string; limiteDiario?: number
  tempoMedioAtendimento?: number; ativo: boolean; createdAt: string
}

export interface FilialRequest {
  codigo: string; nome: string; razaoSocial: string; cnpj: string
  inscricaoEstadual?: string; endereco?: string; numero?: string
  complemento?: string; bairro?: string; cidade: string; uf: string
  cep?: string; telefone?: string; email?: string
  horarioInicio?: string; horarioFim?: string
  limiteDiario?: number; tempoMedioAtendimento?: number; ativo?: boolean
}

export interface PageResponse<T> {
  content: T[]; totalElements: number; totalPages: number; size: number; number: number
}

export const filialService = {
  listar: async (busca?: string, page = 0, size = 20): Promise<PageResponse<FilialResponse>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (busca) params.set('busca', busca)
    const { data } = await api.get(`/api/v1/filiais?${params}`)
    return data.data
  },

  buscarPorId: async (id: string): Promise<FilialResponse> => {
    const { data } = await api.get(`/api/v1/filiais/${id}`)
    return data.data
  },

  criar: async (request: FilialRequest): Promise<FilialResponse> => {
    const { data } = await api.post('/api/v1/filiais', request)
    return data.data
  },

  atualizar: async (id: string, request: FilialRequest): Promise<FilialResponse> => {
    const { data } = await api.put(`/api/v1/filiais/${id}`, request)
    return data.data
  },

  excluir: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/filiais/${id}`)
  },
}
