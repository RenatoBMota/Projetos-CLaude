import api from './api'
import type { DashboardResumo, Cliente } from '@/types'

export const dashboardService = {
  resumo: () =>
    api.get<DashboardResumo>('/dashboard').then(r => r.data),

  recebimentosPorDia: (mes?: number, ano?: number) =>
    api.get<{ dia: string; total: string }[]>('/dashboard/recebimentos/por-dia', { params: { mes, ano } }).then(r => r.data),

  comprasPorDia: (mes?: number, ano?: number) =>
    api.get<{ dia: string; total: string; quantidade: string }[]>('/dashboard/compras/por-dia', { params: { mes, ano } }).then(r => r.data),

  ranking: () =>
    api.get<Cliente[]>('/dashboard/ranking').then(r => r.data),

  inadimplencia: () =>
    api.get<{ totalClientes: number; totalDevido: number; clientes: Cliente[] }>('/dashboard/inadimplencia').then(r => r.data),
}
