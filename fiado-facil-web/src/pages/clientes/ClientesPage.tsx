import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, MessageSquare, Users } from 'lucide-react'
import { clientesService } from '@/services/clientes.service'
import { cobrancasService } from '@/services/cobrancas.service'
import { PageLoading } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { ClienteForm } from './ClienteForm'
import { ClienteDetalhe } from './ClienteDetalhe'
import {
  formatCurrency, formatCPF, statusClienteBadge, statusClienteLabel,
  riscoBadge, riscoLabel,
} from '@/utils'
import type { Cliente, StatusCliente } from '@/types'

const statusOpts: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inadimplente', label: 'Inadimplente' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'inativo', label: 'Inativo' },
]

export function ClientesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [modalCriar, setModalCriar] = useState(false)
  const [clienteDetalhe, setClienteDetalhe] = useState<Cliente | null>(null)
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', page, busca, status],
    queryFn: () => clientesService.listar({ page, limit: 20, busca: busca || undefined, status: status || undefined }),
  })

  const cobrarMutation = useMutation({
    mutationFn: (clienteId: string) => cobrancasService.enviarManual(clienteId),
    onSuccess: () => alert('Cobrança enviada via WhatsApp!'),
    onError: () => alert('Erro ao enviar cobrança'),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['clientes'] })

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} clientes cadastrados</p>
        </div>
        <button onClick={() => setModalCriar(true)} className="btn-primary">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(1) }}
          />
        </div>
        <select className="input max-w-40" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {!data?.data.length ? (
          <EmptyState
            icon={<Users size={48} />}
            title="Nenhum cliente encontrado"
            description="Cadastre o primeiro cliente para começar"
            action={<button onClick={() => setModalCriar(true)} className="btn-primary"><Plus size={16} /> Novo Cliente</button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">CPF</th>
                    <th className="px-6 py-3 font-medium text-gray-500">WhatsApp</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Limite</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Saldo Devedor</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Risco</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map(cliente => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setClienteDetalhe(cliente)}
                          className="font-medium text-primary-600 hover:underline text-left"
                        >
                          {cliente.nome}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{cliente.cpf ? formatCPF(cliente.cpf) : '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{cliente.whatsapp || cliente.telefone || '—'}</td>
                      <td className="px-6 py-4 text-gray-700">{formatCurrency(cliente.limiteCredito)}</td>
                      <td className="px-6 py-4">
                        <span className={cliente.saldoDevedor > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>
                          {formatCurrency(cliente.saldoDevedor)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={statusClienteBadge[cliente.status]}>
                          {statusClienteLabel[cliente.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={riscoBadge[cliente.risco]}>
                          {riscoLabel[cliente.risco]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setClienteEditar(cliente)}
                            className="text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            Editar
                          </button>
                          {(cliente.whatsapp || cliente.telefone) && (
                            <button
                              onClick={() => cobrarMutation.mutate(cliente.id)}
                              className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50 flex items-center gap-1"
                            >
                              <MessageSquare size={12} /> Cobrar
                            </button>
                          )}
                        </div>
                      </td>
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

      {/* Modais */}
      <Modal open={modalCriar} onClose={() => setModalCriar(false)} title="Novo Cliente" size="lg">
        <ClienteForm onSuccess={() => { setModalCriar(false); invalidar() }} />
      </Modal>

      <Modal open={!!clienteEditar} onClose={() => setClienteEditar(null)} title="Editar Cliente" size="lg">
        {clienteEditar && (
          <ClienteForm cliente={clienteEditar} onSuccess={() => { setClienteEditar(null); invalidar() }} />
        )}
      </Modal>

      <Modal open={!!clienteDetalhe} onClose={() => setClienteDetalhe(null)} title="Detalhes do Cliente" size="xl">
        {clienteDetalhe && <ClienteDetalhe clienteId={clienteDetalhe.id} />}
      </Modal>
    </div>
  )
}
