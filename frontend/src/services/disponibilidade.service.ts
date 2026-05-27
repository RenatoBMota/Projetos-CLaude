import { api } from './api'

export interface SlotResponse {
  horarioInicio: string
  horarioFim: string
  capacidade: number
  ocupado: number
  disponivel: number
  bloqueado: boolean
}

export interface DisponibilidadeResponse {
  janelaId: string
  janelaNome: string
  data: string
  slots: SlotResponse[]
  totalSlots: number
  slotsDisponiveis: number
  diaBloqueado: boolean
}

export const disponibilidadeService = {
  consultar: (janelaId: string, data: string) =>
    api.get<{ data: DisponibilidadeResponse }>(`/disponibilidade/${janelaId}`, {
      params: { data },
    }),

  consultarPeriodo: (janelaId: string, dataInicio: string, dataFim: string) =>
    api.get<{ data: DisponibilidadeResponse[] }>(`/disponibilidade/${janelaId}/periodo`, {
      params: { dataInicio, dataFim },
    }),
}
