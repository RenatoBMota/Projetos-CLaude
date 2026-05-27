'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const router = useRouter()
  const { setAuth, clearAuth, token, usuario, refreshToken } = useAuthStore()

  const login = async (email: string, senha: string) => {
    const result = await authService.login(email, senha)
    setAuth(result.token, result.refreshToken, result.usuario)
    router.push('/dashboard')
  }

  const logout = async () => {
    if (refreshToken) {
      try { await authService.logout(refreshToken) } catch { /* ignora */ }
    }
    clearAuth()
    router.push('/login')
  }

  return { login, logout, token, usuario, isAuthenticated: !!token }
}
