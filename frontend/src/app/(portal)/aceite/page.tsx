'use client'

import { useState, useCallback, useEffect } from 'react'
import { Truck, Clock, CheckCircle, XCircle, CalendarDays, Package, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { portalService } from '@/services/portal.service'
import { AgendamentoResponse } from '@/services/agendamento.service'
import { StatusAgendamento } from '@/types'

const STATUS_LABELS: Partial<Record<StatusAgendamento, string>> = {
  PENDENTE_ACEITE: 'Pendente Aceite',
  CONFIRMADO: 'Confirmado',
  EM_TRANSITO: 'Em Trânsito',
  CHEGADA_PATIO: 'No Pátio',
  EM_DOCA: 'Na Doca',
  EM_OPERACAO: 'Em Operação',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Partial<Record<StatusAgendamento, 'pending' | 'success' | 'info' | 'warning' | 'danger' | 'default'>> = {
  PENDENTE_ACEITE: 'pending',
  CONFIRMADO: 'info',
  EM_TRANSITO: 'warning',
  CHEGADA_PATIO: 'warning',
  EM_DOCA: 'info',
  EM_OPERACAO: 'info',
  FINALIZADO: 'success',
  CANCELADO: 'danger',
}

const TIPO_OPERACAO_LABELS: Record<string, string> = {
  RECEBIMENTO: 'Recebimento',
  EXPEDICAO: 'Expedição',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  CROSS_DOCKING: 'Cross Docking',
  ESPECIAL: 'Especial',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE_ACEITE', label: 'Pendentes Aceite' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'FINALIZADO', label: 'Finalizados' },
  { value: 'CANCELADO', label: 'Cancelados' },
]

export default function PortalAceitePage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') ?? ''

  const [agendamentos, setAgendamentos] = useState<AgendamentoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFiltro, setStatusFiltro] = useState(initialStatus)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [recusarModal, setRecusarModal] = useState<AgendamentoResponse | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [processando, setProcessando] = useState(false)
  const [detalheModal, setDetalheModal] = useState<AgendamentoResponse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await portalService.listar(
        (statusFiltro as StatusAgendamento) || undefined,
        page
      )
      const pageData = res.data.data as any
      setAgendamentos(pageData?.content ?? [])
      setTotalPages(pageData?.totalPages ?? 0)
    } catch {
      setAgendamentos([])
    } finally {
      setLoading(false)
    }
  }, [statusFiltro, page])

  useEffect(() => { load() }, [load])

  const handleAceitar = async (id: string) => {
    setProcessando(true)
    try {
      await portalService.aceitar(id)
      await load()
    } finally {
      setProcessando(false)
    }
  }

  const handleRecusar = async () => {
    if (!recusarModal) return
    setProcessando(true)
    try {
      await portalService.recusar(recusarModal.id, motivoRecusa || 'Recusado pela transportadora')
      await load()
      setRecusarModal(null)
      setMotivoRecusa('')
    } finally {
      setProcessando(false)
    }
  }

  const pendentesCount = agendamentos.filter(a => a.status === 'PENDENTE_ACEITE').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
        <p className="text-sm text-gray-500">Gerencie os agendamentos atribuídos à sua transportadora</p>
      </div>

      {/* Pendentes alert */}
      {pendentesCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800">
              {pendentesCount} agendamento{pendentesCount > 1 ? 's' : ''} aguardando sua confirmação
            </p>
            <p className="text-sm text-yellow-700">Revise e aceite ou recuse para liberar o slot.</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card">
        <div className="max-w-xs">
          <Select
            label="Filtrar por status"
            value={statusFiltro}
            onValueChange={v => { setStatusFiltro(v); setPage(0) }}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-32 bg-gray-100" />
          ))}
        </div>
      ) : agendamentos.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map(a => (
            <div
              key={a.id}
              className={`card hover:shadow-md transition-shadow ${
                a.status === 'PENDENTE_ACEITE' ? 'border-l-4 border-l-yellow-400' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-blue-600">{a.codigo}</span>
                    <Badge variant={STATUS_COLORS[a.status] ?? 'default'}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                    <Badge variant="neutral">{TIPO_OPERACAO_LABELS[a.tipoOperacao] ?? a.tipoOperacao}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                      <span>{a.dataOperacao.split('-').reverse().join('/')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{a.horarioInicio} – {a.horarioFim}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Truck className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{a.filialNome}</span>
                    </div>
                    {a.volumes && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Package className="h-3.5 w-3.5 text-gray-400" />
                        <span>{a.volumes} vol</span>
                        {a.pesoBruto && <span className="text-gray-400">/ {a.pesoBruto} kg</span>}
                      </div>
                    )}
                  </div>

                  {a.janelaNome && (
                    <p className="text-xs text-gray-500">Janela: {a.janelaNome}</p>
                  )}
                  {a.observacoes && (
                    <p className="text-xs text-gray-500 italic truncate">{a.observacoes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 sm:flex-col sm:items-end">
                  <button
                    onClick={() => setDetalheModal(a)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver detalhes
                  </button>
                  {a.status === 'PENDENTE_ACEITE' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setRecusarModal(a); setMotivoRecusa('') }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Recusar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAceitar(a.id)}
                        loading={processando}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aceitar
                      </Button>
                    </div>
                  )}
                  {a.aceiteMotivo && a.status === 'CANCELADO' && (
                    <p className="text-xs text-red-600 max-w-[200px] text-right">
                      Motivo: {a.aceiteMotivo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-gray-600 py-1.5">Página {page + 1} de {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}

      {/* Recusar Modal */}
      <Modal
        isOpen={!!recusarModal}
        onClose={() => { setRecusarModal(null); setMotivoRecusa('') }}
        title="Recusar Agendamento"
        size="sm"
      >
        {recusarModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-red-800">Agendamento {recusarModal.codigo}</p>
              <p className="text-red-600 text-xs mt-1">
                {recusarModal.dataOperacao.split('-').reverse().join('/')} — {recusarModal.horarioInicio} às {recusarModal.horarioFim}
              </p>
            </div>
            <Input
              label="Motivo da recusa"
              value={motivoRecusa}
              onChange={e => setMotivoRecusa(e.target.value)}
              placeholder="Descreva o motivo (opcional)..."
            />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => { setRecusarModal(null); setMotivoRecusa('') }}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleRecusar} loading={processando}>
                <XCircle className="h-4 w-4 mr-1.5" /> Confirmar Recusa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detalhe Modal */}
      <Modal
        isOpen={!!detalheModal}
        onClose={() => setDetalheModal(null)}
        title={`Agendamento ${detalheModal?.codigo ?? ''}`}
        size="md"
      >
        {detalheModal && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Data / Horário</p>
                <p className="font-medium mt-0.5">
                  {detalheModal.dataOperacao.split('-').reverse().join('/')} — {detalheModal.horarioInicio} às {detalheModal.horarioFim}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                <Badge variant={STATUS_COLORS[detalheModal.status] ?? 'default'} className="mt-0.5">
                  {STATUS_LABELS[detalheModal.status] ?? detalheModal.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Filial</p>
                <p className="font-medium mt-0.5">{detalheModal.filialNome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Janela</p>
                <p className="font-medium mt-0.5">{detalheModal.janelaNome}</p>
              </div>
              {detalheModal.motoristaNome && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Motorista</p>
                  <p className="font-medium mt-0.5">{detalheModal.motoristaNome}</p>
                </div>
              )}
              {detalheModal.veiculoPlaca && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Veículo</p>
                  <p className="font-mono font-medium mt-0.5">{detalheModal.veiculoPlaca}</p>
                </div>
              )}
              {detalheModal.pesoBruto && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Peso Bruto</p>
                  <p className="font-medium mt-0.5">{detalheModal.pesoBruto} kg</p>
                </div>
              )}
              {detalheModal.volumes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Volumes</p>
                  <p className="font-medium mt-0.5">{detalheModal.volumes} un</p>
                </div>
              )}
            </div>
            {detalheModal.observacoes && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Observações</p>
                <p className="mt-0.5 text-gray-700">{detalheModal.observacoes}</p>
              </div>
            )}
            {detalheModal.documentos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Documentos ({detalheModal.documentos.length})</p>
                <div className="space-y-1">
                  {detalheModal.documentos.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs bg-gray-50 px-2 py-1 rounded">
                      <span className="font-medium text-gray-700">{d.tipoDocumento}</span>
                      {d.numero && <span className="text-gray-500">nº {d.numero}</span>}
                      <Badge variant={d.statusValidacao === 'APROVADO' ? 'success' : d.statusValidacao === 'REJEITADO' ? 'danger' : 'pending'} className="ml-auto">
                        {d.statusValidacao}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detalheModal.status === 'PENDENTE_ACEITE' && (
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => { setDetalheModal(null); setRecusarModal(detalheModal); setMotivoRecusa('') }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Recusar
                </Button>
                <Button
                  size="sm"
                  onClick={() => { handleAceitar(detalheModal.id); setDetalheModal(null) }}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aceitar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
