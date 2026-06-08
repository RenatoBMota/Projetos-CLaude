import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleUsuario } from '../entities/usuario.entity';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  nome: string;

  @ApiProperty({ example: 'joao@mercado.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiPropertyOptional({ enum: RoleUsuario })
  @IsOptional()
  @IsEnum(RoleUsuario)
  role?: RoleUsuario;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estabelecimentoId?: string;
}
