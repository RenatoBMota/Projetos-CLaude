import { api } from './api'

export interface ItemRanking {
  nome: string
  total: number
}

export interface DashboardKpiResponse {
  totalHoje: number
  totalSemana: number
  totalMes: number
  porStatus: Record<string, number>
  porSla: Record<string, number>
  taxaNoShow: number
  taxaSlaConformidade: number
  taxaFinalizados: number
  topTransportadoras: ItemRanking[]
  porFilial: ItemRanking[]
  documentosPendentes: number
  documentosAprovados: number
  documentosRejeitados: number
}

export const dashboardService = {
  kpis: (params?: { dataInicio?: string; dataFim?: string; filialId?: string }) =>
    api.get<{ data: DashboardKpiResponse }>('/dashboard/kpis', { params }),
}
