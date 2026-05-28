import { api } from './api'

export interface IntegracaoYmsStatus {
  enabled: boolean
  ymsOnline: boolean
  baseUrl: string
}

export const integracaoService = {
  ymsStatus: () =>
    api.get<{ data: IntegracaoYmsStatus }>('/integracao/yms/status'),
}
