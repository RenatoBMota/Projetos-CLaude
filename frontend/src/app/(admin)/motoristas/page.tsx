'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'

export default function Page() {
  const [busca, setBusca] = useState('')

  const TITLE = 'Motoristas'
  const DESC = 'Motoristas habilitados'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{TITLE}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{DESC}</p>
        </div>
        <Button><Plus className="w-4 h-4" />Novo</Button>
      </div>
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div className="card p-8 text-center text-gray-400">
        <p className="text-sm">CRUD completo será implementado na continuação da Fase 1.</p>
        <p className="text-xs mt-1">A estrutura de API e banco de dados já está pronta.</p>
      </div>
    </div>
  )
}
