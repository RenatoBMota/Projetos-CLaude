import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Pagamento } from './entities/pagamento.entity';
import { CreatePagamentoDto } from './dto/create-pagamento.dto';
import { ClientesService } from '../clientes/clientes.service';
import { StatusCliente } from '../clientes/entities/cliente.entity';

@Injectable()
export class PagamentosService {
  constructor(
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
    private clientesService: ClientesService,
  ) {}

  async registrar(createDto: CreatePagamentoDto, estabelecimentoId: string, operadorId: string): Promise<Pagamento> {
    const cliente = await this.clientesService.buscarPorId(createDto.clienteId, estabelecimentoId);

    if (createDto.valor > Number(cliente.saldoDevedor)) {
      throw new BadRequestException(
        `Valor de pagamento (R$ ${createDto.valor}) superior ao saldo devedor (R$ ${cliente.saldoDevedor})`,
      );
    }

    const pagamento = this.pagamentoRepository.create({
      ...createDto,
      estabelecimentoId,
      operadorId,
    });

    const saved = await this.pagamentoRepository.save(pagamento);
    await this.clientesService.atualizarSaldo(cliente.id, -createDto.valor);

    // Se zerou o saldo, reativa cliente inadimplente
    const clienteAtualizado = await this.clientesService.buscarPorId(cliente.id, estabelecimentoId);
    if (Number(clienteAtualizado.saldoDevedor) === 0 && clienteAtualizado.status === StatusCliente.INADIMPLENTE) {
      await this.clientesService.atualizar(cliente.id, { status: StatusCliente.ATIVO }, estabelecimentoId);
    }

    return saved;
  }

  async listar(
    estabelecimentoId: string,
    clienteId?: string,
    dataInicio?: string,
    dataFim?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = { estabelecimentoId };
    if (clienteId) where.clienteId = clienteId;
    if (dataInicio && dataFim) {
      where.dataPagamento = Between(new Date(dataInicio), new Date(dataFim));
    }

    const [pagamentos, total] = await this.pagamentoRepository.findAndCount({
      where,
      relations: ['cliente'],
      order: { dataPagamento: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: pagamentos, total, page, lastPage: Math.ceil(total / limit) };
  }

  async totalRecebidoPeriodo(estabelecimentoId: string, dataInicio: string, dataFim: string): Promise<number> {
    const resultado = await this.pagamentoRepository
      .createQueryBuilder('p')
      .select('SUM(p.valor)', 'total')
      .where('p.estabelecimentoId = :estabelecimentoId', { estabelecimentoId })
      .andWhere('p.dataPagamento BETWEEN :inicio AND :fim', {
        inicio: dataInicio,
        fim: dataFim,
      })
      .getRawOne();

    return parseFloat(resultado?.total || '0');
  }
}
