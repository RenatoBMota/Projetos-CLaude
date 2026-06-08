import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Estabelecimento } from '../../estabelecimentos/entities/estabelecimento.entity';

export enum RoleUsuario {
  PROPRIETARIO = 'proprietario',
  GERENTE = 'gerente',
  OPERADOR = 'operador',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nome: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column()
  @Exclude()
  senha: string;

  @Column({ type: 'enum', enum: RoleUsuario, default: RoleUsuario.OPERADOR })
  role: RoleUsuario;

  @Column({ default: true })
  ativo: boolean;

  @ManyToOne(() => Estabelecimento, (estab) => estab.usuarios, { nullable: true })
  estabelecimento: Estabelecimento;

  @Column({ nullable: true })
  estabelecimentoId: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashSenha() {
    if (this.senha && !this.senha.startsWith('$2b$')) {
      this.senha = await bcrypt.hash(this.senha, 10);
    }
  }

  async validarSenha(senha: string): Promise<boolean> {
    return bcrypt.compare(senha, this.senha);
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
