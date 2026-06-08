import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, ShoppingCart, CreditCard,
  MessageSquare, Settings, LogOut, Store,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/clientes',  label: 'Clientes',   icon: Users },
  { to: '/compras',   label: 'Compras',    icon: ShoppingCart },
  { to: '/pagamentos',label: 'Pagamentos', icon: CreditCard },
  { to: '/cobrancas', label: 'Cobranças',  icon: MessageSquare },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const { usuario, logout } = useAuth()
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Store size={20} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Fiado Fácil</p>
            <p className="text-xs text-gray-400">Controle de Crediário</p>
          </div>
        </div>
      </div>

      {/* Estabelecimento */}
      {usuario?.estabelecimento && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-lg bg-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Estabelecimento</p>
          <p className="text-sm font-medium mt-0.5 truncate">{usuario.estabelecimento.nome}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-bold">
            {usuario?.nome?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 capitalize">{usuario?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-800"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
