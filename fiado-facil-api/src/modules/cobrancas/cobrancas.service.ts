import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { Cobranca, TipoCobranca, StatusCobranca, CanalCobranca } from './entities/cobranca.entity';
import { WhatsappService } from './whatsapp.service';
import { Cliente, StatusCliente } from '../clientes/entities/cliente.entity';
import { Compra, StatusCompra } from '../compras/entities/compra.entity';

@Injectable()
export class CobrancasService {
  private readonly logger = new Logger(CobrancasService.name);

  constructor(
    @InjectRepository(Cobranca)
    private cobrancaRepository: Repository<Cobranca>,
    @InjectRepository(Cliente)
    private clienteRepository: Repository<Cliente>,
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    private whatsappService: WhatsappService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processarCobrancasAutomaticas() {
    this.logger.log('Iniciando processamento de cobranças automáticas...');

    const hoje = dayjs();

    const comprasPendentes = await this.compraRepository.find({
      where: { status: StatusCompra.PENDENTE },
      relations: ['cliente', 'cliente.estabelecimento'],
    });

    for (const compra of comprasPendentes) {
      if (!compra.dataVencimento || !compra.cliente) continue;

      const vencimento = dayjs(compra.dataVencimento);
      const diasParaVencer = vencimento.diff(hoje, 'day');
      const diasEmAtraso = hoje.diff(vencimento, 'day');

      let tipo: TipoCobranca | null = null;

      if (diasParaVencer === 7) tipo = TipoCobranca.LEMBRETE_7_DIAS;
      else if (diasParaVencer === 3) tipo = TipoCobranca.LEMBRETE_3_DIAS;
      else if (diasParaVencer === 0) tipo = TipoCobranca.VENCIMENTO_HOJE;
      else if (diasEmAtraso === 5) tipo = TipoCobranca.ATRASO_5_DIAS;
      else if (diasEmAtraso === 15) tipo = TipoCobranca.ATRASO_15_DIAS;
      else if (diasEmAtraso === 30) tipo = TipoCobranca.ATRASO_30_DIAS;

      if (!tipo) continue;

      const jaEnviada = await this.cobrancaRepository.findOne({
        where: {
          clienteId: compra.clienteId,
          tipo,
          estabelecimentoId: compra.estabelecimentoId,
          status: StatusCobranca.ENVIADA,
        },
      });
      if (jaEnviada) continue;

      await this.enviarCobranca(compra.cliente, tipo, compra.estabelecimentoId);

      if (diasEmAtraso >= 30) {
        await this.clienteRepository.update(compra.clienteId, {
          status: StatusCliente.INADIMPLENTE,
        });
      }
    }

    this.logger.log('Cobranças automáticas processadas.');
  }

  async enviarCobranca(cliente: Cliente, tipo: TipoCobranca, estabelecimentoId: string): Promise<Cobranca> {
    const numero = cliente.whatsapp || cliente.telefone;
    if (!numero) {
      return this.cobrancaRepository.save(
        this.cobrancaRepository.create({
          clienteId: cliente.id,
          tipo,
          status: StatusCobranca.FALHOU,
          canal: CanalCobranca.WHATSAPP,
          erroDetalhes: 'Cliente sem número de WhatsApp',
          estabelecimentoId,
          valorDevido: cliente.saldoDevedor,
        }),
      );
    }

    const vencimento = dayjs().add(7, 'day').format('DD/MM/YYYY');
    const mensagem = this.whatsappService.montarMensagemCobranca({
      nomeCliente: cliente.nome,
      nomeEstabelecimento: cliente.estabelecimento?.nome || 'Estabelecimento',
      saldo: Number(cliente.saldoDevedor),
      vencimento,
      tipo,
    });

    const enviado = await this.whatsappService.enviarMensagem(
      numero,
      mensagem,
      cliente.estabelecimento?.whatsappApiUrl,
      cliente.estabelecimento?.whatsappApiKey,
      cliente.estabelecimento?.whatsappInstance,
    );

    return this.cobrancaRepository.save(
      this.cobrancaRepository.create({
        clienteId: cliente.id,
        tipo,
        status: enviado ? StatusCobranca.ENVIADA : StatusCobranca.FALHOU,
        canal: CanalCobranca.WHATSAPP,
        mensagem,
        estabelecimentoId,
        valorDevido: cliente.saldoDevedor,
      }),
    );
  }

  async listar(estabelecimentoId: string, clienteId?: string, page = 1, limit = 20) {
    const where: any = { estabelecimentoId };
    if (clienteId) where.clienteId = clienteId;

    const [cobrancas, total] = await this.cobrancaRepository.findAndCount({
      where,
      relations: ['cliente'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: cobrancas, total, page, lastPage: Math.ceil(total / limit) };
  }

  async enviarCobrancaManual(clienteId: string, estabelecimentoId: string): Promise<Cobranca> {
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId, estabelecimentoId },
      relations: ['estabelecimento'],
    });
    return this.enviarCobranca(cliente, TipoCobranca.MANUAL, estabelecimentoId);
  }
}
