import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoading } from '@/components/ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
