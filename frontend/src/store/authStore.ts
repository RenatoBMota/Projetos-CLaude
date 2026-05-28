import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UsuarioInfo {
  id: string
  nome: string
  email: string
  role: string
  transportadoraId?: string | null
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  usuario: UsuarioInfo | null
  setAuth: (token: string, refreshToken: string, usuario: UsuarioInfo) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      usuario: null,
      setAuth: (token, refreshToken, usuario) => set({ token, refreshToken, usuario }),
      clearAuth: () => set({ token: null, refreshToken: null, usuario: null }),
      isAuthenticated: () => !!get().token,
    }),
    { name: 'rbm:auth' }
  )
)
