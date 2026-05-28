import { api } from './api'
import { PageResponse } from '@/types'

export interface NotificacaoLogResponse {
  id: string
  agendamentoId: string | null
  canal: 'EMAIL' | 'WHATSAPP'
  evento: string
  destinatario: string
  assunto: string | null
  status: 'ENVIADO' | 'FALHOU' | 'DESATIVADO'
  erro: string | null
  criadoEm: string
}

export const notificacaoService = {
  listar: (canal?: string, page = 0, size = 30) =>
    api.get<{ data: PageResponse<NotificacaoLogResponse> }>('/notificacoes', {
      params: { canal, page, size },
    }),

  porAgendamento: (agendamentoId: string, page = 0) =>
    api.get<{ data: PageResponse<NotificacaoLogResponse> }>(`/notificacoes/agendamento/${agendamentoId}`, {
      params: { page, size: 20 },
    }),
}
