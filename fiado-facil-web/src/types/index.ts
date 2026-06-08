export interface Usuario {
  id: string
  nome: string
  email: string
  role: 'proprietario' | 'gerente' | 'operador'
  estabelecimento?: Estabelecimento
  estabelecimentoId?: string
}

export interface Estabelecimento {
  id: string
  nome: string
  cnpj: string
  telefone?: string
  whatsapp?: string
  endereco?: string
  cidade?: string
  estado?: string
  tipo: string
  plano: 'basico' | 'profissional' | 'enterprise'
  pixKey?: string
  ativo: boolean
}

export type StatusCliente = 'ativo' | 'bloqueado' | 'inadimplente' | 'inativo'
export type RiscoCliente  = 'alto' | 'medio' | 'baixo'

export interface Cliente {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  whatsapp?: string
  endereco?: string
  cidade?: string
  dataNascimento?: string
  fotoUrl?: string
  limiteCredito: number
  saldoDevedor: number
  limiteDisponivel?: number
  prazoPagamentoDias: number
  diaVencimento?: number
  status: StatusCliente
  score: number
  risco: RiscoCliente
  observacoes?: string
  estabelecimentoId: string
  createdAt: string
  updatedAt: string
}

export type StatusCompra = 'pendente' | 'parcial' | 'quitada' | 'cancelada'
export type OrigemCompra = 'manual' | 'xml_nfe' | 'xml_nfce'

export interface Compra {
  id: string
  clienteId: string
  cliente?: Cliente
  valor: number
  valorPago: number
  dataCompra: string
  dataVencimento?: string
  observacao?: string
  origem: OrigemCompra
  status: StatusCompra
  numeroNota?: string
  chaveNfe?: string
  estabelecimentoId: string
  operadorId?: string
  createdAt: string
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'cheque'

export interface Pagamento {
  id: string
  clienteId: string
  cliente?: Cliente
  valor: number
  dataPagamento: string
  formaPagamento: FormaPagamento
  observacao?: string
  estabelecimentoId: string
  createdAt: string
}

export type TipoCobranca  = 'lembrete_7_dias' | 'lembrete_3_dias' | 'vencimento_hoje' | 'atraso_5_dias' | 'atraso_15_dias' | 'atraso_30_dias' | 'manual'
export type StatusCobranca = 'pendente' | 'enviada' | 'falhou' | 'cancelada'

export interface Cobranca {
  id: string
  clienteId: string
  cliente?: Cliente
  tipo: TipoCobranca
  status: StatusCobranca
  canal: string
  mensagem?: string
  erroDetalhes?: string
  valorDevido?: number
  estabelecimentoId: string
  createdAt: string
}

export interface DashboardResumo {
  totalClientes: number
  clientesInadimplentes: number
  clientesBloqueados: number
  totalAReceber: number
  novoClientesMes: number
  recebimentosMes: number
  ticketMedio: number
  totalInadimplentes: number
  valorInadimplencia: number
}

export interface Paginado<T> {
  data: T[]
  total: number
  page: number
  lastPage: number
}

export interface AuthResponse {
  accessToken: string
  usuario: Usuario
}
