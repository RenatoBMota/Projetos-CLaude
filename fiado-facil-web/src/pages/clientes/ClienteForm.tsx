import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { clientesService } from '@/services/clientes.service'
import { Spinner } from '@/components/ui/Spinner'
import type { Cliente } from '@/types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  limiteCredito: z.coerce.number().min(0, 'Limite inválido'),
  prazoPagamentoDias: z.coerce.number().min(1).default(30),
  diaVencimento: z.coerce.number().min(1).max(31).optional(),
  status: z.enum(['ativo', 'bloqueado', 'inadimplente', 'inativo']).default('ativo'),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  cliente?: Cliente
  onSuccess: () => void
}

export function ClienteForm({ cliente, onSuccess }: Props) {
  const isEdit = !!cliente

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: cliente ? {
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone,
      whatsapp: cliente.whatsapp,
      endereco: cliente.endereco,
      cidade: cliente.cidade,
      limiteCredito: cliente.limiteCredito,
      prazoPagamentoDias: cliente.prazoPagamentoDias,
      diaVencimento: cliente.diaVencimento,
      status: cliente.status,
      observacoes: cliente.observacoes,
    } : { limiteCredito: 500, prazoPagamentoDias: 30, status: 'ativo' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? clientesService.atualizar(cliente!.id, data) : clientesService.criar(data),
    onSuccess,
    onError: (err: any) => alert(err?.response?.data?.message || 'Erro ao salvar'),
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input {...register('nome')} className="input" placeholder="Nome completo" />
          {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
        </div>
        <div>
          <label className="label">CPF</label>
          <input {...register('cpf')} className="input" placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input {...register('telefone')} className="input" placeholder="(11) 90000-0000" />
        </div>
        <div>
          <label className="label">WhatsApp</label>
          <input {...register('whatsapp')} className="input" placeholder="(11) 90000-0000" />
        </div>
        <div>
          <label className="label">Cidade</label>
          <input {...register('cidade')} className="input" placeholder="São Paulo" />
        </div>
        <div className="col-span-2">
          <label className="label">Endereço</label>
          <input {...register('endereco')} className="input" placeholder="Rua, número, bairro" />
        </div>
        <div>
          <label className="label">Limite de Crédito (R$) *</label>
          <input {...register('limiteCredito')} type="number" step="0.01" className="input" placeholder="500.00" />
          {errors.limiteCredito && <p className="text-red-500 text-xs mt-1">{errors.limiteCredito.message}</p>}
        </div>
        <div>
          <label className="label">Prazo de Pagamento (dias)</label>
          <input {...register('prazoPagamentoDias')} type="number" className="input" placeholder="30" />
        </div>
        <div>
          <label className="label">Dia de Vencimento</label>
          <input {...register('diaVencimento')} type="number" min="1" max="31" className="input" placeholder="5" />
        </div>
        <div>
          <label className="label">Status</label>
          <select {...register('status')} className="input">
            <option value="ativo">Ativo</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Observações</label>
          <textarea {...register('observacoes')} className="input" rows={2} placeholder="Informações adicionais..." />
        </div>
      </div>

      <div className="flex gap-3 pt-2 justify-end">
        <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
          {(isSubmitting || mutation.isPending) ? <Spinner size="sm" /> : isEdit ? 'Salvar Alterações' : 'Cadastrar Cliente'}
        </button>
      </div>
    </form>
  )
}
