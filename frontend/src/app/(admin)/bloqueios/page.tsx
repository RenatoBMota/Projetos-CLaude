'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge, StatusAtivo } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { bloqueioService, BloqueioResponse, BloqueioRequest } from '@/services/bloqueio.service'
import { filialService } from '@/services/filial.service'
import { janelaService, JanelaResponse } from '@/services/janela.service'
import { TipoBloqueio } from '@/types'

const TIPO_LABELS: Record<TipoBloqueio, string> = {
  MANUTENCAO: 'Manutenção', FERIADO: 'Feriado', INVENTARIO: 'Inventário',
  FALTA_ENERGIA: 'Falta de Energia', OPERACAO_ESPECIAL: 'Operação Especial',
  SATURACAO: 'Saturação', AUDITORIA: 'Auditoria', EMERGENCIA: 'Emergência',
}

const EMPTY: BloqueioRequest = {
  tipo: 'MANUTENCAO', filialId: '', dataInicio: '', dataFim: '', motivo: '', ativo: true,
}

export default function BloqueiosPage() {
  const [data, setData] = useState<{ content: BloqueioResponse[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filialId, setFilialId] = useState('')
  const [filiais, setFiliais] = useState<{ value: string; label: string }[]>([])
  const [janelas, setJanelas] = useState<JanelaResponse[]>([])
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<BloqueioRequest>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    filialService.listar(undefined, 0, 100).then(res => {
      setFiliais(res.content.map(f => ({ value: f.id, label: f.nome })))
    })
  }, [])

  useEffect(() => {
    if (form.filialId) {
      janelaService.listarAtivas(form.filialId).then(res => setJanelas(res.data.data))
    } else {
      setJanelas([])
    }
  }, [form.filialId])

  const load = useCallback(async () => {
    if (!filialId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await bloqueioService.listar(filialId, busca || undefined, page)
      setData(res.data.data as any)
    } finally {
      setLoading(false)
    }
  }, [filialId, busca, page])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm({ ...EMPTY, filialId }); setEditId(null); setShowModal(true) }
  const openEdit = (b: BloqueioResponse) => {
    setForm({
      tipo: b.tipo, filialId: b.filialId, docaId: b.docaId ?? undefined,
      janelaId: b.janelaId ?? undefined, dataInicio: b.dataInicio, dataFim: b.dataFim,
      horarioInicio: b.horarioInicio ?? undefined, horarioFim: b.horarioFim ?? undefined,
      motivo: b.motivo, observacao: b.observacao ?? undefined, ativo: b.ativo,
    })
    setEditId(b.id); setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editId) await bloqueioService.atualizar(editId, form)
      else await bloqueioService.criar(form)
      setShowModal(false); load()
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    await bloqueioService.excluir(deleteId)
    setDeleteId(null); load()
  }

  const set = (k: keyof BloqueioRequest, v: any) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'tipo', label: 'Tipo', render: (b: BloqueioResponse) => (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">{TIPO_LABELS[b.tipo]}</span>
      </div>
    )},
    { key: 'periodo', label: 'Período', render: (b: BloqueioResponse) => (
      <div className="text-sm">
        <div>{b.dataInicio.split('-').reverse().join('/')} a {b.dataFim.split('-').reverse().join('/')}</div>
        {b.horarioInicio && <div className="text-xs text-gray-500">{b.horarioInicio} – {b.horarioFim}</div>}
      </div>
    )},
    { key: 'escopo', label: 'Escopo', render: (b: BloqueioResponse) => (
      <div className="text-sm">
        <div className="font-medium">{b.filialNome}</div>
        {b.janelaNome && <div className="text-xs text-gray-500">{b.janelaNome}</div>}
        {b.docaCodigo && <div className="text-xs text-gray-500">Doca: {b.docaCodigo}</div>}
      </div>
    )},
    { key: 'motivo', label: 'Motivo', render: (b: BloqueioResponse) => (
      <span className="text-sm text-gray-700">{b.motivo}</span>
    )},
    { key: 'ativo', label: 'Status', render: (b: BloqueioResponse) => <StatusAtivo ativo={b.ativo} /> },
    { key: 'acoes', label: 'Ações', render: (b: BloqueioResponse) => (
      <div className="flex gap-2">
        <button onClick={() => openEdit(b)} className="text-blue-600 hover:text-blue-800">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => setDeleteId(b.id)} className="text-red-600 hover:text-red-800">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bloqueios</h1>
          <p className="text-sm text-gray-500">Gerencie bloqueios de janelas e docas</p>
        </div>
        <Button onClick={openCreate} disabled={!filialId}>
          <Plus className="h-4 w-4 mr-2" /> Novo Bloqueio
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
            placeholder="Motivo do bloqueio..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(0) }}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
      </div>

      {!filialId ? (
        <div className="card text-center py-12 text-gray-500">
          Selecione uma filial para visualizar os bloqueios
        </div>
      ) : (
        <>
          <Table columns={columns} data={data?.content ?? []} loading={loading} emptyMessage="Nenhum bloqueio encontrado" />
          {data && data.totalPages > 1 && (
            <Pagination page={data.number} totalPages={data.totalPages}
              totalElements={data.totalElements} pageSize={data.size} onPageChange={setPage} />
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editId ? 'Editar Bloqueio' : 'Novo Bloqueio'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Tipo *" value={form.tipo} onValueChange={(v) => set('tipo', v as TipoBloqueio)}
            options={Object.entries(TIPO_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          <Select label="Filial *" value={form.filialId} onValueChange={(v) => set('filialId', v)} options={filiais} />
          <Select label="Janela (opcional)" value={form.janelaId ?? ''}
            onValueChange={v => set('janelaId', v || undefined)}
            options={[{ value: '', label: 'Todas as janelas' }, ...janelas.map(j => ({ value: j.id, label: j.nome }))]} />
          <Input label="Motivo *" value={form.motivo} onChange={e => set('motivo', e.target.value)} />
          <Input label="Data Início *" type="date" value={form.dataInicio} onChange={e => set('dataInicio', e.target.value)} />
          <Input label="Data Fim *" type="date" value={form.dataFim} onChange={e => set('dataFim', e.target.value)} />
          <Input label="Horário Início (opcional)" type="time" value={form.horarioInicio ?? ''} onChange={e => set('horarioInicio', e.target.value || undefined)} />
          <Input label="Horário Fim (opcional)" type="time" value={form.horarioFim ?? ''} onChange={e => set('horarioFim', e.target.value || undefined)} />
          <div className="sm:col-span-2">
            <Input label="Observação" value={form.observacao ?? ''} onChange={e => set('observacao', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              <span className="text-sm text-gray-700">Bloqueio ativo</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={save} isLoading={saving}>{editId ? 'Salvar' : 'Criar Bloqueio'}</Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-gray-600 mb-6">Deseja excluir este bloqueio?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDelete}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
