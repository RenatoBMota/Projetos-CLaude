'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Badge, StatusAtivo } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { filialService, FilialResponse, FilialRequest } from '@/services/filial.service'

const EMPTY: FilialRequest = {
  codigo: '', nome: '', razaoSocial: '', cnpj: '', cidade: '', uf: '', ativo: true,
}

export default function FiliaisPage() {
  const [data, setData] = useState<{ content: FilialResponse[]; totalElements: number; totalPages: number; number: number; size: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<FilialResponse | null>(null)
  const [form, setForm] = useState<FilialRequest>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<FilialResponse | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const result = await filialService.listar(busca || undefined, page)
      setData(result)
    } finally {
      setLoading(false)
    }
  }, [busca, page])

  useEffect(() => { carregar() }, [carregar])

  const abrirNovo = () => { setEditando(null); setForm(EMPTY); setModalOpen(true) }

  const abrirEditar = (f: FilialResponse) => {
    setEditando(f)
    setForm({ codigo: f.codigo, nome: f.nome, razaoSocial: f.razaoSocial, cnpj: f.cnpj,
      inscricaoEstadual: f.inscricaoEstadual, endereco: f.endereco, numero: f.numero,
      cidade: f.cidade, uf: f.uf, cep: f.cep, telefone: f.telefone, email: f.email,
      limiteDiario: f.limiteDiario, tempoMedioAtendimento: f.tempoMedioAtendimento, ativo: f.ativo })
    setModalOpen(true)
  }

  const salvar = async () => {
    setSaving(true)
    try {
      if (editando) {
        await filialService.atualizar(editando.id, form)
      } else {
        await filialService.criar(form)
      }
      setModalOpen(false)
      carregar()
    } finally {
      setSaving(false)
    }
  }

  const excluir = async () => {
    if (!confirmDelete) return
    await filialService.excluir(confirmDelete.id)
    setConfirmDelete(null)
    carregar()
  }

  const f = (field: keyof FilialRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const columns = [
    { key: 'codigo', header: 'Código', className: 'w-24' },
    { key: 'nome', header: 'Nome' },
    { key: 'cnpj', header: 'CNPJ', className: 'w-40' },
    { key: 'cidade', header: 'Cidade', render: (r: FilialResponse) => `${r.cidade} / ${r.uf}` },
    { key: 'ativo', header: 'Status', className: 'w-24', render: (r: FilialResponse) => <StatusAtivo ativo={r.ativo} /> },
    {
      key: 'acoes', header: '', className: 'w-24',
      render: (r: FilialResponse) => (
        <div className="flex items-center gap-1">
          <button onClick={() => abrirEditar(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filiais</h1>
          <p className="text-sm text-gray-500 mt-0.5">Unidades operacionais da RBM LOGISTICS</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="w-4 h-4" />Nova Filial</Button>
      </div>

      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Buscar por nome ou CNPJ..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(0) }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="card">
        <Table columns={columns} data={data?.content ?? []} loading={loading} keyExtractor={r => r.id} />
        {data && (
          <Pagination page={data.number} totalPages={data.totalPages}
            totalElements={data.totalElements} size={data.size} onPageChange={setPage} />
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editando ? 'Editar Filial' : 'Nova Filial'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Código" value={form.codigo} onChange={f('codigo')} required />
          <Input label="Nome" value={form.nome} onChange={f('nome')} required />
          <Input label="Razão Social" value={form.razaoSocial} onChange={f('razaoSocial')} required className="col-span-2" />
          <Input label="CNPJ" value={form.cnpj} onChange={f('cnpj')} required placeholder="00.000.000/0000-00" />
          <Input label="Inscrição Estadual" value={form.inscricaoEstadual ?? ''} onChange={f('inscricaoEstadual')} />
          <Input label="Endereço" value={form.endereco ?? ''} onChange={f('endereco')} className="col-span-2" />
          <Input label="Número" value={form.numero ?? ''} onChange={f('numero')} />
          <Input label="CEP" value={form.cep ?? ''} onChange={f('cep')} placeholder="00000-000" />
          <Input label="Cidade" value={form.cidade} onChange={f('cidade')} required />
          <Input label="UF" value={form.uf} onChange={f('uf')} required maxLength={2} placeholder="SP" />
          <Input label="Telefone" value={form.telefone ?? ''} onChange={f('telefone')} />
          <Input label="E-mail" value={form.email ?? ''} onChange={f('email')} type="email" />
          <Input label="Limite diário (agendamentos)" value={form.limiteDiario ?? ''} onChange={f('limiteDiario')} type="number" />
          <Input label="Tempo médio atendimento (min)" value={form.tempoMedioAtendimento ?? ''} onChange={f('tempoMedioAtendimento')} type="number" />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} loading={saving}>Salvar</Button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar exclusão" size="sm">
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir a filial <strong>{confirmDelete?.nome}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={excluir}>Excluir</Button>
        </div>
      </Modal>
    </div>
  )
}
