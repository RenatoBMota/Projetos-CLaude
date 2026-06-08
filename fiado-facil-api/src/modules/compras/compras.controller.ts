import {
  Controller, Get, Post, Body, Param, Delete,
  UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CreateCompraDto, ImportarXmlDto } from './dto/create-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar compra fiada (manual)' })
  registrar(@Body() createCompraDto: CreateCompraDto, @Request() req) {
    return this.comprasService.registrar(createCompraDto, req.user.estabelecimentoId, req.user.id);
  }

  @Post('importar-xml')
  @ApiOperation({ summary: 'Importar compra via XML NF-e / NFC-e' })
  importarXml(@Body() importarDto: ImportarXmlDto, @Request() req) {
    return this.comprasService.importarXml(importarDto, req.user.estabelecimentoId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar compras' })
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
    return this.comprasService.listar(req.user.estabelecimentoId, clienteId, dataInicio, dataFim, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar compra por ID' })
  buscarPorId(@Param('id') id: string, @Request() req) {
    return this.comprasService.buscarPorId(id, req.user.estabelecimentoId);
  }

  @Delete(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar compra' })
  cancelar(@Param('id') id: string, @Request() req) {
    return this.comprasService.cancelar(id, req.user.estabelecimentoId);
  }
}
