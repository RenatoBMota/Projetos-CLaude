import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';

export enum TipoCobranca {
  LEMBRETE_7_DIAS = 'lembrete_7_dias',
  LEMBRETE_3_DIAS = 'lembrete_3_dias',
  VENCIMENTO_HOJE = 'vencimento_hoje',
  ATRASO_5_DIAS = 'atraso_5_dias',
  ATRASO_15_DIAS = 'atraso_15_dias',
  ATRASO_30_DIAS = 'atraso_30_dias',
  MANUAL = 'manual',
}

export enum StatusCobranca {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  FALHOU = 'falhou',
  CANCELADA = 'cancelada',
}

export enum CanalCobranca {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
}

@Entity('cobrancas')
export class Cobranca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.cobrancas)
  cliente: Cliente;

  @Column()
  clienteId: string;

  @Column({ type: 'enum', enum: TipoCobranca })
  tipo: TipoCobranca;

  @Column({ type: 'enum', enum: StatusCobranca, default: StatusCobranca.PENDENTE })
  status: StatusCobranca;

  @Column({ type: 'enum', enum: CanalCobranca, default: CanalCobranca.WHATSAPP })
  canal: CanalCobranca;

  @Column({ type: 'text', nullable: true })
  mensagem: string;

  @Column({ type: 'text', nullable: true })
  erroDetalhes: string;

  @Column()
  estabelecimentoId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valorDevido: number;

  @CreateDateColumn()
  createdAt: Date;
}
