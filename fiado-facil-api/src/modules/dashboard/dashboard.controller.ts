import { Controller, Get, Query, UseGuards, Request, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Resumo completo do dashboard' })
  resumoCompleto(@Request() req) {
    return this.dashboardService.resumoCompleto(req.user.estabelecimentoId);
  }

  @Get('recebimentos')
  @ApiOperation({ summary: 'Recebimentos do mês' })
  @ApiQuery({ name: 'mes', required: false })
  @ApiQuery({ name: 'ano', required: false })
  recebimentosMes(
    @Request() req,
    @Query('mes', new DefaultValuePipe(0), ParseIntPipe) mes?: number,
    @Query('ano', new DefaultValuePipe(0), ParseIntPipe) ano?: number,
  ) {
    return this.dashboardService.recebimentosMes(
      req.user.estabelecimentoId,
      ano || undefined,
      mes || undefined,
    );
  }

  @Get('recebimentos/por-dia')
  @ApiOperation({ summary: 'Recebimentos agrupados por dia' })
  recebimentosPorDia(
    @Request() req,
    @Query('mes', new DefaultValuePipe(0), ParseIntPipe) mes?: number,
    @Query('ano', new DefaultValuePipe(0), ParseIntPipe) ano?: number,
  ) {
    return this.dashboardService.recebimentosPorDia(
      req.user.estabelecimentoId,
      mes || undefined,
      ano || undefined,
    );
  }

  @Get('compras/por-dia')
  @ApiOperation({ summary: 'Compras agrupadas por dia' })
  comprasPorDia(
    @Request() req,
    @Query('mes', new DefaultValuePipe(0), ParseIntPipe) mes?: number,
    @Query('ano', new DefaultValuePipe(0), ParseIntPipe) ano?: number,
  ) {
    return this.dashboardService.comprasPorDia(
      req.user.estabelecimentoId,
      mes || undefined,
      ano || undefined,
    );
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking dos maiores devedores' })
  ranking(@Request() req) {
    return this.dashboardService.rankingClientes(req.user.estabelecimentoId);
  }

  @Get('clientes-risco')
  @ApiOperation({ summary: 'Clientes de alto risco' })
  clientesRisco(@Request() req) {
    return this.dashboardService.clientesRisco(req.user.estabelecimentoId);
  }

  @Get('inadimplencia')
  @ApiOperation({ summary: 'Relatório de inadimplência' })
  inadimplencia(@Request() req) {
    return this.dashboardService.relatorioInadimplencia(req.user.estabelecimentoId);
  }

  @Get('ticket-medio')
  @ApiOperation({ summary: 'Ticket médio das compras' })
  ticketMedio(@Request() req) {
    return this.dashboardService.ticketMedio(req.user.estabelecimentoId);
  }
}
