'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge, StatusAtivo } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Stepper } from '@/components/ui/Stepper'
import { janelaService, JanelaResponse, JanelaRequest } from '@/services/janela.service'
import { filialService } from '@/services/filial.service'
import { TipoProcesso } from '@/types'

const STEPS = [
  { label: 'Identificação', description: 'Nome e tipo' },
  { label: 'Horários', description: 'Períodos e capacidade' },
  { label: 'Configurações', description: 'SLAs e restrições' },
  { label: 'Documentos', description: 'Obrigatoriedades' },
  { label: 'Aprovação', description: 'Aceite e aprovação' },
  { label: 'Revisão', description: 'Confirmar dados' },
]

const TIPO_PROCESSO_LABELS: Record<TipoProcesso, string> = {
  RECEBIMENTO: 'Recebimento',
  EXPEDICAO: 'Expedição',
  CROSS_DOCKING: 'Cross Docking',
  DEVOLUCAO: 'Devolução',
  TRANSFERENCIA: 'Transferência',
  ESPECIAL: 'Especial',
}

const EMPTY_REQUEST: JanelaRequest = {
  nome: '', tipoProcesso: 'RECEBIMENTO', filialId: '', duracaoAtendimento: 60,
  horarioInicio: '08:00', horarioFim: '18:00', capacidadeSimultanea: 1,
  prioridade: 0, bufferEntreOperacoes: 0, tempoReagendamento: 24,
  tempoCancelamento: 4, tempoEdicaoTerceiros: 48,
  obrigatorioEpi: false, obrigatorioNfe: true, obrigatorioXml: false,
  obrigatorioLacre: false, obrigatorioFotoCarga: false,
  aceiteObrigatorio: false, aprovacaoAutomatica: false, ativo: true, restritores: [],
}

