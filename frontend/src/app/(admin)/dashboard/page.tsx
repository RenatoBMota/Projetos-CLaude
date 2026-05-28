'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  CalendarDays, Truck, Building2, Users, Package, CheckCircle,
  TrendingUp, AlertTriangle, FileText, BarChart2, RefreshCw,
} from 'lucide-react'
import { KpiCard } from '@/components/ui/KpiCard'
import { HorizontalBars } from '@/components/ui/HorizontalBars'
import { GaugeRing } from '@/components/ui/GaugeRing'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { dashboardService, DashboardKpiResponse } from '@/services/dashboard.service'
import { filialService } from '@/services/filial.service'

const FASES = [
  { fase: 0, titulo: 'Fundação',            status: 'done',    desc: 'Setup, infra, CI/CD' },
  { fase: 1, titulo: 'Cadastros Mestres',   status: 'done',    desc: 'Auth, filiais, parceiros' },
  { fase: 2, titulo: 'Motor Agendamento',   status: 'done',    desc: 'Janelas, slots, bloqueios' },
  { fase: 3, titulo: 'Módulo Documental',   status: 'done',    desc: 'XML, NF-e, validações' },
  { fase: 4, titulo: 'Portal Externo',      status: 'done',    desc: 'Transportadoras, aceite' },
  { fase: 5, titulo: 'Painel Operacional',  status: 'done',    desc: 'Dashboard, KPIs' },
  { fase: 6, titulo: 'Notificações',        status: 'next',    desc: 'E-mail, WhatsApp' },
  { fase: 7, titulo: 'Integrações',         status: 'pending', desc: 'YMS, WMS, ERP' },
]

const MENUS = [
  { label: 'Agendamentos',  href: '/agendamentos',  icon: CalendarDays, desc: 'Motor de agendamento' },
  { label: 'Documentos',    href: '/documentos',    icon: FileText,     desc: 'NF-e, CT-e, validações' },
  { label: 'Janelas',       href: '/janelas',       icon: BarChart2,    desc: 'Configurar janelas e slots' },
  { label: 'Filiais / Docas', href: '/filiais',     icon: Building2,    desc: 'Unidades operacionais' },
  { label: 'Transportadoras', href: '/transportadoras', icon: Truck,    desc: 'Parceiros logísticos' },
  { label: 'Fornecedores',  href: '/fornecedores',  icon: Users,        desc: 'Cadastro de fornecedores' },
]

