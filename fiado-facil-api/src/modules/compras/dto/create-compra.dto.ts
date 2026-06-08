import {
  IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrigemCompra } from '../entities/compra.entity';

export class CreateCompraDto {
  @ApiProperty()
  @IsString()
  clienteId: string;

  @ApiProperty({ example: 125.40 })
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  dataCompra: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @ApiPropertyOptional({ example: 'Compras do dia' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({ enum: OrigemCompra, default: OrigemCompra.MANUAL })
  @IsOptional()
  @IsEnum(OrigemCompra)
  origem?: OrigemCompra;
}

export class ImportarXmlDto {
  @ApiProperty({ description: 'XML da NF-e ou NFC-e em base64 ou string' })
  @IsString()
  xml: string;

  @ApiProperty({ description: 'ID do cliente' })
  @IsString()
  clienteId: string;
}
