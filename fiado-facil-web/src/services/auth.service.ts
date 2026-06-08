import api from './api'
import type { AuthResponse } from '@/types'

export const authService = {
  login: (email: string, senha: string) =>
    api.post<AuthResponse>('/auth/login', { email, senha }).then(r => r.data),

  perfil: () =>
    api.get('/auth/perfil').then(r => r.data),
}
