import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EstabelecimentosService } from './estabelecimentos.service';
import { CreateEstabelecimentoDto } from './dto/create-estabelecimento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('estabelecimentos')
@Controller('estabelecimentos')
export class EstabelecimentosController {
  constructor(private readonly estabelecimentosService: EstabelecimentosService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar estabelecimento' })
  criar(@Body() createDto: CreateEstabelecimentoDto) {
    return this.estabelecimentosService.criar(createDto);
  }

  @Get('meu')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Dados do estabelecimento do usuário logado' })
  meuEstabelecimento(@Request() req) {
    return this.estabelecimentosService.buscarPorId(req.user.estabelecimentoId);
  }

  @Patch('meu')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atualizar estabelecimento' })
  atualizar(@Body() updateDto: Partial<CreateEstabelecimentoDto>, @Request() req) {
    return this.estabelecimentosService.atualizar(req.user.estabelecimentoId, updateDto);
  }
}
