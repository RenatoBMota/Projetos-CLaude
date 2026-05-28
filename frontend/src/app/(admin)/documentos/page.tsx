'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Download, CheckCircle, XCircle, Upload, Eye, FileText, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { DocumentoUpload } from '@/components/ui/DocumentoUpload'
import { documentoService, DocumentoResponse, ChecklistDocumentalResponse, TIPOS_DOCUMENTO } from '@/services/documento.service'
import { agendamentoService, AgendamentoResponse } from '@/services/agendamento.service'
import { StatusValidacaoDocumento } from '@/types'

const VALIDACAO_LABELS: Record<StatusValidacaoDocumento, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const VALIDACAO_COLORS: Record<StatusValidacaoDocumento, 'pending' | 'success' | 'danger'> = {
  PENDENTE: 'pending',
  APROVADO: 'success',
  REJEITADO: 'danger',
}

const VALIDACAO_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...Object.entries(VALIDACAO_LABELS).map(([k, v]) => ({ value: k, label: v })),
]

const TIPO_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  ...TIPOS_DOCUMENTO,
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ChecklistItem({ label, ok, exigido }: { label: string; ok: boolean; exigido: boolean }) {
  if (!exigido) return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <div className="h-4 w-4 rounded-full border border-gray-200" />
      <span>{label}</span>
      <span className="text-xs">(não exigido)</span>
    </div>
  )
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-700'}`}>
      {ok
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <XCircle className="h-4 w-4 text-red-500" />}
      <span className="font-medium">{label}</span>
      <span className="text-xs">{ok ? 'OK' : 'Pendente'}</span>
    </div>
  )
}

