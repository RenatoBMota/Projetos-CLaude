import api from './api'
import type { Compra, Paginado } from '@/types'

export const comprasService = {
  listar: (params?: { clienteId?: string; dataInicio?: string; dataFim?: string; page?: number; limit?: number }) =>
    api.get<Paginado<Compra>>('/compras', { params }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Compra>(`/compras/${id}`).then(r => r.data),

  registrar: (data: { clienteId: string; valor: number; dataCompra: string; observacao?: string }) =>
    api.post<Compra>('/compras', data).then(r => r.data),

  importarXml: (xml: string, clienteId: string) =>
    api.post<Compra>('/compras/importar-xml', { xml, clienteId }).then(r => r.data),

  cancelar: (id: string) =>
    api.delete(`/compras/${id}/cancelar`).then(r => r.data),
}
