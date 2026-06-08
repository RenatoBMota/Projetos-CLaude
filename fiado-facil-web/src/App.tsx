import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ClientesPage } from '@/pages/clientes/ClientesPage'
import { ComprasPage } from '@/pages/compras/ComprasPage'
import { PagamentosPage } from '@/pages/pagamentos/PagamentosPage'
import { CobrancasPage } from '@/pages/cobrancas/CobrancasPage'
import { ConfiguracoesPage } from '@/pages/configuracoes/ConfiguracoesPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"      element={<DashboardPage />} />
            <Route path="clientes"       element={<ClientesPage />} />
            <Route path="compras"        element={<ComprasPage />} />
            <Route path="pagamentos"     element={<PagamentosPage />} />
            <Route path="cobrancas"      element={<CobrancasPage />} />
            <Route path="configuracoes"  element={<ConfiguracoesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
