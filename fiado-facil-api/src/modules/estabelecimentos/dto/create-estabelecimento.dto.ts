import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoEstabelecimento } from '../entities/estabelecimento.entity';

export class CreateEstabelecimentoDto {
  @ApiProperty({ example: 'Mercadinho São José' })
  @IsString()
  @MaxLength(150)
  nome: string;

  @ApiProperty({ example: '12.345.678/0001-99' })
  @IsString()
  cnpj: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional({ enum: TipoEstabelecimento })
  @IsOptional()
  @IsEnum(TipoEstabelecimento)
  tipo?: TipoEstabelecimento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pixKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappApiUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappApiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappInstance?: string;
}
