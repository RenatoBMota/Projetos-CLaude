import { api } from './api'
import { StatusValidacaoDocumento } from '@/types'

export interface DocumentoResponse {
  id: string
  tipoDocumento: string
  numero: string | null
  serie: string | null
  chaveAcesso: string | null
  emitente: string | null
  destinatario: string | null
  peso: number | null
  volumes: number | null
  valorTotal: number | null
  statusValidacao: StatusValidacaoDocumento
  observacaoValidacao: string | null
  nomeArquivo: string | null
  tamanhoArquivo: number | null
  contentType: string | null
  temArquivo: boolean
  createdAt: string
}

export interface ChecklistDocumentalResponse {
  id: string
  agendamentoId: string
  agendamentoCodigo: string
  status: StatusValidacaoDocumento
  nfeOk: boolean
  xmlOk: boolean
  lacreOk: boolean
  fotoCargaOk: boolean
  epiOk: boolean
  nfeExigida: boolean
  xmlExigido: boolean
  lacreExigido: boolean
  fotoCargaExigida: boolean
  epiExigido: boolean
  observacao: string | null
  atualizadoEm: string
}

export const TIPOS_DOCUMENTO = [
  { value: 'NFE', label: 'NF-e (Nota Fiscal Eletrônica)' },
  { value: 'CTE', label: 'CT-e (Conhecimento de Transporte)' },
  { value: 'MDFE', label: 'MDF-e (Manifesto de Documentos Fiscais)' },
  { value: 'PEDIDO', label: 'Pedido de Compra' },
  { value: 'ROMANEIO', label: 'Romaneio de Carga' },
  { value: 'ASN', label: 'ASN (Aviso de Embarque)' },
  { value: 'LACRE', label: 'Lacre de Veículo' },
  { value: 'FOTO_CARGA', label: 'Foto da Carga' },
  { value: 'EPI', label: 'Comprovante de EPI' },
  { value: 'OUTROS', label: 'Outros' },
]

export const documentoService = {
  listar: (agendamentoId: string) =>
    api.get<{ data: DocumentoResponse[] }>(`/agendamentos/${agendamentoId}/documentos`),

  upload: (agendamentoId: string, arquivo: File, tipoDocumento: string) => {
    const form = new FormData()
    form.append('arquivo', arquivo)
    form.append('tipoDocumento', tipoDocumento)
    return api.post<{ data: DocumentoResponse }>(
      `/agendamentos/${agendamentoId}/documentos/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  validar: (agendamentoId: string, documentoId: string, status: StatusValidacaoDocumento, observacao?: string) =>
    api.post<{ data: DocumentoResponse }>(`/agendamentos/${agendamentoId}/documentos/${documentoId}/validar`, {
      status, observacao,
    }),

  gerarUrlDownload: (agendamentoId: string, documentoId: string) =>
    api.get<{ data: { url: string } }>(`/agendamentos/${agendamentoId}/documentos/${documentoId}/download-url`),

  excluir: (agendamentoId: string, documentoId: string) =>
    api.delete(`/agendamentos/${agendamentoId}/documentos/${documentoId}`),

  checklist: (agendamentoId: string) =>
    api.get<{ data: ChecklistDocumentalResponse }>(`/agendamentos/${agendamentoId}/documentos/checklist`),
}
