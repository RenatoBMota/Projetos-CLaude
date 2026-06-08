import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, Index,
} from 'typeorm';
import { Estabelecimento } from '../../estabelecimentos/entities/estabelecimento.entity';
import { Compra } from '../../compras/entities/compra.entity';
import { Pagamento } from '../../pagamentos/entities/pagamento.entity';
import { Cobranca } from '../../cobrancas/entities/cobranca.entity';

export enum StatusCliente {
  ATIVO = 'ativo',
  BLOQUEADO = 'bloqueado',
  INADIMPLENTE = 'inadimplente',
  INATIVO = 'inativo',
}

export enum RiscoCliente {
  ALTO = 'alto',
  MEDIO = 'medio',
  BAIXO = 'baixo',
}

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Index()
  @Column({ length: 14, nullable: true })
  cpf: string;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ length: 20, nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ length: 100, nullable: true })
  cidade: string;

  @Column({ type: 'date', nullable: true })
  dataNascimento: Date;

  @Column({ nullable: true })
  fotoUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  limiteCredito: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  saldoDevedor: number;

  @Column({ default: 30 })
  prazoPagamentoDias: number;

  @Column({ nullable: true })
  diaVencimento: number;

  @Column({ type: 'enum', enum: StatusCliente, default: StatusCliente.ATIVO })
  status: StatusCliente;

  @Column({ type: 'int', default: 500 })
  score: number;

  @Column({ type: 'enum', enum: RiscoCliente, default: RiscoCliente.MEDIO })
  risco: RiscoCliente;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @ManyToOne(() => Estabelecimento, (estab) => estab.clientes)
  estabelecimento: Estabelecimento;

  @Column()
  estabelecimentoId: string;

  @OneToMany(() => Compra, (compra) => compra.cliente)
  compras: Compra[];

  @OneToMany(() => Pagamento, (pagamento) => pagamento.cliente)
  pagamentos: Pagamento[];

  @OneToMany(() => Cobranca, (cobranca) => cobranca.cliente)
  cobrancas: Cobranca[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get limiteDisponivel(): number {
    return Number(this.limiteCredito) - Number(this.saldoDevedor);
  }
}
