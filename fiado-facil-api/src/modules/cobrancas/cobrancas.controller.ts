import {
  Controller, Get, Post, Param, UseGuards, Request,
  Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CobrancasService } from './cobrancas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cobrancas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cobrancas')
export class CobrancasController {
  constructor(private readonly cobrancasService: CobrancasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cobranças enviadas' })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listar(
    @Request() req,
    @Query('clienteId') clienteId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.cobrancasService.listar(req.user.estabelecimentoId, clienteId, page, limit);
  }

  @Post('manual/:clienteId')
  @ApiOperation({ summary: 'Enviar cobrança manual via WhatsApp' })
  enviarManual(@Param('clienteId') clienteId: string, @Request() req) {
    return this.cobrancasService.enviarCobrancaManual(clienteId, req.user.estabelecimentoId);
  }
}
