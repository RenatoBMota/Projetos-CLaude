'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Stepper } from '@/components/ui/Stepper'
import { CalendarioDisponibilidade } from '@/components/ui/CalendarioDisponibilidade'
import { agendamentoService, AgendamentoRequest } from '@/services/agendamento.service'
import { janelaService, JanelaResponse } from '@/services/janela.service'
import { filialService } from '@/services/filial.service'
import { SlotResponse } from '@/services/disponibilidade.service'
import { TipoOperacao } from '@/types'

const STEPS = [
  { label: 'Dados Básicos', description: 'Filial, janela e tipo' },
  { label: 'Data e Horário', description: 'Selecione o slot' },
  { label: 'Participantes', description: 'Motorista e veículo' },
  { label: 'Revisão', description: 'Confirmar e criar' },
]

const TIPO_OP_OPTIONS: { value: TipoOperacao; label: string }[] = [
  { value: 'RECEBIMENTO', label: 'Recebimento' },
  { value: 'EXPEDICAO', label: 'Expedição' },
  { value: 'CROSS_DOCKING', label: 'Cross Docking' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'ESPECIAL', label: 'Especial' },
]

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [filiais, setFiliais] = useState<{ value: string; label: string }[]>([])
  const [janelas, setJanelas] = useState<JanelaResponse[]>([])

  const [form, setForm] = useState<AgendamentoRequest>({
    tipoOperacao: 'RECEBIMENTO',
    filialId: '',
    janelaId: '',
    dataOperacao: '',
    horarioInicio: '',
  })
  const [selectedSlot, setSelectedSlot] = useState<SlotResponse | null>(null)

  useEffect(() => {
    filialService.listar(undefined, 0, 100).then(res => {
      setFiliais(res.content.map(f => ({ value: f.id, label: f.nome })))
    })
  }, [])

  useEffect(() => {
    if (form.filialId) {
      janelaService.listarAtivas(form.filialId).then(res => {
        setJanelas(res.data.data)
        setForm(f => ({ ...f, janelaId: '' }))
      })
    }
  }, [form.filialId])

  const set = (k: keyof AgendamentoRequest, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSlotSelect = (data: string, slot: SlotResponse) => {
    setSelectedSlot(slot)
    setForm(f => ({ ...f, dataOperacao: data, horarioInicio: slot.horarioInicio }))
  }

  const canNextStep0 = form.filialId && form.janelaId && form.tipoOperacao
  const canNextStep1 = form.dataOperacao && form.horarioInicio && selectedSlot

  const handleSave = async () => {
    setSaving(true)
    try {
      await agendamentoService.criar(form)
      router.push('/agendamentos')
    } catch (err: any) {
      alert(err?.response?.data?.error?.message ?? 'Erro ao criar agendamento')
    } finally {
      setSaving(false)
    }
  }

  const selectedJanela = janelas.find(j => j.id === form.janelaId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/agendamentos')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Agendamento</h1>
          <p className="text-sm text-gray-500">Preencha os dados para criar um novo agendamento</p>
        </div>
      </div>

      <div className="card">
        <Stepper steps={STEPS} currentStep={step} />
      </div>

      <div className="card">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Dados Básicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Filial *" value={form.filialId} onValueChange={(v) => set('filialId', v)}
                options={filiais} placeholder="Selecione a filial..." />
              <Select label="Janela *" value={form.janelaId}
                onValueChange={v => set('janelaId', v)}
                options={janelas.map(j => ({ value: j.id, label: j.nome }))}
                placeholder="Selecione a janela..." />
              <Select label="Tipo de Operação *" value={form.tipoOperacao}
                onValueChange={v => set('tipoOperacao', v as TipoOperacao)}
                options={TIPO_OP_OPTIONS} />
              <Input label="Peso Bruto (kg)" type="number" value={form.pesoBruto ?? ''}
                onChange={e => set('pesoBruto', e.target.value ? +e.target.value : undefined)} />
              <Input label="Peso Líquido (kg)" type="number" value={form.pesoLiquido ?? ''}
                onChange={e => set('pesoLiquido', e.target.value ? +e.target.value : undefined)} />
              <Input label="Volumes" type="number" value={form.volumes ?? ''}
                onChange={e => set('volumes', e.target.value ? +e.target.value : undefined)} />
              <div className="sm:col-span-2">
                <Input label="Observações" value={form.observacoes ?? ''}
                  onChange={e => set('observacoes', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Selecione Data e Horário</h2>
            {form.janelaId ? (
              <CalendarioDisponibilidade
                janelaId={form.janelaId}
                onSlotSelect={handleSlotSelect}
                selectedData={form.dataOperacao || undefined}
                selectedHorario={form.horarioInicio || undefined}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Selecione uma janela na etapa anterior
              </div>
            )}
            {selectedSlot && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="font-medium text-blue-700">Slot selecionado: </span>
                <span className="text-blue-600">
                  {form.dataOperacao?.split('-').reverse().join('/')} às {selectedSlot.horarioInicio}
                  {' '} ({selectedSlot.disponivel} vaga{selectedSlot.disponivel !== 1 ? 's' : ''} disponíve{selectedSlot.disponivel !== 1 ? 'is' : 'l'})
                </span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Participantes (Opcional)</h2>
            <p className="text-sm text-gray-500">Estes dados podem ser adicionados posteriormente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="ID da Transportadora" value={form.transportadoraId ?? ''}
                onChange={e => set('transportadoraId', e.target.value || undefined)}
                placeholder="UUID da transportadora" />
              <Input label="ID do Fornecedor" value={form.fornecedorId ?? ''}
                onChange={e => set('fornecedorId', e.target.value || undefined)}
                placeholder="UUID do fornecedor" />
              <Input label="ID do Motorista" value={form.motoristaId ?? ''}
                onChange={e => set('motoristaId', e.target.value || undefined)}
                placeholder="UUID do motorista" />
              <Input label="ID do Veículo" value={form.veiculoId ?? ''}
                onChange={e => set('veiculoId', e.target.value || undefined)}
                placeholder="UUID do veículo" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Revisão do Agendamento</h2>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Filial:</span> <span className="font-medium">{filiais.find(f => f.value === form.filialId)?.label}</span></div>
              <div><span className="text-gray-500">Janela:</span> <span className="font-medium">{selectedJanela?.nome}</span></div>
              <div><span className="text-gray-500">Operação:</span> <span className="font-medium">{TIPO_OP_OPTIONS.find(t => t.value === form.tipoOperacao)?.label}</span></div>
              <div><span className="text-gray-500">Data:</span> <span className="font-medium">{form.dataOperacao?.split('-').reverse().join('/')}</span></div>
              <div><span className="text-gray-500">Horário:</span> <span className="font-medium">{form.horarioInicio} – {selectedSlot?.horarioFim}</span></div>
              {form.pesoBruto && <div><span className="text-gray-500">Peso Bruto:</span> <span className="font-medium">{form.pesoBruto} kg</span></div>}
              {form.volumes && <div><span className="text-gray-500">Volumes:</span> <span className="font-medium">{form.volumes}</span></div>}
              {form.observacoes && <div className="col-span-2"><span className="text-gray-500">Obs:</span> <span>{form.observacoes}</span></div>}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/agendamentos')}>
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !canNextStep0 : step === 1 ? !canNextStep1 : false}
          >
            Próximo
          </Button>
        ) : (
          <Button onClick={handleSave} isLoading={saving}>Criar Agendamento</Button>
        )}
      </div>
    </div>
  )
}
