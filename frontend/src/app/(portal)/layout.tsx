'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Truck, CalendarDays, LogOut, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { label: 'Agendamentos',      href: '/portal/aceite',   icon: CalendarDays },
  { label: 'Pendentes Aceite',  href: '/portal/aceite?status=PENDENTE_ACEITE', icon: ClipboardCheck },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, usuario, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  if (!token) return null

  const handleLogout = () => {
    clearAuth()
    router.replace('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-20">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">PORTAL CARRIER</p>
            <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[140px]">{usuario?.nome}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/portal' && pathname.startsWith(href.split('?')[0]))
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 ml-64 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  )
}
