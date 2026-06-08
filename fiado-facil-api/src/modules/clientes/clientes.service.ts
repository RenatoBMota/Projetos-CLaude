import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Cliente, StatusCliente, RiscoCliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
  ) {}

  async criar(createDto: CreateClienteDto, estabelecimentoId: string): Promise<Cliente> {
    if (createDto.cpf) {
      const existe = await this.clienteRepository.findOne({
        where: { cpf: createDto.cpf, estabelecimentoId },
      });
      if (existe) throw new ConflictException('CPF já cadastrado neste estabelecimento');
    }

    const cliente = this.clienteRepository.create({ ...createDto, estabelecimentoId });
    return this.clienteRepository.save(cliente);
  }

  async listar(
    estabelecimentoId: string,
    page = 1,
    limit = 20,
    busca?: string,
    status?: StatusCliente,
  ) {
    const where: any = { estabelecimentoId };
    if (status) where.status = status;
    if (busca) where.nome = Like(`%${busca}%`);

    const [clientes, total] = await this.clienteRepository.findAndCount({
      where,
      order: { nome: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: clientes,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id, estabelecimentoId },
      relations: ['compras', 'pagamentos'],
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  async atualizar(id: string, updateDto: UpdateClienteDto, estabelecimentoId: string): Promise<Cliente> {
    const cliente = await this.buscarPorId(id, estabelecimentoId);
    Object.assign(cliente, updateDto);
    return this.clienteRepository.save(cliente);
  }

  async remover(id: string, estabelecimentoId: string): Promise<void> {
    const cliente = await this.buscarPorId(id, estabelecimentoId);
    if (Number(cliente.saldoDevedor) > 0) {
      throw new BadRequestException('Não é possível remover cliente com saldo devedor');
    }
    await this.clienteRepository.remove(cliente);
  }

  async atualizarSaldo(clienteId: string, valor: number): Promise<void> {
    await this.clienteRepository.increment({ id: clienteId }, 'saldoDevedor', valor);
    await this.recalcularScore(clienteId);
  }

  async recalcularScore(clienteId: string): Promise<void> {
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId },
      relations: ['pagamentos', 'compras'],
    });
    if (!cliente) return;

    let score = 500;
    const totalCompras = cliente.compras?.length || 0;
    const totalPagamentos = cliente.pagamentos?.length || 0;

    if (totalCompras > 0) score += Math.min(totalCompras * 5, 200);
    if (totalPagamentos > 0) score += Math.min(totalPagamentos * 10, 300);

    score = Math.max(0, Math.min(1000, score));

    let risco: RiscoCliente;
    if (score <= 300) risco = RiscoCliente.ALTO;
    else if (score <= 700) risco = RiscoCliente.MEDIO;
    else risco = RiscoCliente.BAIXO;

    await this.clienteRepository.update(clienteId, { score, risco });
  }

  async clientesInadimplentes(estabelecimentoId: string) {
    return this.clienteRepository.find({
      where: { estabelecimentoId, status: StatusCliente.INADIMPLENTE },
      order: { saldoDevedor: 'DESC' },
    });
  }

  async rankingCompradores(estabelecimentoId: string, limit = 10) {
    return this.clienteRepository.find({
      where: { estabelecimentoId },
      order: { saldoDevedor: 'DESC' },
      take: limit,
    });
  }
}
