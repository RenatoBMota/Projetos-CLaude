import api from './api'
import type { Pagamento, Paginado } from '@/types'

export const pagamentosService = {
  listar: (params?: { clienteId?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }) =>
    api.get<Paginado<Pagamento>>('/pagamentos', { params }).then(r => r.data),

  registrar: (data: { clienteId: string; valor: number; dataPagamento: string; formaPagamento?: string; observacao?: string }) =>
    api.post<Pagamento>('/pagamentos', data).then(r => r.data),
}
