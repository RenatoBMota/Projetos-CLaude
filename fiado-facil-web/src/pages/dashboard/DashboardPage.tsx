import { useQuery } from '@tanstack/react-query'
import {
  Users, TrendingUp, AlertCircle, DollarSign,
  ShoppingCart, UserPlus, BarChart2,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { dashboardService } from '@/services/dashboard.service'
import { StatCard } from '@/components/ui/StatCard'
import { PageLoading } from '@/components/ui/Spinner'
import { formatCurrency, formatDate, statusClienteBadge, statusClienteLabel, riscoBadge, riscoLabel } from '@/utils'
import dayjs from 'dayjs'

export function DashboardPage() {
  const { data: resumo, isLoading } = useQuery({
    queryKey: ['dashboard-resumo'],
    queryFn: dashboardService.resumo,
  })

  const { data: recebimentos = [] } = useQuery({
    queryKey: ['dashboard-recebimentos'],
    queryFn: () => dashboardService.recebimentosPorDia(),
  })

  const { data: comprasDia = [] } = useQuery({
    queryKey: ['dashboard-compras-dia'],
    queryFn: () => dashboardService.comprasPorDia(),
  })

  const { data: ranking = [] } = useQuery({
    queryKey: ['dashboard-ranking'],
    queryFn: dashboardService.ranking,
  })

  if (isLoading || !resumo) return <PageLoading />

  const chartData = recebimentos.map(r => ({
    dia: dayjs(r.dia).format('DD/MM'),
    recebimentos: parseFloat(r.total),
  }))

  const comprasData = comprasDia.map(c => ({
    dia: dayjs(c.dia).format('DD/MM'),
    valor: parseFloat(c.total),
    qtd: parseInt(c.quantidade),
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu negócio — {dayjs().format('MMMM [de] YYYY')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total a Receber"
          value={formatCurrency(resumo.totalAReceber)}
          icon={<DollarSign size={22} />}
          color="blue"
        />
        <StatCard
          title="Clientes Ativos"
          value={resumo.totalClientes}
          icon={<Users size={22} />}
          color="green"
          subtitle={`+${resumo.novoClientesMes} novos este mês`}
        />
        <StatCard
          title="Inadimplentes"
          value={resumo.clientesInadimplentes}
          icon={<AlertCircle size={22} />}
          color="red"
          subtitle={formatCurrency(resumo.valorInadimplencia) + ' em aberto'}
        />
        <StatCard
          title="Recebimentos do Mês"
          value={formatCurrency(resumo.recebimentosMes)}
          icon={<TrendingUp size={22} />}
          color="green"
          subtitle={`Ticket médio: ${formatCurrency(resumo.ticketMedio)}`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recebimentos por dia */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            Recebimentos por Dia
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="recebimentos" stroke="#3b82f6" fill="url(#recGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Compras por dia */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary-600" />
            Compras Fiadas por Dia
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comprasData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart2 size={18} className="text-primary-600" />
          Top Devedores
        </h2>
        {ranking.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum dado disponível</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-3 font-medium text-gray-500">#</th>
                  <th className="pb-3 font-medium text-gray-500">Cliente</th>
                  <th className="pb-3 font-medium text-gray-500">Status</th>
                  <th className="pb-3 font-medium text-gray-500">Risco</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Saldo Devedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ranking.map((c, i) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-3 font-medium">{c.nome}</td>
                    <td className="py-3">
                      <span className={statusClienteBadge[c.status]}>
                        {statusClienteLabel[c.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={riscoBadge[c.risco]}>
                        {riscoLabel[c.risco]}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(c.saldoDevedor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
