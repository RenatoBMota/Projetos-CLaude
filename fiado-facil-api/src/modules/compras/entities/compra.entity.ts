import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, Index,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

export enum OrigemCompra {
  MANUAL = 'manual',
  XML_NFE = 'xml_nfe',
  XML_NFCE = 'xml_nfce',
}

export enum StatusCompra {
  PENDENTE = 'pendente',
  PARCIAL = 'parcial',
  QUITADA = 'quitada',
  CANCELADA = 'cancelada',
}

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Cliente, (cliente) => cliente.compras)
  cliente: Cliente;

  @Column()
  clienteId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valorPago: number;

  @Column({ type: 'date' })
  dataCompra: Date;

  @Column({ type: 'date', nullable: true })
  dataVencimento: Date;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ type: 'enum', enum: OrigemCompra, default: OrigemCompra.MANUAL })
  origem: OrigemCompra;

  @Column({ type: 'enum', enum: StatusCompra, default: StatusCompra.PENDENTE })
  status: StatusCompra;

  // Campos da NF-e / NFC-e
  @Column({ nullable: true })
  numeroNota: string;

  @Column({ nullable: true })
  chaveNfe: string;

  @Column({ type: 'jsonb', nullable: true })
  itensNfe: object;

  @Column()
  estabelecimentoId: string;

  @ManyToOne(() => Usuario, { nullable: true })
  operador: Usuario;

  @Column({ nullable: true })
  operadorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get saldoRestante(): number {
    return Number(this.valor) - Number(this.valorPago);
  }
}
