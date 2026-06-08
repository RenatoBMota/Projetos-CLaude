import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Upload, ShoppingCart, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { comprasService } from '@/services/compras.service'
import { clientesService } from '@/services/clientes.service'
import { PageLoading, Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency, formatDate, statusCompraLabel } from '@/utils'
import dayjs from 'dayjs'

const schema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  valor: z.coerce.number().min(0.01, 'Valor obrigatório'),
  dataCompra: z.string().min(1),
  observacao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function ComprasPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalNova, setModalNova] = useState(false)
  const [modalXml, setModalXml] = useState(false)
  const [xmlCliente, setXmlCliente] = useState('')
  const [xmlContent, setXmlContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['compras', page],
    queryFn: () => comprasService.listar({ page, limit: 20 }),
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: () => clientesService.listar({ limit: 200 }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { dataCompra: dayjs().format('YYYY-MM-DD') },
  })

  const criarMutation = useMutation({
    mutationFn: (data: FormData) => comprasService.registrar(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); setModalNova(false); reset() },
    onError: (e: any) => alert(e?.response?.data?.message || 'Erro ao registrar compra'),
  })

  const xmlMutation = useMutation({
    mutationFn: () => comprasService.importarXml(xmlContent, xmlCliente),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compras'] }); setModalXml(false); setXmlContent(''); setXmlCliente('') },
    onError: (e: any) => alert(e?.response?.data?.message || 'Erro ao importar XML'),
  })

  const handleXmlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setXmlContent(ev.target?.result as string)
    reader.readAsText(file)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras Fiadas</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalXml(true)} className="btn-secondary">
            <Upload size={16} /> Importar XML
          </button>
          <button onClick={() => setModalNova(true)} className="btn-primary">
            <Plus size={16} /> Nova Compra
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {!data?.data.length ? (
          <EmptyState icon={<ShoppingCart size={48} />} title="Nenhuma compra registrada" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Data</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Vencimento</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Valor</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Observação</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Origem</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map(compra => (
                    <tr key={compra.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{compra.cliente?.nome || '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(compra.dataCompra)}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {compra.dataVencimento ? formatDate(compra.dataVencimento) : '—'}
                      </td>
                      <td className="px-6 py-4 font-semibold">{formatCurrency(compra.valor)}</td>
                      <td className="px-6 py-4 text-gray-400 max-w-40 truncate">{compra.observacao || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="badge badge-gray capitalize">{compra.origem.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${compra.status === 'quitada' ? 'badge-green' : compra.status === 'cancelada' ? 'badge-gray' : compra.status === 'pendente' ? 'badge-yellow' : 'badge-blue'}`}>
                          {statusCompraLabel[compra.status]}
                        </span>
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

      {/* Modal Nova Compra */}
      <Modal open={modalNova} onClose={() => setModalNova(false)} title="Registrar Compra Fiada">
        <form onSubmit={handleSubmit(d => criarMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select {...register('clienteId')} className="input">
              <option value="">Selecione...</option>
              {clientes?.data.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {errors.clienteId && <p className="text-red-500 text-xs mt-1">{errors.clienteId.message}</p>}
          </div>
          <div>
            <label className="label">Valor (R$) *</label>
            <input {...register('valor')} type="number" step="0.01" className="input" placeholder="125.40" />
            {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
          </div>
          <div>
            <label className="label">Data da Compra *</label>
            <input {...register('dataCompra')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Observação</label>
            <input {...register('observacao')} className="input" placeholder="Compras do dia" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting || criarMutation.isPending}>
            {criarMutation.isPending ? <Spinner size="sm" /> : 'Registrar Compra'}
          </button>
        </form>
      </Modal>

      {/* Modal Importar XML */}
      <Modal open={modalXml} onClose={() => setModalXml(false)} title="Importar XML NF-e / NFC-e">
        <div className="space-y-4">
          <div>
            <label className="label">Cliente *</label>
            <select className="input" value={xmlCliente} onChange={e => setXmlCliente(e.target.value)}>
              <option value="">Selecione...</option>
              {clientes?.data.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Arquivo XML</label>
            <input type="file" accept=".xml" onChange={handleXmlFile} className="input" />
          </div>
          {xmlContent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              ✓ Arquivo carregado ({(xmlContent.length / 1024).toFixed(1)} KB)
            </div>
          )}
          <button
            onClick={() => xmlMutation.mutate()}
            className="btn-primary w-full"
            disabled={!xmlCliente || !xmlContent || xmlMutation.isPending}
          >
            {xmlMutation.isPending ? <Spinner size="sm" /> : 'Importar XML'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
