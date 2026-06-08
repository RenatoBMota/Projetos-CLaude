import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY')
}

export function formatDatetime(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export const statusClienteLabel: Record<string, string> = {
  ativo: 'Ativo',
  bloqueado: 'Bloqueado',
  inadimplente: 'Inadimplente',
  inativo: 'Inativo',
}

export const statusClienteBadge: Record<string, string> = {
  ativo: 'badge-green',
  bloqueado: 'badge-red',
  inadimplente: 'badge-yellow',
  inativo: 'badge-gray',
}

export const riscoLabel: Record<string, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
}

export const riscoBadge: Record<string, string> = {
  baixo: 'badge-green',
  medio: 'badge-yellow',
  alto: 'badge-red',
}

export const statusCompraLabel: Record<string, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  quitada: 'Quitada',
  cancelada: 'Cancelada',
}

export const formaPagamentoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  transferencia: 'Transferência',
  cheque: 'Cheque',
}

export const tipoCobrancaLabel: Record<string, string> = {
  lembrete_7_dias: 'Lembrete 7 dias',
  lembrete_3_dias: 'Lembrete 3 dias',
  vencimento_hoje: 'Vencimento hoje',
  atraso_5_dias: 'Atraso 5 dias',
  atraso_15_dias: 'Atraso 15 dias',
  atraso_30_dias: 'Atraso 30 dias',
  manual: 'Manual',
}
