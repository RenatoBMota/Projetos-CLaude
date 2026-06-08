import {
  Controller, Get, Post, Body, UseGuards, Request,
  Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PagamentosService } from './pagamentos.service';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagamentos')
export class PagamentosController {
  constructor(private readonly pagamentosService: PagamentosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar pagamento de cliente' })
  registrar(@Body() createPagamentoDto: CreatePagamentoDto, @Request() req) {
    return this.pagamentosService.registrar(createPagamentoDto, req.user.estabelecimentoId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos' })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listar(
    @Request() req,
    @Query('clienteId') clienteId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.pagamentosService.listar(req.user.estabelecimentoId, clienteId, dataInicio, dataFim, page, limit);
  }
}
