import api from './api'
import type { Cliente, Paginado } from '@/types'

export const clientesService = {
  listar: (params?: { page?: number; limit?: number; busca?: string; status?: string }) =>
    api.get<Paginado<Cliente>>('/clientes', { params }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Cliente>(`/clientes/${id}`).then(r => r.data),

  criar: (data: Partial<Cliente>) =>
    api.post<Cliente>('/clientes', data).then(r => r.data),

  atualizar: (id: string, data: Partial<Cliente>) =>
    api.patch<Cliente>(`/clientes/${id}`, data).then(r => r.data),

  remover: (id: string) =>
    api.delete(`/clientes/${id}`).then(r => r.data),

  inadimplentes: () =>
    api.get<Cliente[]>('/clientes/inadimplentes').then(r => r.data),

  ranking: () =>
    api.get<Cliente[]>('/clientes/ranking').then(r => r.data),
}
