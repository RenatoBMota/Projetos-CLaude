'use client'

import { useAuthStore } from '@/store/authStore'
import { CalendarDays, Truck, Building2, Users, Package, CheckCircle } from 'lucide-react'

const FASES = [
  { fase: 0, titulo: 'Fundação',               status: 'done',    desc: 'Setup, infra, CI/CD' },
  { fase: 1, titulo: 'Cadastros Mestres',       status: 'done',    desc: 'Auth, filiais, parceiros' },
  { fase: 2, titulo: 'Motor de Agendamento',    status: 'done',    desc: 'Janelas, slots, bloqueios' },
  { fase: 3, titulo: 'Módulo Documental',       status: 'done',    desc: 'XML, NF-e, validações' },
  { fase: 4, titulo: 'Portal Externo',          status: 'done',    desc: 'Transportadoras, aceite' },
  { fase: 5, titulo: 'Painel Operacional',      status: 'next',    desc: 'Dashboard, KPIs' },
  { fase: 6, titulo: 'Notificações',            status: 'pending', desc: 'E-mail, WhatsApp' },
  { fase: 7, titulo: 'Integrações',             status: 'pending', desc: 'YMS, WMS, ERP' },
]

const MENUS = [
  { label: 'Filiais',         href: '/filiais',         icon: Building2, desc: 'Unidades operacionais' },
  { label: 'Transportadoras', href: '/transportadoras', icon: Truck,      desc: 'Parceiros logísticos' },
  { label: 'Fornecedores',    href: '/fornecedores',    icon: Users,      desc: 'Cadastro de fornecedores' },
  { label: 'Motoristas',      href: '/motoristas',      icon: Users,      desc: 'Motoristas habilitados' },
  { label: 'Veículos',        href: '/veiculos',        icon: Truck,      desc: 'Frota cadastrada' },
  { label: 'Produtos',        href: '/produtos',        icon: Package,    desc: 'Catálogo de produtos' },
]

export default function DashboardPage() {
  const { usuario } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Bem-vindo, {usuario?.nome}. Fase 4 concluída — Portal Externo e fluxo de aceite ativos.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays className="w-5 h-5 text-brand-600" />
          <h2 className="font-semibold text-gray-900">Progresso do Projeto</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FASES.map(({ fase, titulo, status, desc }) => (
            <div key={fase} className={`p-3 rounded-lg border text-sm ${
              status === 'done' ? 'bg-green-50 border-green-200' :
              status === 'next' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {status === 'done' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {status === 'next' && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                {status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                <span className={`font-medium ${
                  status === 'done' ? 'text-green-800' :
                  status === 'next' ? 'text-blue-800' : 'text-gray-500'
                }`}>Fase {fase}</span>
              </div>
              <p className={`font-semibold text-xs ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>{titulo}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Cadastros disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MENUS.map(({ label, href, icon: Icon, desc }) => (
            <a key={href} href={href} className="card p-5 hover:shadow-md transition-shadow flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
