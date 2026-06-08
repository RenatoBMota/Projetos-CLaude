import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Settings, Store, Smartphone, CreditCard } from 'lucide-react'
import api from '@/services/api'
import { Spinner, PageLoading } from '@/components/ui/Spinner'
import type { Estabelecimento } from '@/types'

export function ConfiguracoesPage() {
  const qc = useQueryClient()

  const { data: estab, isLoading } = useQuery({
    queryKey: ['estabelecimento-meu'],
    queryFn: () => api.get<Estabelecimento>('/estabelecimentos/meu').then(r => r.data),
  })

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    values: estab ?? {},
  })

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch('/estabelecimentos/meu', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['estabelecimento-meu'] }); alert('Configurações salvas!') },
    onError: () => alert('Erro ao salvar configurações'),
  })

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Dados do estabelecimento e integrações</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        {/* Dados Básicos */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-primary-600" /> Dados do Estabelecimento
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome do Estabelecimento</label>
              <input {...register('nome')} className="input" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input {...register('telefone')} className="input" placeholder="(11) 90000-0000" />
            </div>
            <div>
              <label className="label">WhatsApp do Estabelecimento</label>
              <input {...register('whatsapp')} className="input" placeholder="(11) 90000-0000" />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input {...register('cidade')} className="input" />
            </div>
            <div>
              <label className="label">Estado (UF)</label>
              <input {...register('estado')} className="input" maxLength={2} />
            </div>
            <div className="col-span-2">
              <label className="label">Endereço</label>
              <input {...register('endereco')} className="input" />
            </div>
          </div>
        </div>

        {/* PIX */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-600" /> Chave PIX
          </h2>
          <div>
            <label className="label">Chave PIX (CPF, CNPJ, e-mail ou telefone)</label>
            <input {...register('pixKey')} className="input" placeholder="CPF, CNPJ, email ou telefone" />
            <p className="text-xs text-gray-400 mt-1">Será exibida nos carnês digitais e extratos</p>
          </div>
        </div>

        {/* WhatsApp API */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Smartphone size={18} className="text-primary-600" /> Integração WhatsApp
          </h2>
          <p className="text-sm text-gray-500">Configure a Evolution API ou Z-API para enviar cobranças automáticas</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">URL da API</label>
              <input {...register('whatsappApiUrl')} className="input" placeholder="https://sua-api.com" />
            </div>
            <div>
              <label className="label">API Key</label>
              <input {...register('whatsappApiKey')} className="input" type="password" placeholder="••••••••" />
            </div>
            <div>
              <label className="label">Instância / Sessão</label>
              <input {...register('whatsappInstance')} className="input" placeholder="minha-instancia" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? <Spinner size="sm" /> : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  )
}
