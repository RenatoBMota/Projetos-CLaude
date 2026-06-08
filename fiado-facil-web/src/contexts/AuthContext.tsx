import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Usuario } from '@/types'
import { authService } from '@/services/auth.service'

interface AuthContextType {
  usuario: Usuario | null
  isLoading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fiado:token')
    const usuarioSalvo = localStorage.getItem('fiado:usuario')
    if (token && usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo))
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, senha: string) => {
    const { accessToken, usuario } = await authService.login(email, senha)
    localStorage.setItem('fiado:token', accessToken)
    localStorage.setItem('fiado:usuario', JSON.stringify(usuario))
    setUsuario(usuario)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fiado:token')
    localStorage.removeItem('fiado:usuario')
    setUsuario(null)
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, isLoading, login, logout, isAuthenticated: !!usuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
