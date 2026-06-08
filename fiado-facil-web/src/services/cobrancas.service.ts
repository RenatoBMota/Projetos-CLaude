import api from './api'
import type { Cobranca, Paginado } from '@/types'

export const cobrancasService = {
  listar: (params?: { clienteId?: string; page?: number; limit?: number }) =>
    api.get<Paginado<Cobranca>>('/cobrancas', { params }).then(r => r.data),

  enviarManual: (clienteId: string) =>
    api.post<Cobranca>(`/cobrancas/manual/${clienteId}`).then(r => r.data),
}