export default function JanelasPage() {
  const [data, setData] = useState<{ content: JanelaResponse[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filialId, setFilialId] = useState('')
  const [filiais, setFiliais] = useState<{ value: string; label: string }[]>([])
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<JanelaRequest>(EMPTY_REQUEST)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    filialService.listar(undefined, 0, 100).then(res => {
      setFiliais(res.content.map(f => ({ value: f.id, label: f.nome })))
    })
  }, [])

  const load = useCallback(async () => {
    if (!filialId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await janelaService.listar(filialId, busca || undefined, page)
      setData(res.data.data as any)
    } finally {
      setLoading(false)
    }
  }, [filialId, busca, page])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY_REQUEST); setEditId(null); setStep(0); setShowModal(true) }
  const openEdit = (j: JanelaResponse) => {
    setForm({
      nome: j.nome, tipoProcesso: j.tipoProcesso, descricao: j.descricao ?? undefined,
      prioridade: j.prioridade, filialId: j.filialId, docaId: j.docaId ?? undefined,
      areaOperacional: j.areaOperacional ?? undefined, capacidadeSimultanea: j.capacidadeSimultanea,
      duracaoAtendimento: j.duracaoAtendimento, horarioInicio: j.horarioInicio, horarioFim: j.horarioFim,
      slaAtraso: j.slaAtraso ?? undefined, tempoReagendamento: j.tempoReagendamento,
      tempoCancelamento: j.tempoCancelamento, tempoEdicaoTerceiros: j.tempoEdicaoTerceiros,
      bufferEntreOperacoes: j.bufferEntreOperacoes, obrigatorioEpi: j.obrigatorioEpi,
      obrigatorioNfe: j.obrigatorioNfe, obrigatorioXml: j.obrigatorioXml,
      obrigatorioLacre: j.obrigatorioLacre, obrigatorioFotoCarga: j.obrigatorioFotoCarga,
      aceiteObrigatorio: j.aceiteObrigatorio, quemAprova: j.quemAprova ?? undefined,
      slaAprovacao: j.slaAprovacao ?? undefined, aprovacaoAutomatica: j.aprovacaoAutomatica,
      ativo: j.ativo, restritores: j.restritores.map(r => ({ tipo: r.tipo, valor: r.valor })),
    })
    setEditId(j.id); setStep(0); setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editId) await janelaService.atualizar(editId, form)
      else await janelaService.criar(form)
      setShowModal(false); load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    await janelaService.excluir(deleteId)
    setDeleteId(null); load()
  }

  const set = (k: keyof JanelaRequest, v: any) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'nome', label: 'Nome', render: (j: JanelaResponse) => (
      <div>
        <div className="font-medium text-gray-900">{j.nome}</div>
        <div className="text-xs text-gray-500">{j.areaOperacional}</div>
      </div>
    )},
    { key: 'tipo', label: 'Tipo', render: (j: JanelaResponse) => (
      <Badge variant="info">{TIPO_PROCESSO_LABELS[j.tipoProcesso]}</Badge>
    )},
    { key: 'horario', label: 'Horário', render: (j: JanelaResponse) => (
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Clock className="h-3 w-3" />
        {j.horarioInicio} – {j.horarioFim}
      </div>
    )},
    { key: 'capacidade', label: 'Capacidade', render: (j: JanelaResponse) => (
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <Users className="h-3 w-3" />
        {j.capacidadeSimultanea} simultâneo(s)
      </div>
    )},
    { key: 'duracao', label: 'Duração', render: (j: JanelaResponse) => `${j.duracaoAtendimento} min` },
    { key: 'ativo', label: 'Status', render: (j: JanelaResponse) => <StatusAtivo ativo={j.ativo} /> },
    { key: 'acoes', label: 'Ações', render: (j: JanelaResponse) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(j)} className="text-blue-600 hover:text-blue-800">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => setDeleteId(j.id)} className="text-red-600 hover:text-red-800">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Janelas de Agendamento</h1>
          <p className="text-sm text-gray-500">Configure os períodos e regras de atendimento</p>
        </div>
        <Button onClick={openCreate} disabled={!filialId}>
          <Plus className="h-4 w-4 mr-2" /> Nova Janela
        </Button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Filial *"
            options={filiais}
            value={filialId}
            onValueChange={v => { setFilialId(v); setPage(0) }}
            placeholder="Selecione a filial..."
          />
          <Input
            label="Buscar"
            placeholder="Nome da janela..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(0) }}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
      </div>

      {!filialId ? (
        <div className="card text-center py-12 text-gray-500">
          Selecione uma filial para visualizar as janelas
        </div>
      ) : (
        <>
          <Table columns={columns} data={data?.content ?? []} loading={loading} emptyMessage="Nenhuma janela encontrada" />
          {data && data.totalPages > 1 && (
            <Pagination page={data.number} totalPages={data.totalPages}
              totalElements={data.totalElements} pageSize={data.size} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Editar Janela' : 'Nova Janela'}
        size="xl"
      >
        <div className="space-y-6">
          <Stepper steps={STEPS} currentStep={step} />

          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nome *" value={form.nome} onChange={e => set('nome', e.target.value)} required />
              <Select label="Tipo de Processo *" value={form.tipoProcesso}
                onValueChange={v => set('tipoProcesso', v as TipoProcesso)}
                options={Object.entries(TIPO_PROCESSO_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
              <Select label="Filial *" value={form.filialId} onValueChange={(v) => set('filialId', v)} options={filiais} />
              <Input label="Área Operacional" value={form.areaOperacional ?? ''} onChange={e => set('areaOperacional', e.target.value)} />
              <Input label="Descrição" value={form.descricao ?? ''} onChange={e => set('descricao', e.target.value)} />
              <Input label="Prioridade" type="number" value={form.prioridade ?? 0} onChange={e => set('prioridade', +e.target.value)} />
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Horário Início *" type="time" value={form.horarioInicio} onChange={e => set('horarioInicio', e.target.value)} />
              <Input label="Horário Fim *" type="time" value={form.horarioFim} onChange={e => set('horarioFim', e.target.value)} />
              <Input label="Duração por Atendimento (min) *" type="number" value={form.duracaoAtendimento} onChange={e => set('duracaoAtendimento', +e.target.value)} />
              <Input label="Buffer entre Operações (min)" type="number" value={form.bufferEntreOperacoes ?? 0} onChange={e => set('bufferEntreOperacoes', +e.target.value)} />
              <Input label="Capacidade Simultânea" type="number" value={form.capacidadeSimultanea ?? 1} onChange={e => set('capacidadeSimultanea', +e.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="SLA de Atraso (horas)" type="number" value={form.slaAtraso ?? ''} onChange={e => set('slaAtraso', e.target.value ? +e.target.value : undefined)} />
              <Input label="Tempo Reagendamento (horas)" type="number" value={form.tempoReagendamento ?? 24} onChange={e => set('tempoReagendamento', +e.target.value)} />
              <Input label="Tempo Cancelamento (horas)" type="number" value={form.tempoCancelamento ?? 4} onChange={e => set('tempoCancelamento', +e.target.value)} />
              <Input label="Tempo Edição Terceiros (horas)" type="number" value={form.tempoEdicaoTerceiros ?? 48} onChange={e => set('tempoEdicaoTerceiros', +e.target.value)} />
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              {([
                ['obrigatorioEpi', 'EPI Obrigatório'],
                ['obrigatorioNfe', 'NF-e Obrigatória'],
                ['obrigatorioXml', 'XML Obrigatório'],
                ['obrigatorioLacre', 'Lacre Obrigatório'],
                ['obrigatorioFotoCarga', 'Foto da Carga Obrigatória'],
              ] as [keyof JanelaRequest, string][]).map(([k, label]) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="col-span-2 flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={form.aceiteObrigatorio} onChange={e => set('aceiteObrigatorio', e.target.checked)} />
                <span className="text-sm text-gray-700">Aceite do agendamento obrigatório</span>
              </label>
              <label className="col-span-2 flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  checked={form.aprovacaoAutomatica} onChange={e => set('aprovacaoAutomatica', e.target.checked)} />
                <span className="text-sm text-gray-700">Aprovação automática</span>
              </label>
              <Input label="Quem Aprova" value={form.quemAprova ?? ''} onChange={e => set('quemAprova', e.target.value)} />
              <Input label="SLA de Aprovação (horas)" type="number" value={form.slaAprovacao ?? ''} onChange={e => set('slaAprovacao', e.target.value ? +e.target.value : undefined)} />
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Revisão dos dados</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Nome:</span> <span className="font-medium">{form.nome}</span></div>
                <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">{TIPO_PROCESSO_LABELS[form.tipoProcesso]}</span></div>
                <div><span className="text-gray-500">Horário:</span> <span className="font-medium">{form.horarioInicio} – {form.horarioFim}</span></div>
                <div><span className="text-gray-500">Duração:</span> <span className="font-medium">{form.duracaoAtendimento} min</span></div>
                <div><span className="text-gray-500">Capacidade:</span> <span className="font-medium">{form.capacidadeSimultanea} simultâneo(s)</span></div>
                <div><span className="text-gray-500">Buffer:</span> <span className="font-medium">{form.bufferEntreOperacoes ?? 0} min</span></div>
              </div>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-4 w-4" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
                <span className="text-sm text-gray-700">Janela ativa</span>
              </label>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="secondary" onClick={() => step > 0 ? setStep(s => s - 1) : setShowModal(false)}>
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)}>Próximo</Button>
            ) : (
              <Button onClick={save} isLoading={saving}>
                {editId ? 'Salvar Alterações' : 'Criar Janela'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-gray-600 mb-6">Deseja excluir esta janela? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
