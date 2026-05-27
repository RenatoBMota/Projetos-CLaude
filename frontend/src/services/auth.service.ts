import { api } from './api'

export interface LoginResponse {
  token: string
  refreshToken: string
  usuario: { id: string; nome: string; email: string; role: string }
}

export const authService = {
  login: async (email: string, senha: string): Promise<LoginResponse> => {
    const { data } = await api.post('/api/v1/auth/login', { email, senha })
    return data.data
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const { data } = await api.post('/api/v1/auth/refresh', { refreshToken })
    return data.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/api/v1/auth/logout', { refreshToken })
  },
}
