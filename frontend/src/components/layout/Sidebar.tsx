'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Truck,
  Users,
  FileText,
  Settings,
  ShieldAlert,
  Clock,
  LogOut,
  ExternalLink,
  Bell,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Agendamentos',    href: '/agendamentos',     icon: CalendarDays },
  { label: 'Janelas',         href: '/janelas',          icon: Clock },
  { label: 'Filiais / Docas', href: '/filiais',          icon: Building2 },
  { label: 'Transportadoras', href: '/transportadoras',  icon: Truck },
  { label: 'Fornecedores',    href: '/fornecedores',     icon: Users },
  { label: 'Documentos',      href: '/documentos',       icon: FileText },
  { label: 'Notificações',    href: '/notificacoes',     icon: Bell },
  { label: 'Bloqueios',       href: '/bloqueios',        icon: ShieldAlert },
  { label: 'Configurações',   href: '/configuracoes',    icon: Settings },
  { label: 'Portal Carrier',  href: '/portal/aceite',    icon: ExternalLink },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-brand-900 flex flex-col z-20">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-700/50">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">RBM LOGISTICS</p>
          <p className="text-brand-300 text-xs mt-0.5">Agendamento</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-brand-700/50">
        <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-brand-200 hover:bg-brand-800 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )
}
