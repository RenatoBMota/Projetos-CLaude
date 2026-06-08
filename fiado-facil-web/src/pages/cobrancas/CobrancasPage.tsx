import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { cobrancasService } from '@/services/cobrancas.service'
import { PageLoading } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, formatCurrency, tipoCobrancaLabel } from '@/utils'

const statusBadge: Record<string, string> = {
  enviada: 'badge-green',
  falhou: 'badge-red',
  pendente: 'badge-yellow',
  cancelada: 'badge-gray',
}

const statusLabel: Record<string, string> = {
  enviada: 'Enviada',
  falhou: 'Falhou',
  pendente: 'Pendente',
  cancelada: 'Cancelada',
}

export function CobrancasPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['cobrancas', page],
    queryFn: () => cobrancasService.listar({ page, limit: 20 }),
  })

  if (isLoading) return <PageLoading />

  const enviadas  = data?.data.filter(c => c.status === 'enviada').length  ?? 0
  const falhas    = data?.data.filter(c => c.status === 'falhou').length   ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cobranças</h1>
        <p className="text-gray-500 text-sm mt-1">Histórico de cobranças automáticas e manuais via WhatsApp</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: data?.total ?? 0, color: 'text-gray-900' },
          { label: 'Enviadas', value: enviadas, color: 'text-green-600' },
          { label: 'Com Falha', value: falhas, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {!data?.data.length ? (
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="Nenhuma cobrança enviada"
            description="As cobranças automáticas são disparadas diariamente às 8h"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Tipo</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Canal</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Valor Devido</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{c.cliente?.nome || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{tipoCobrancaLabel[c.tipo]}</td>
                      <td className="px-6 py-4"><span className="badge badge-green capitalize">{c.canal}</span></td>
                      <td className="px-6 py-4">{c.valorDevido ? formatCurrency(c.valorDevido) : '—'}</td>
                      <td className="px-6 py-4">
                        <span className={statusBadge[c.status]}>{statusLabel[c.status]}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <Pagination page={page} lastPage={data.lastPage} total={data.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
