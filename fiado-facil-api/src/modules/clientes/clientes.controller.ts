import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request, Query, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatusCliente } from './entities/cliente.entity';

@ApiTags('clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo cliente' })
  criar(@Body() createClienteDto: CreateClienteDto, @Request() req) {
    return this.clientesService.criar(createClienteDto, req.user.estabelecimentoId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'busca', required: false })
  @ApiQuery({ name: 'status', required: false, enum: StatusCliente })
  listar(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('busca') busca?: string,
    @Query('status') status?: StatusCliente,
  ) {
    return this.clientesService.listar(req.user.estabelecimentoId, page, limit, busca, status);
  }

  @Get('inadimplentes')
  @ApiOperation({ summary: 'Listar clientes inadimplentes' })
  inadimplentes(@Request() req) {
    return this.clientesService.clientesInadimplentes(req.user.estabelecimentoId);
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking dos maiores devedores/compradores' })
  ranking(@Request() req) {
    return this.clientesService.rankingCompradores(req.user.estabelecimentoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  buscarPorId(@Param('id') id: string, @Request() req) {
    return this.clientesService.buscarPorId(id, req.user.estabelecimentoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  atualizar(@Param('id') id: string, @Body() updateClienteDto: UpdateClienteDto, @Request() req) {
    return this.clientesService.atualizar(id, updateClienteDto, req.user.estabelecimentoId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover cliente' })
  remover(@Param('id') id: string, @Request() req) {
    return this.clientesService.remover(id, req.user.estabelecimentoId);
  }
}
