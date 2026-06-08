import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';

export enum TipoEstabelecimento {
  MERCADO = 'mercado',
  MERCEARIA = 'mercearia',
  PADARIA = 'padaria',
  ACOUGUE = 'acougue',
  HORTIFRUTI = 'hortifruti',
  DISTRIBUIDORA = 'distribuidora',
  CONVENIENCIA = 'conveniencia',
  OUTRO = 'outro',
}

export enum PlanoEstabelecimento {
  BASICO = 'basico',
  PROFISSIONAL = 'profissional',
  ENTERPRISE = 'enterprise',
}

@Entity('estabelecimentos')
export class Estabelecimento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ unique: true, length: 18 })
  cnpj: string;

  @Column({ length: 20, nullable: true })
  telefone: string;

  @Column({ length: 20, nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ length: 100, nullable: true })
  cidade: string;

  @Column({ length: 2, nullable: true })
  estado: string;

  @Column({ length: 9, nullable: true })
  cep: string;

  @Column({ type: 'enum', enum: TipoEstabelecimento, default: TipoEstabelecimento.MERCADO })
  tipo: TipoEstabelecimento;

  @Column({ type: 'enum', enum: PlanoEstabelecimento, default: PlanoEstabelecimento.BASICO })
  plano: PlanoEstabelecimento;

  @Column({ default: true })
  ativo: boolean;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  pixKey: string;

  @Column({ nullable: true })
  whatsappApiUrl: string;

  @Column({ nullable: true })
  whatsappApiKey: string;

  @Column({ nullable: true })
  whatsappInstance: string;

  @OneToMany(() => Usuario, (usuario) => usuario.estabelecimento)
  usuarios: Usuario[];

  @OneToMany(() => Cliente, (cliente) => cliente.estabelecimento)
  clientes: Cliente[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
