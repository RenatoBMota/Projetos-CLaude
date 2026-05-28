'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Mail, MessageCircle, CheckCircle, XCircle, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { notificacaoService, NotificacaoLogResponse } from '@/services/notificacao.service'

const CANAL_OPTIONS = [
  { value: '', label: 'Todos os canais' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
]

const STATUS_COLORS = {
  ENVIADO:    'success' as const,
  FALHOU:     'danger' as const,
  DESATIVADO: 'neutral' as const,
}

const EVENTO_LABELS: Record<string, string> = {
  'agendamento.criado':          'Criado',
  'agendamento.aceite_pendente': 'Pendente Aceite',
  'agendamento.confirmado':      'Confirmado',
  'agendamento.cancelado':       'Cancelado',
}

function eventoColor(evento: string) {
  if (evento.includes('cancelado')) return 'danger' as const
  if (evento.includes('pendente'))  return 'pending' as const
  if (evento.includes('confirmado')) return 'success' as const
  return 'info' as const
}

export default function NotificacoesPage() {
  const [data, setData] = useState<{ content: NotificacaoLogResponse[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [canal, setCanal] = useState('')
  const [page, setPage] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificacaoService.listar(canal || undefined, page)
      setData(res.data.data as any)
    } finally {
      setLoading(false)
    }
  }, [canal, page])

  useEffect(() => { load() }, [load])

  const totalEnviados = data?.content.filter(n => n.status === 'ENVIADO').length ?? 0
  const totalFalhados = data?.content.filter(n => n.status === 'FALHOU').length ?? 0

  const columns = [
    {
      key: 'canal', label: 'Canal', render: (n: NotificacaoLogResponse) => (
        <div className="flex items-center gap-2">
          {n.canal === 'EMAIL'
            ? <Mail className="h-4 w-4 text-blue-500" />
            : <MessageCircle className="h-4 w-4 text-green-500" />}
          <span className="text-sm font-medium text-gray-700">{n.canal}</span>
        </div>
      ),
    },
    {
      key: 'evento', label: 'Evento', render: (n: NotificacaoLogResponse) => (
        <Badge variant={eventoColor(n.evento)}>
          {EVENTO_LABELS[n.evento] ?? n.evento}
        </Badge>
      ),
    },
    {
      key: 'destinatario', label: 'Destinatário', render: (n: NotificacaoLogResponse) => (
        <div className="text-sm text-gray-700 font-mono truncate max-w-[200px]">{n.destinatario}</div>
      ),
    },
    {
      key: 'assunto', label: 'Assunto / Mensagem', render: (n: NotificacaoLogResponse) => (
        <div className="text-xs text-gray-500 truncate max-w-[220px]">{n.assunto ?? '–'}</div>
      ),
    },
    {
      key: 'status', label: 'Status', render: (n: NotificacaoLogResponse) => (
        <div className="flex items-center gap-1.5">
          {n.status === 'ENVIADO'
            ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            : n.status === 'FALHOU'
              ? <XCircle className="h-3.5 w-3.5 text-red-500" />
              : null}
          <Badge variant={STATUS_COLORS[n.status] ?? 'neutral'}>{n.status}</Badge>
        </div>
      ),
    },
    {
      key: 'erro', label: 'Erro', render: (n: NotificacaoLogResponse) => (
        n.erro
          ? <span className="text-xs text-red-600 truncate max-w-[160px] block" title={n.erro}>{n.erro}</span>
          : <span className="text-gray-300 text-xs">–</span>
      ),
    },
    {
      key: 'data', label: 'Enviado em', render: (n: NotificacaoLogResponse) => (
        <div className="text-xs text-gray-500">
          {new Date(n.criadoEm).toLocaleDateString('pt-BR')}
          <br />
          {new Date(n.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-sm text-gray-500">Log de e-mails e WhatsApp enviados pelo sistema</p>
        </div>
      </div>

      {/* Status bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card flex items-center gap-3 p-4">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.totalElements.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-500">Total enviadas</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{totalEnviados}</p>
              <p className="text-xs text-gray-500">Nesta página — sucesso</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${totalFalhados > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {totalFalhados}
              </p>
              <p className="text-xs text-gray-500">Nesta página — falhas</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="max-w-xs">
          <Select
            label="Filtrar por canal"
            value={canal}
            onValueChange={v => { setCanal(v); setPage(0) }}
            options={CANAL_OPTIONS}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.content ?? []}
        loading={loading}
        emptyMessage="Nenhuma notificação registrada"
      />

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.number}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          pageSize={data.size}
          onPageChange={setPage}
        />
      )}

      {/* Config hint */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-blue-800">Configuração de envio</p>
            <p className="text-blue-700 mt-0.5">
              Para ativar e-mail: defina <code className="bg-blue-100 px-1 rounded">NOTIF_EMAIL_ENABLED=true</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">MAIL_HOST</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">MAIL_USERNAME</code> e{' '}
              <code className="bg-blue-100 px-1 rounded">MAIL_PASSWORD</code>.
            </p>
            <p className="text-blue-700 mt-1">
              Para WhatsApp: defina <code className="bg-blue-100 px-1 rounded">NOTIF_WHATSAPP_ENABLED=true</code> e{' '}
              <code className="bg-blue-100 px-1 rounded">NOTIF_WHATSAPP_WEBHOOK_URL</code> (Meta Cloud API, Twilio, etc.).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