export default function DocumentosPage() {
  const [agendamentos, setAgendamentos] = useState<{ value: string; label: string }[]>([])
  const [agendamentoId, setAgendamentoId] = useState('')
  const [documentos, setDocumentos] = useState<DocumentoResponse[]>([])
  const [checklist, setChecklist] = useState<ChecklistDocumentalResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [busca, setBusca] = useState('')

  const [uploadModal, setUploadModal] = useState(false)
  const [checklistModal, setChecklistModal] = useState(false)
  const [validarModal, setValidarModal] = useState<DocumentoResponse | null>(null)
  const [observacaoValidacao, setObservacaoValidacao] = useState('')
  const [validando, setValidando] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null)

  useEffect(() => {
    agendamentoService.listar({ page: 0, size: 200 }).then(res => {
      const items = (res.data.data as any)?.content ?? []
      setAgendamentos([
        { value: '', label: 'Selecione um agendamento' },
        ...items.map((a: AgendamentoResponse) => ({
          value: a.id,
          label: `${a.codigo} — ${a.dataOperacao.split('-').reverse().join('/')} ${a.horarioInicio}`,
        })),
      ])
    }).catch(() => {})
  }, [])

  const loadDocumentos = useCallback(async () => {
    if (!agendamentoId) {
      setDocumentos([])
      setChecklist(null)
      return
    }
    setLoading(true)
    try {
      const [docsRes, checkRes] = await Promise.all([
        documentoService.listar(agendamentoId),
        documentoService.checklist(agendamentoId),
      ])
      setDocumentos(docsRes.data.data ?? [])
      setChecklist(checkRes.data.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [agendamentoId])

  useEffect(() => { loadDocumentos() }, [loadDocumentos])

  const handleUpload = async (arquivo: File, tipo: string) => {
    await documentoService.upload(agendamentoId, arquivo, tipo)
    await loadDocumentos()
    setUploadModal(false)
  }

  const handleValidar = async (status: StatusValidacaoDocumento) => {
    if (!validarModal) return
    setValidando(true)
    try {
      await documentoService.validar(agendamentoId, validarModal.id, status, observacaoValidacao || undefined)
      await loadDocumentos()
      setValidarModal(null)
      setObservacaoValidacao('')
    } finally {
      setValidando(false)
    }
  }

  const handleDownload = async (doc: DocumentoResponse) => {
    setDownloadLoading(doc.id)
    try {
      const res = await documentoService.gerarUrlDownload(agendamentoId, doc.id)
      window.open(res.data.data.url, '_blank')
    } finally {
      setDownloadLoading(null)
    }
  }

  const handleExcluir = async (doc: DocumentoResponse) => {
    if (!confirm(`Remover o documento "${doc.nomeArquivo ?? doc.tipoDocumento}"?`)) return
    await documentoService.excluir(agendamentoId, doc.id)
    await loadDocumentos()
  }

  const tipoLabel = (tipo: string) =>
    TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label ?? tipo

  const documentosFiltrados = documentos.filter(d => {
    if (tipoFiltro && d.tipoDocumento !== tipoFiltro) return false
    if (statusFiltro && d.statusValidacao !== statusFiltro) return false
    if (busca) {
      const q = busca.toLowerCase()
      const nome = (d.nomeArquivo ?? '').toLowerCase()
      const num = (d.numero ?? '').toLowerCase()
      const chave = (d.chaveAcesso ?? '').toLowerCase()
      if (!nome.includes(q) && !num.includes(q) && !chave.includes(q)) return false
    }
    return true
  })

  const columns = [
    {
      key: 'tipo', label: 'Tipo / Arquivo', render: (d: DocumentoResponse) => (
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-gray-900">{tipoLabel(d.tipoDocumento)}</div>
            {d.nomeArquivo && <div className="text-xs text-gray-500 font-mono truncate max-w-[180px]">{d.nomeArquivo}</div>}
            {d.tamanhoArquivo && <div className="text-xs text-gray-400">{formatBytes(d.tamanhoArquivo)}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'nfe', label: 'Dados NF-e / CT-e', render: (d: DocumentoResponse) => (
        <div className="text-xs space-y-0.5">
          {d.numero && <div><span className="text-gray-500">Nº:</span> <span className="font-mono">{d.numero}{d.serie ? `-${d.serie}` : ''}</span></div>}
          {d.emitente && <div className="text-gray-600 truncate max-w-[160px]">{d.emitente}</div>}
          {d.valorTotal && <div><span className="text-gray-500">Valor:</span> R$ {d.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>}
          {!d.numero && !d.emitente && <span className="text-gray-400">–</span>}
        </div>
      ),
    },
    {
      key: 'chave', label: 'Chave de Acesso', render: (d: DocumentoResponse) => (
        d.chaveAcesso
          ? <div className="font-mono text-xs text-gray-600 truncate max-w-[160px]" title={d.chaveAcesso}>{d.chaveAcesso}</div>
          : <span className="text-gray-400 text-xs">–</span>
      ),
    },
    {
      key: 'status', label: 'Validação', render: (d: DocumentoResponse) => (
        <div>
          <Badge variant={VALIDACAO_COLORS[d.statusValidacao]}>{VALIDACAO_LABELS[d.statusValidacao]}</Badge>
          {d.observacaoValidacao && (
            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[120px]">{d.observacaoValidacao}</div>
          )}
        </div>
      ),
    },
    {
      key: 'data', label: 'Enviado em', render: (d: DocumentoResponse) => (
        <div className="text-xs text-gray-500">
          {new Date(d.createdAt).toLocaleDateString('pt-BR')}
          <br />
          {new Date(d.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      ),
    },
    {
      key: 'acoes', label: 'Ações', render: (d: DocumentoResponse) => (
        <div className="flex gap-1 flex-wrap">
          {d.temArquivo && (
            <button
              onClick={() => handleDownload(d)}
              disabled={downloadLoading === d.id}
              className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-50"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          {d.statusValidacao === 'PENDENTE' && (
            <button
              onClick={() => { setValidarModal(d); setObservacaoValidacao('') }}
              className="text-green-600 hover:text-green-800 p-1"
              title="Validar"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleExcluir(d)}
            className="text-red-500 hover:text-red-700 p-1"
            title="Remover"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos Fiscais</h1>
          <p className="text-sm text-gray-500">Gerencie documentos por agendamento</p>
        </div>
        <div className="flex gap-2">
          {agendamentoId && checklist && (
            <Button variant="secondary" onClick={() => setChecklistModal(true)}>
              <ClipboardList className="h-4 w-4 mr-2" /> Checklist
            </Button>
          )}
          {agendamentoId && (
            <Button onClick={() => setUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" /> Enviar Documento
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <Select
              label="Agendamento"
              value={agendamentoId}
              onValueChange={v => { setAgendamentoId(v) }}
              options={agendamentos}
            />
          </div>
          <Select label="Tipo de Documento" value={tipoFiltro} onValueChange={setTipoFiltro} options={TIPO_OPTIONS} />
          <Select label="Status Validação" value={statusFiltro} onValueChange={setStatusFiltro} options={VALIDACAO_OPTIONS} />
          <div className="sm:col-span-2">
            <Input
              label="Buscar (arquivo, nº NF-e, chave)"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </div>
      </div>

      {/* Checklist summary strip */}
      {checklist && (
        <div className={`card border-l-4 ${checklist.status === 'APROVADO' ? 'border-l-green-500' : 'border-l-yellow-400'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Checklist Documental</p>
              <Badge variant={checklist.status === 'APROVADO' ? 'success' : 'pending'} className="mt-1">
                {checklist.status === 'APROVADO' ? 'Documentação Completa' : 'Pendências'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 flex-1">
              <ChecklistItem label="NF-e" ok={checklist.nfeOk} exigido={checklist.nfeExigida} />
              <ChecklistItem label="XML" ok={checklist.xmlOk} exigido={checklist.xmlExigido} />
              <ChecklistItem label="Lacre" ok={checklist.lacreOk} exigido={checklist.lacreExigido} />
              <ChecklistItem label="Foto Carga" ok={checklist.fotoCargaOk} exigido={checklist.fotoCargaExigida} />
              <ChecklistItem label="EPI" ok={checklist.epiOk} exigido={checklist.epiExigido} />
            </div>
          </div>
        </div>
      )}

      {!agendamentoId ? (
        <div className="card text-center py-16 text-gray-500">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium">Selecione um agendamento para ver os documentos</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={documentosFiltrados}
          loading={loading}
          emptyMessage="Nenhum documento encontrado para este agendamento"
        />
      )}

      {/* Upload Modal */}
      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Enviar Documento" size="md">
        <DocumentoUpload
          agendamentoId={agendamentoId}
          onUpload={handleUpload}
          onClose={() => setUploadModal(false)}
        />
      </Modal>

      {/* Checklist Modal */}
      <Modal isOpen={checklistModal} onClose={() => setChecklistModal(false)} title="Checklist Documental" size="sm">
        {checklist && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={checklist.status === 'APROVADO' ? 'success' : 'pending'} className="text-sm px-3 py-1">
                {checklist.status === 'APROVADO' ? 'Documentação Completa' : 'Com Pendências'}
              </Badge>
              <span className="text-xs text-gray-500">Agendamento: {checklist.agendamentoCodigo}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'NF-e (Nota Fiscal Eletrônica)', ok: checklist.nfeOk, exigido: checklist.nfeExigida },
                { label: 'XML do Documento Fiscal', ok: checklist.xmlOk, exigido: checklist.xmlExigido },
                { label: 'Lacre de Veículo', ok: checklist.lacreOk, exigido: checklist.lacreExigido },
                { label: 'Foto da Carga', ok: checklist.fotoCargaOk, exigido: checklist.fotoCargaExigida },
                { label: 'Comprovante de EPI', ok: checklist.epiOk, exigido: checklist.epiExigido },
              ].map(item => (
                <div key={item.label} className="py-2.5">
                  <ChecklistItem {...item} />
                </div>
              ))}
            </div>
            {checklist.observacao && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                {checklist.observacao}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Validar/Rejeitar Modal */}
      <Modal
        isOpen={!!validarModal}
        onClose={() => { setValidarModal(null); setObservacaoValidacao('') }}
        title="Validar Documento"
        size="sm"
      >
        {validarModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800">{tipoLabel(validarModal.tipoDocumento)}</p>
              {validarModal.nomeArquivo && (
                <p className="text-xs text-blue-600 mt-0.5 font-mono">{validarModal.nomeArquivo}</p>
              )}
              {validarModal.numero && (
                <p className="text-xs text-blue-600 mt-0.5">NF-e nº {validarModal.numero}</p>
              )}
            </div>

            <Input
              label="Observação (opcional)"
              value={observacaoValidacao}
              onChange={e => setObservacaoValidacao(e.target.value)}
              placeholder="Motivo da aprovação ou rejeição..."
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => { setValidarModal(null); setObservacaoValidacao('') }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleValidar('REJEITADO')}
                loading={validando}
              >
                <XCircle className="h-4 w-4 mr-1.5" /> Rejeitar
              </Button>
              <Button
                onClick={() => handleValidar('APROVADO')}
                loading={validando}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" /> Aprovar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
