import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CreditCard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { pagamentosService } from '@/services/pagamentos.service'
import { clientesService } from '@/services/clientes.service'
import { PageLoading, Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate, formaPagamentoLabel } from '@/utils'
import dayjs from 'dayjs'

const schema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  valor: z.coerce.number().min(0.01),
  dataPagamento: z.string().min(1),
  formaPagamento: z.string().default('dinheiro'),
  observacao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const formaOpts = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
]

export function PagamentosPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['pagamentos', page],
    queryFn: () => pagamentosService.listar({ page, limit: 20 }),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => clientesService.listar({ limit: 200 }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { dataPagamento: dayjs().format('YYYY-MM-DD'), formaPagamento: 'dinheiro' },
  })

  const criarMutation = useMutation({
    mutationFn: (data: FormData) => pagamentosService.registrar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagamentos'] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setModal(false)
      reset()
    },
    onError: (e: any) => alert(e?.response?.data?.message || 'Erro ao registrar pagamento'),
  })

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} registros</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={16} /> Registrar Pagamento
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {!data?.data.length ? (
          <EmptyState icon={<CreditCard size={48} />} title="Nenhum pagamento registrado" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Data</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Valor</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Forma</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{p.cliente?.nome || '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(p.dataPagamento)}</td>
                      <td className="px-6 py-4 font-semibold text-green-600">{formatCurrency(p.valor)}</td>
                      <td className="px-6 py-4"><span className="badge badge-blue">{formaPagamentoLabel[p.formaPagamento]}</span></td>
                      <td className="px-6 py-4 text-gray-400">{p.observacao || '—'}</td>
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

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar Pagamento">
        <form onSubmit={handleSubmit(d => criarMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select {...register('clienteId')} className="input">
              <option value="">Selecione...</option>
              {clientes?.data.map(c => (
                <option key={c.id} value={c.id}>{c.nome} — {formatCurrency(c.saldoDevedor)}</option>
              ))}
            </select>
            {errors.clienteId && <p className="text-red-500 text-xs mt-1">{errors.clienteId.message}</p>}
          </div>
          <div>
            <label className="label">Valor (R$) *</label>
            <input {...register('valor')} type="number" step="0.01" className="input" placeholder="100.00" />
          </div>
          <div>
            <label className="label">Data do Pagamento *</label>
            <input {...register('dataPagamento')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Forma de Pagamento</label>
            <select {...register('formaPagamento')} className="input">
              {formaOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Observação</label>
            <input {...register('observacao')} className="input" placeholder="Informações adicionais" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={criarMutation.isPending}>
            {criarMutation.isPending ? <Spinner size="sm" /> : 'Registrar Pagamento'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
