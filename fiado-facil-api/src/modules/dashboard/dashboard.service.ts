import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Cliente, StatusCliente, RiscoCliente } from '../clientes/entities/cliente.entity';
import { Compra, StatusCompra } from '../compras/entities/compra.entity';
import { Pagamento } from '../pagamentos/entities/pagamento.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
  ) {}

  async resumoGeral(estabelecimentoId: string) {
    const [
      totalClientes,
      clientesInadimplentes,
      clientesBloqueados,
      totalSaldoDevedor,
      novosMes,
    ] = await Promise.all([
      this.clienteRepository.count({ where: { estabelecimentoId, status: StatusCliente.ATIVO } }),
      this.clienteRepository.count({ where: { estabelecimentoId, status: StatusCliente.INADIMPLENTE } }),
      this.clienteRepository.count({ where: { estabelecimentoId, status: StatusCliente.BLOQUEADO } }),
      this.clienteRepository
        .createQueryBuilder('c')
        .select('SUM(c.saldoDevedor)', 'total')
        .where('c.estabelecimentoId = :id', { id: estabelecimentoId })
        .getRawOne(),
      this.clienteRepository
        .createQueryBuilder('c')
        .where('c.estabelecimentoId = :id', { id: estabelecimentoId })
        .andWhere('c.createdAt >= :inicio', { inicio: dayjs().startOf('month').toDate() })
        .getCount(),
    ]);

    return {
      totalClientes,
      clientesInadimplentes,
      clientesBloqueados,
      totalAReceber: parseFloat(totalSaldoDevedor?.total || '0'),
      novoClientesMes: novosMes,
    };
  }

  async recebimentosMes(estabelecimentoId: string, ano?: number, mes?: number) {
    const now = dayjs();
    const anoRef = ano || now.year();
    const mesRef = mes || now.month() + 1;

    const inicio = dayjs(`${anoRef}-${mesRef}-01`).startOf('month').format('YYYY-MM-DD');
    const fim = dayjs(`${anoRef}-${mesRef}-01`).endOf('month').format('YYYY-MM-DD');

    const resultado = await this.pagamentoRepository
      .createQueryBuilder('p')
      .select('SUM(p.valor)', 'total')
      .addSelect('COUNT(*)', 'quantidade')
      .where('p.estabelecimentoId = :id', { id: estabelecimentoId })
      .andWhere('p.dataPagamento BETWEEN :inicio AND :fim', { inicio, fim })
      .getRawOne();

    return {
      total: parseFloat(resultado?.total || '0'),
      quantidade: parseInt(resultado?.quantidade || '0'),
      mes: mesRef,
      ano: anoRef,
    };
  }

  async recebimentosPorDia(estabelecimentoId: string, mes?: number, ano?: number) {
    const now = dayjs();
    const anoRef = ano || now.year();
    const mesRef = mes || now.month() + 1;

    const inicio = dayjs(`${anoRef}-${mesRef}-01`).startOf('month').format('YYYY-MM-DD');
    const fim = dayjs(`${anoRef}-${mesRef}-01`).endOf('month').format('YYYY-MM-DD');

    return this.pagamentoRepository
      .createQueryBuilder('p')
      .select('DATE(p.dataPagamento)', 'dia')
      .addSelect('SUM(p.valor)', 'total')
      .where('p.estabelecimentoId = :id', { id: estabelecimentoId })
      .andWhere('p.dataPagamento BETWEEN :inicio AND :fim', { inicio, fim })
      .groupBy('DATE(p.dataPagamento)')
      .orderBy('dia', 'ASC')
      .getRawMany();
  }

  async comprasPorDia(estabelecimentoId: string, mes?: number, ano?: number) {
    const now = dayjs();
    const anoRef = ano || now.year();
    const mesRef = mes || now.month() + 1;

    const inicio = dayjs(`${anoRef}-${mesRef}-01`).startOf('month').format('YYYY-MM-DD');
    const fim = dayjs(`${anoRef}-${mesRef}-01`).endOf('month').format('YYYY-MM-DD');

    return this.compraRepository
      .createQueryBuilder('c')
      .select('DATE(c.dataCompra)', 'dia')
      .addSelect('SUM(c.valor)', 'total')
      .addSelect('COUNT(*)', 'quantidade')
      .where('c.estabelecimentoId = :id', { id: estabelecimentoId })
      .andWhere('c.dataCompra BETWEEN :inicio AND :fim', { inicio, fim })
      .andWhere('c.status != :cancelada', { cancelada: StatusCompra.CANCELADA })
      .groupBy('DATE(c.dataCompra)')
      .orderBy('dia', 'ASC')
      .getRawMany();
  }

  async rankingClientes(estabelecimentoId: string, limite = 10) {
    return this.clienteRepository.find({
      where: { estabelecimentoId },
      order: { saldoDevedor: 'DESC' },
      take: limite,
      select: ['id', 'nome', 'saldoDevedor', 'status', 'score', 'risco'],
    });
  }

  async clientesRisco(estabelecimentoId: string) {
    return this.clienteRepository.find({
      where: { estabelecimentoId, risco: RiscoCliente.ALTO },
      order: { score: 'ASC' },
      take: 20,
    });
  }

  async ticketMedio(estabelecimentoId: string) {
    const resultado = await this.compraRepository
      .createQueryBuilder('c')
      .select('AVG(c.valor)', 'media')
      .where('c.estabelecimentoId = :id', { id: estabelecimentoId })
      .andWhere('c.status != :cancelada', { cancelada: StatusCompra.CANCELADA })
      .getRawOne();

    return { ticketMedio: parseFloat(resultado?.media || '0') };
  }

  async relatorioInadimplencia(estabelecimentoId: string) {
    const clientes = await this.clienteRepository.find({
      where: { estabelecimentoId, status: StatusCliente.INADIMPLENTE },
      order: { saldoDevedor: 'DESC' },
    });

    const totalDevido = clientes.reduce((acc, c) => acc + Number(c.saldoDevedor), 0);

    return {
      totalClientes: clientes.length,
      totalDevido,
      clientes,
    };
  }

  async resumoCompleto(estabelecimentoId: string) {
    const [resumo, recebimentosMes, ticketMedio, inadimplencia] = await Promise.all([
      this.resumoGeral(estabelecimentoId),
      this.recebimentosMes(estabelecimentoId),
      this.ticketMedio(estabelecimentoId),
      this.relatorioInadimplencia(estabelecimentoId),
    ]);

    return {
      ...resumo,
      recebimentosMes: recebimentosMes.total,
      ticketMedio: ticketMedio.ticketMedio,
      totalInadimplentes: inadimplencia.totalClientes,
      valorInadimplencia: inadimplencia.totalDevido,
    };
  }
}
