import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamento } from '../entities/pagamento.entity';

export class CreatePagamentoDto {
  @ApiProperty()
  @IsString()
  clienteId: string;

  @ApiProperty({ example: 200.00 })
  @IsNumber()
  @Min(0.01)
  valor: number;

  @ApiProperty({ example: '2026-06-08' })
  @IsDateString()
  dataPagamento: string;

  @ApiPropertyOptional({ enum: FormaPagamento, default: FormaPagamento.DINHEIRO })
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}
