import {
  IsString, IsOptional, IsEmail, IsEnum, IsNumber,
  Min, IsDateString, MaxLength, IsMobilePhone,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCliente } from '../entities/cliente.entity';

export class CreateClienteDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @MaxLength(150)
  nome: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: '(11) 91234-5678' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: '(11) 91234-5678' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: '1990-01-15' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiProperty({ example: 500, description: 'Limite de crédito em reais' })
  @IsNumber()
  @Min(0)
  limiteCredito: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  prazoPagamentoDias?: number;

  @ApiPropertyOptional({ example: 5, description: 'Dia do mês para vencimento' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  diaVencimento?: number;

  @ApiPropertyOptional({ enum: StatusCliente })
  @IsOptional()
  @IsEnum(StatusCliente)
  status?: StatusCliente;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}