const STATUS_COLORS: Record<string, string> = {
  CRIADO: 'bg-gray-400',
  PENDENTE_ACEITE: 'bg-yellow-400',
  CONFIRMADO: 'bg-blue-400',
  EM_TRANSITO: 'bg-orange-400',
  CHEGADA_PATIO: 'bg-amber-400',
  EM_DOCA: 'bg-purple-400',
  EM_OPERACAO: 'bg-indigo-500',
  FINALIZADO: 'bg-green-500',
  CANCELADO: 'bg-red-400',
  NO_SHOW: 'bg-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  CRIADO: 'Criado', PENDENTE_ACEITE: 'Pend. Aceite', CONFIRMADO: 'Confirmado',
  EM_TRANSITO: 'Em Trânsito', CHEGADA_PATIO: 'No Pátio', EM_DOCA: 'Na Doca',
  EM_OPERACAO: 'Em Operação', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado', NO_SHOW: 'No-Show',
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

export default function DashboardPage() {
  const { usuario } = useAuthStore()
  const [kpis, setKpis] = useState<DashboardKpiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filiais, setFiliais] = useState<{ value: string; label: string }[]>([])
  const [filialId, setFilialId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    filialService.listar(undefined, 0, 100).then(res => {
      setFiliais([
        { value: '', label: 'Todas as filiais' },
        ...res.content.map((f: any) => ({ value: f.id, label: f.nome })),
      ])
    }).catch(() => {})
  }, [])

  const loadKpis = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dashboardService.kpis({
        filialId: filialId || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      })
      setKpis(res.data.data)
      setLastUpdate(new Date())
    } catch {
      /* silently fail on auth issues */
    } finally {
      setLoading(false)
    }
  }, [filialId, dataInicio, dataFim])

  useEffect(() => { loadKpis() }, [loadKpis])

  const statusBars = kpis
    ? Object.entries(kpis.porStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          label: STATUS_LABELS[k] ?? k,
          value: v,
          color: STATUS_COLORS[k],
        }))
        .sort((a, b) => b.value - a.value)
    : []

  const totalDocs = (kpis?.documentosPendentes ?? 0) + (kpis?.documentosAprovados ?? 0) + (kpis?.documentosRejeitados ?? 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Operacional</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Bem-vindo, {usuario?.nome}
            {lastUpdate && (
              <span className="ml-2 text-xs text-gray-400">
                · Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadKpis} loading={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="Filial" value={filialId} onValueChange={setFilialId} options={filiais} />
          <Input label="Data Início" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          <Input label="Data Fim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Agendamentos Hoje"
          value={loading ? '…' : fmt(kpis?.totalHoje ?? 0)}
          sub="operações ativas no dia"
          color="blue"
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <KpiCard
          label="Esta Semana"
          value={loading ? '…' : fmt(kpis?.totalSemana ?? 0)}
          sub="agendamentos no período"
          color="purple"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Este Mês"
          value={loading ? '…' : fmt(kpis?.totalMes ?? 0)}
          sub="agendamentos no mês corrente"
          color="slate"
          icon={<BarChart2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Docs Pendentes"
          value={loading ? '…' : fmt(kpis?.documentosPendentes ?? 0)}
          sub={`de ${fmt(totalDocs)} documentos`}
          color={kpis && kpis.documentosPendentes > 0 ? 'yellow' : 'green'}
          icon={<FileText className="w-5 h-5" />}
        />
      </div>

      {/* Gauges row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex flex-col items-center py-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">SLA Conformidade</p>
          {loading ? (
            <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
          ) : (
            <GaugeRing
              value={kpis?.taxaSlaConformidade ?? 0}
              label="no prazo"
              color="#22c55e"
              size={90}
            />
          )}
          <div className="mt-4 w-full space-y-1.5">
            {kpis && Object.entries(kpis.porSla).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className={`font-medium ${
                  k === 'NO_PRAZO' ? 'text-green-600' :
                  k === 'PROXIMO_VENCIMENTO' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {k === 'NO_PRAZO' ? 'No Prazo' : k === 'PROXIMO_VENCIMENTO' ? 'Próx. Vcto' : 'Vencido'}
                </span>
                <span className="text-gray-600">{fmt(v)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col items-center py-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Taxa de Finalização</p>
          {loading ? (
            <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
          ) : (
            <GaugeRing
              value={kpis?.taxaFinalizados ?? 0}
              label="finalizados"
              color="#3b82f6"
              size={90}
            />
          )}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {fmt(kpis?.porStatus?.['FINALIZADO'] ?? 0)} finalizados no período selecionado
            </p>
          </div>
        </div>

        <div className="card flex flex-col items-center py-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Taxa de No-Show</p>
          {loading ? (
            <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
          ) : (
            <GaugeRing
              value={kpis?.taxaNoShow ?? 0}
              label="no-show"
              color={kpis && kpis.taxaNoShow > 10 ? '#ef4444' : '#f59e0b'}
              size={90}
            />
          )}
          {kpis && kpis.taxaNoShow > 5 && (
            <div className="mt-3 flex items-center gap-1 text-xs text-yellow-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Acima do limite recomendado (5%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Status distribution + Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-gray-400" /> Distribuição por Status
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <HorizontalBars items={statusBars} showPercent />
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-gray-400" /> Top Transportadoras
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : kpis?.topTransportadoras?.length ? (
            <HorizontalBars
              items={kpis.topTransportadoras.map(t => ({ label: t.nome, value: t.total, color: 'bg-brand-500' }))}
              showPercent
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma transportadora com agendamentos</p>
          )}
        </div>
      </div>

      {/* Por Filial + Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400" /> Agendamentos por Filial
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : kpis?.porFilial?.length ? (
            <HorizontalBars
              items={kpis.porFilial.map((f, i) => ({
                label: f.nome,
                value: f.total,
                color: ['bg-teal-500','bg-cyan-500','bg-sky-500','bg-blue-500'][i % 4],
              }))}
              showPercent
            />
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum dado disponível</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" /> Documentos Fiscais
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <HorizontalBars
              items={[
                { label: 'Aprovados',  value: kpis?.documentosAprovados  ?? 0, color: 'bg-green-500' },
                { label: 'Pendentes',  value: kpis?.documentosPendentes  ?? 0, color: 'bg-yellow-400' },
                { label: 'Rejeitados', value: kpis?.documentosRejeitados ?? 0, color: 'bg-red-400' },
              ].filter(i => i.value > 0)}
              showPercent
            />
          )}
          {kpis && (
            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{fmt(kpis.documentosAprovados)}</p>
                <p className="text-xs text-gray-500">Aprovados</p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-600">{fmt(kpis.documentosPendentes)}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{fmt(kpis.documentosRejeitados)}</p>
                <p className="text-xs text-gray-500">Rejeitados</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Progress (compact) */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Progresso do Projeto</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FASES.map(({ fase, titulo, status, desc }) => (
            <div key={fase} className={`px-3 py-2 rounded-lg border text-xs ${
              status === 'done' ? 'bg-green-50 border-green-200' :
              status === 'next' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {status === 'done' && <CheckCircle className="w-3 h-3 text-green-600" />}
                {status === 'next' && <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                {status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-gray-300" />}
                <span className={`font-semibold ${
                  status === 'done' ? 'text-green-800' :
                  status === 'next' ? 'text-blue-800' : 'text-gray-400'
                }`}>F{fase} · {titulo}</span>
              </div>
              <p className="text-gray-400 pl-4">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MENUS.map(({ label, href, icon: Icon, desc }) => (
            <a key={href} href={href} className="card p-4 hover:shadow-md transition-shadow flex flex-col items-center gap-2 text-center">
              <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-xs">{label}</p>
                <p className="text-xs text-gray-400 leading-tight mt-0.5">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
