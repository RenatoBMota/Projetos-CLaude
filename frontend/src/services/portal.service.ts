import { api } from './api'
import { AgendamentoResponse } from './agendamento.service'
import { PageResponse, StatusAgendamento } from '@/types'

export const portalService = {
  listar: (status?: StatusAgendamento, page = 0, size = 20) =>
    api.get<{ data: PageResponse<AgendamentoResponse> }>('/portal/agendamentos', {
      params: { status, page, size },
    }),

  buscarPorId: (id: string) =>
    api.get<{ data: AgendamentoResponse }>(`/portal/agendamentos/${id}`),

  aceitar: (id: string) =>
    api.post<{ data: AgendamentoResponse }>(`/portal/agendamentos/${id}/aceitar`),

  recusar: (id: string, motivo: string) =>
    api.post<{ data: AgendamentoResponse }>(`/portal/agendamentos/${id}/recusar`, { motivo }),
}
