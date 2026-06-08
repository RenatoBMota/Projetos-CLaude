import { useQuery } from '@tanstack/react-query'
import { clientesService } from '@/services/clientes.service'
import { PageLoading } from '@/components/ui/Spinner'
import {
  formatCurrency, formatDate, statusClienteBadge, statusClienteLabel,
  riscoBadge, riscoLabel, formatCPF, formatPhone, statusCompraLabel,
} from '@/utils'

export function ClienteDetalhe({ clienteId }: { clienteId: string }) {
  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clientesService.buscarPorId(clienteId),
  })

  if (isLoading || !cliente) return <PageLoading />

  const limiteDisponivel = Number(cliente.limiteCredito) - Number(cliente.saldoDevedor)
  const usadoPct = Math.min((Number(cliente.saldoDevedor) / Number(cliente.limiteCredito)) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-xl font-bold text-primary-600">
          {cliente.nome[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{cliente.nome}</h3>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className={statusClienteBadge[cliente.status]}>{statusClienteLabel[cliente.status]}</span>
            <span className={riscoBadge[cliente.risco]}>Risco {riscoLabel[cliente.risco]}</span>
            <span className="badge badge-blue">Score: {cliente.score}</span>
          </div>
        </div>
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Limite Total', value: formatCurrency(cliente.limiteCredito), color: 'text-gray-900' },
          { label: 'Saldo Devedor', value: formatCurrency(cliente.saldoDevedor), color: 'text-red-600' },
          { label: 'Disponível', value: formatCurrency(limiteDisponivel), color: 'text-green-600' },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Barra limite */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Limite usado</span><span>{usadoPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usadoPct > 80 ? 'bg-red-500' : usadoPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${usadoPct}%` }}
          />
        </div>
      </div>

      {/* Contato */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {cliente.cpf && <div><span className="text-gray-400">CPF:</span> {formatCPF(cliente.cpf)}</div>}
        {cliente.whatsapp && <div><span className="text-gray-400">WhatsApp:</span> {formatPhone(cliente.whatsapp)}</div>}
        {cliente.telefone && <div><span className="text-gray-400">Tel:</span> {formatPhone(cliente.telefone)}</div>}
        {cliente.cidade && <div><span className="text-gray-400">Cidade:</span> {cliente.cidade}</div>}
        <div><span className="text-gray-400">Prazo:</span> {cliente.prazoPagamentoDias} dias</div>
        {cliente.diaVencimento && <div><span className="text-gray-400">Vence dia:</span> {cliente.diaVencimento}</div>}
      </div>

      {/* Últimas compras */}
      {cliente.compras && cliente.compras.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Últimas Compras</h4>
          <div className="space-y-2">
            {cliente.compras.slice(0, 6).map(compra => (
              <div key={compra.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium">{formatDate(compra.dataCompra)}</p>
                  {compra.observacao && <p className="text-gray-400 text-xs">{compra.observacao}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(compra.valor)}</p>
                  <span className="text-xs text-gray-400">{statusCompraLabel[compra.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
