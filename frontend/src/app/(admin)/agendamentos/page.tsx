'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, Eye, Ban, CheckCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { agendamentoService, AgendamentoResponse } from '@/services/agendamento.service'
import { filialService } from '@/services/filial.service'
import { StatusAgendamento } from '@/types'

const STATUS_LABELS: Record<StatusAgendamento, string> = {
  CRIADO: 'Criado', PENDENTE_ACEITE: 'Pendente Aceite', CONFIRMADO: 'Confirmado',
  EM_TRANSITO: 'Em Trânsito', CHEGADA_PATIO: 'No Pátio', EM_DOCA: 'Na Doca',
  EM_OPERACAO: 'Em Operação', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado', NO_SHOW: 'No-Show',
}

const STATUS_COLORS: Record<StatusAgendamento, 'default' | 'info' | 'success' | 'warning' | 'danger' | 'pending'> = {
  CRIADO: 'default', PENDENTE_ACEITE: 'pending', CONFIRMADO: 'info',
  EM_TRANSITO: 'warning', CHEGADA_PATIO: 'warning', EM_DOCA: 'info',
  EM_OPERACAO: 'info', FINALIZADO: 'success', CANCELADO: 'danger', NO_SHOW: 'danger',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
]

export default function AgendamentosPage() {
  const router = useRouter()
  const [data, setData] = useState<{ content: AgendamentoResponse[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filialId, setFilialId] = useState('')
  const [status, setStatus] = useState<string>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filiais, setFiliais] = useState<{ value: string; label: string }[]>([])
  const [page, setPage] = useState(0)
  const [detalhesId, setDetalhesId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<AgendamentoResponse | null>(null)

  useEffect(() => {
    filialService.listar(undefined, 0, 100).then(res => {
      setFiliais([
        { value: '', label: 'Todas as filiais' },
        ...res.content.map(f => ({ value: f.id, label: f.nome })),
      ])
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await agendamentoService.listar({
        filialId: filialId || undefined,
        status: (status as StatusAgendamento) || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
        busca: busca || undefined,
        page,
      })
      setData(res.data.data as any)
    } finally {
      setLoading(false)
    }
  }, [filialId, status, dataInicio, dataFim, busca, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (detalhesId) {
      agendamentoService.buscarPorId(detalhesId).then(res => setDetalhe(res.data.data))
    }
  }, [detalhesId])

  const handleAcao = async (id: string, acao: string) => {
    switch (acao) {
      case 'confirmar': await agendamentoService.confirmar(id); break
      case 'chegada': await agendamentoService.registrarChegada(id); break
      case 'iniciar': await agendamentoService.iniciarOperacao(id); break
      case 'finalizar': await agendamentoService.finalizar(id); break
      case 'noshow': await agendamentoService.registrarNoShow(id); break
      case 'aceitar': await agendamentoService.aceitar(id); break
      case 'recusar': {
        const motivo = prompt('Motivo da recusa:') ?? 'Recusado pelo operador'
        await agendamentoService.recusar(id, motivo)
        break
      }
    }
    load()
  }

  const columns = [
    { key: 'codigo', label: 'Código', render: (a: AgendamentoResponse) => (
      <div>
        <div className="font-mono text-sm font-medium text-blue-600">{a.codigo}</div>
        <div className="text-xs text-gray-500">{a.protocolo}</div>
      </div>
    )},
    { key: 'data', label: 'Data / Horário', render: (a: AgendamentoResponse) => (
      <div>
        <div className="text-sm font-medium">{a.dataOperacao.split('-').reverse().join('/')}</div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />{a.horarioInicio} – {a.horarioFim}
        </div>
      </div>
    )},
    { key: 'janela', label: 'Janela / Filial', render: (a: AgendamentoResponse) => (
      <div>
        <div className="text-sm font-medium">{a.janelaNome}</div>
        <div className="text-xs text-gray-500">{a.filialNome}</div>
      </div>
    )},
    { key: 'transportadora', label: 'Transportadora', render: (a: AgendamentoResponse) => (
      <div className="text-sm">{a.transportadoraNome ?? <span className="text-gray-400">–</span>}</div>
    )},
    { key: 'motorista', label: 'Motorista / Veículo', render: (a: AgendamentoResponse) => (
      <div>
        <div className="text-sm">{a.motoristaNome ?? '–'}</div>
        <div className="text-xs text-gray-500 font-mono">{a.veiculoPlaca ?? ''}</div>
      </div>
    )},
    { key: 'status', label: 'Status', render: (a: AgendamentoResponse) => (
      <Badge variant={STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
    )},
    { key: 'acoes', label: 'Ações', render: (a: AgendamentoResponse) => (
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setDetalhesId(a.id)} className="text-blue-600 hover:text-blue-800 p-1" title="Detalhes">
          <Eye className="h-4 w-4" />
        </button>
        {a.status === 'CRIADO' && (
          <button onClick={() => handleAcao(a.id, 'confirmar')} className="text-green-600 hover:text-green-800 p-1" title="Confirmar">
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
        {a.status === 'PENDENTE_ACEITE' && (
          <>
            <button onClick={() => handleAcao(a.id, 'aceitar')} className="text-green-600 hover:text-green-800 p-1" title="Aceitar">
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button onClick={() => handleAcao(a.id, 'recusar')} className="text-red-500 hover:text-red-700 p-1" title="Recusar">
              <ThumbsDown className="h-4 w-4" />
            </button>
          </>
        )}
        {!['FINALIZADO','CANCELADO','NO_SHOW'].includes(a.status) && (
          <button onClick={() => agendamentoService.cancelar(a.id, 'Cancelado pelo operador').then(load)}
            className="text-red-600 hover:text-red-800 p-1" title="Cancelar">
            <Ban className="h-4 w-4" />
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm text-gray-500">Gerencie os agendamentos logísticos</p>
        </div>
        <Button onClick={() => router.push('/agendamentos/novo')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Agendamento
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select label="Filial" value={filialId} onValueChange={(v) => { setFilialId(v); setPage(0) }} options={filiais} />
          <Select label="Status" value={status} onValueChange={(v) => { setStatus(v); setPage(0) }} options={STATUS_OPTIONS} />
          <Input label="Data Início" type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(0) }} />
          <Input label="Data Fim" type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(0) }} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Input label="Buscar código/protocolo" value={busca} onChange={e => { setBusca(e.target.value); setPage(0) }}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />} />
          </div>
        </div>
      </div>

      <Table columns={columns} data={data?.content ?? []} loading={loading} emptyMessage="Nenhum agendamento encontrado" />

      {data && data.totalPages > 1 && (
        <Pagination page={data.number} totalPages={data.totalPages}
          totalElements={data.totalElements} pageSize={data.size} onPageChange={setPage} />
      )}

      {/* Detalhes Modal */}
      <Modal isOpen={!!detalhesId} onClose={() => { setDetalhesId(null); setDetalhe(null) }}
        title="Detalhes do Agendamento" size="xl">
        {detalhe && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Código:</span> <span className="font-mono font-medium">{detalhe.codigo}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge variant={STATUS_COLORS[detalhe.status]}>{STATUS_LABELS[detalhe.status]}</Badge></div>
              <div><span className="text-gray-500">Data:</span> <span className="font-medium">{detalhe.dataOperacao.split('-').reverse().join('/')}</span></div>
              <div><span className="text-gray-500">Horário:</span> <span className="font-medium">{detalhe.horarioInicio} – {detalhe.horarioFim}</span></div>
              <div><span className="text-gray-500">Janela:</span> <span className="font-medium">{detalhe.janelaNome}</span></div>
              <div><span className="text-gray-500">Filial:</span> <span className="font-medium">{detalhe.filialNome}</span></div>
              <div><span className="text-gray-500">Transportadora:</span> <span>{detalhe.transportadoraNome ?? '–'}</span></div>
              <div><span className="text-gray-500">Fornecedor:</span> <span>{detalhe.fornecedorNome ?? '–'}</span></div>
              <div><span className="text-gray-500">Motorista:</span> <span>{detalhe.motoristaNome ?? '–'}</span></div>
              <div><span className="text-gray-500">Veículo:</span> <span className="font-mono">{detalhe.veiculoPlaca ?? '–'}</span></div>
            </div>

            {detalhe.historico.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Histórico</h4>
                <div className="space-y-2">
                  {detalhe.historico.map(h => (
                    <div key={h.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{STATUS_LABELS[h.statusNovo]}</span>
                        {h.observacao && <span className="text-gray-500"> — {h.observacao}</span>}
                        <div className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('pt-BR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {detalhe.status === 'CRIADO' && (
                  <Button size="sm" onClick={() => { handleAcao(detalhe.id, 'confirmar'); setDetalhesId(null) }}>
                    Confirmar
                  </Button>
                )}
                {detalhe.status === 'CONFIRMADO' && (
                  <Button size="sm" onClick={() => { handleAcao(detalhe.id, 'chegada'); setDetalhesId(null) }}>
                    Registrar Chegada
                  </Button>
                )}
                {detalhe.status === 'CHEGADA_PATIO' && (
                  <Button size="sm" onClick={() => { handleAcao(detalhe.id, 'iniciar'); setDetalhesId(null) }}>
                    Iniciar Operação
                  </Button>
                )}
                {detalhe.status === 'EM_OPERACAO' && (
                  <Button size="sm" onClick={() => { handleAcao(detalhe.id, 'finalizar'); setDetalhesId(null) }}>
                    Finalizar
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => { setDetalhesId(null); setDetalhe(null) }}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
