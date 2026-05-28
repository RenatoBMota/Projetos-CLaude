'use client'

import { useState, useEffect } from 'react'
import { Settings, Plug, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react'
import { integracaoService, IntegracaoYmsStatus } from '@/services/integracao.service'

function StatusBadge({ online }: { online: boolean }) {
  if (online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3.5 h-3.5" /> Online
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <XCircle className="w-3.5 h-3.5" /> Offline
    </span>
  )
}

export default function ConfiguracoesPage() {
  const [ymsStatus, setYmsStatus] = useState<IntegracaoYmsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStatus = async () => {
    setRefreshing(true)
    try {
      const res = await integracaoService.ymsStatus()
      setYmsStatus(res.data.data)
    } catch {
      setYmsStatus(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadStatus() }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Integrações e status dos sistemas externos</p>
        </div>
        <button
          onClick={loadStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Integração YMS */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <Plug className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">Integração YMS</h2>
              {!loading && ymsStatus && (
                <StatusBadge online={ymsStatus.ymsOnline} />
              )}
              {!loading && ymsStatus && !ymsStatus.enabled && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                  Desativada
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Yard Management System — RBM Logistics</p>
          </div>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ymsStatus ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Status da integração</p>
                <p className="text-sm font-medium text-gray-900">
                  {ymsStatus.enabled ? 'Ativada' : 'Desativada'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">YMS online</p>
                <p className={`text-sm font-medium ${ymsStatus.ymsOnline ? 'text-green-700' : 'text-red-600'}`}>
                  {ymsStatus.ymsOnline ? 'Sim' : 'Não'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">URL base</p>
                <p className="text-xs font-mono text-gray-700 truncate">{ymsStatus.baseUrl}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Não foi possível obter o status da integração.</p>
        )}

        {/* Config hint */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Para ativar a integração:</p>
              <p>No servidor Spring Boot, defina as variáveis de ambiente:</p>
              <div className="mt-1 space-y-0.5 font-mono">
                <p><code className="bg-blue-100 px-1 rounded">YMS_ENABLED=true</code></p>
                <p><code className="bg-blue-100 px-1 rounded">YMS_BASE_URL=http://&lt;ip-do-yms&gt;:5000</code></p>
                <p><code className="bg-blue-100 px-1 rounded">YMS_API_KEY=&lt;chave-configurada-no-yms&gt;</code></p>
                <p><code className="bg-blue-100 px-1 rounded">YMS_WEBHOOK_SECRET=&lt;segredo-compartilhado&gt;</code></p>
              </div>
              <p className="mt-2">No YMS, aplique o patch do arquivo <span className="font-semibold">yms-integration/rbm_integration.py</span> e configure em <strong>Configurações → integracao</strong>.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fluxo de integração */}
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Fluxo de integração</h2>
            <p className="text-sm text-gray-500">Como os dois sistemas se comunicam</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            {
              dir: '→',
              label: 'Agendamento CONFIRMADO',
              desc: 'Publica evento na fila RabbitMQ rbm.integracao.yms → cria schedule no YMS automaticamente',
              color: 'green',
            },
            {
              dir: '→',
              label: 'Agendamento CANCELADO',
              desc: 'Remove o schedule correspondente do YMS (quando ymsScheduleId está disponível)',
              color: 'red',
            },
            {
              dir: '←',
              label: 'Check-in de veículo no YMS',
              desc: 'YMS chama webhook POST /api/v1/integracao/yms/webhook → registra chegada ao pátio no agendamento',
              color: 'blue',
            },
            {
              dir: '←',
              label: 'Operação finalizada no YMS',
              desc: 'YMS chama webhook → finaliza o agendamento no sistema RBM',
              color: 'purple',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className={`text-lg font-bold ${
                item.color === 'green' ? 'text-green-600' :
                item.color === 'red' ? 'text-red-500' :
                item.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
              }`}>{item.dir}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
