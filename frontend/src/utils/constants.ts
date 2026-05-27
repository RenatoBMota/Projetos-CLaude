export const APP_NAME = 'RBM LOGISTICS – Agendamento'
export const APP_VERSION = '1.0.0'

export const STATUS_AGENDAMENTO_LABELS: Record<string, string> = {
  CRIADO:          'Criado',
  PENDENTE_ACEITE: 'Pendente Aceite',
  CONFIRMADO:      'Confirmado',
  EM_TRANSITO:     'Em Trânsito',
  CHEGADA_PATIO:   'Chegada no Pátio',
  EM_DOCA:         'Em Doca',
  EM_OPERACAO:     'Em Operação',
  FINALIZADO:      'Finalizado',
  CANCELADO:       'Cancelado',
  NO_SHOW:         'No-show',
}

export const STATUS_AGENDAMENTO_COLORS: Record<string, string> = {
  CRIADO:          'badge-neutral',
  PENDENTE_ACEITE: 'badge-pending',
  CONFIRMADO:      'badge-info',
  EM_TRANSITO:     'badge-info',
  CHEGADA_PATIO:   'badge-warning',
  EM_DOCA:         'badge-warning',
  EM_OPERACAO:     'badge-warning',
  FINALIZADO:      'badge-success',
  CANCELADO:       'badge-danger',
  NO_SHOW:         'badge-danger',
}

export const TIPO_OPERACAO_LABELS: Record<string, string> = {
  RECEBIMENTO: 'Recebimento',
  EXPEDICAO:   'Expedição',
  DEVOLUCAO:   'Devolução',
  TRANSFERENCIA: 'Transferência',
}
