import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_DEBITO = 'cartao_debito',
  CARTAO_CREDITO = 'cartao_credito',
  TRANSFERENCIA = 'transferencia',
  CHEQUE = 'cheque',
}

@Entity('pagamentos')
export class Pagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.pagamentos)
  cliente: Cliente;

  @Column()
  clienteId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  dataPagamento: Date;

  @Column({ type: 'enum', enum: FormaPagamento, default: FormaPagamento.DINHEIRO })
  formaPagamento: FormaPagamento;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ nullable: true })
  comprovante: string;

  @Column()
  estabelecimentoId: string;

  @ManyToOne(() => Usuario, { nullable: true })
  operador: Usuario;

  @Column({ nullable: true })
  operadorId: string;

  @CreateDateColumn()
  createdAt: Date;
}
