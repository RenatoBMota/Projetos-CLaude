import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as xml2js from 'xml2js';
import * as dayjs from 'dayjs';
import { Compra, OrigemCompra, StatusCompra } from './entities/compra.entity';
import { CreateCompraDto, ImportarXmlDto } from './dto/create-compra.dto';
import { ClientesService } from '../clientes/clientes.service';
import { StatusCliente } from '../clientes/entities/cliente.entity';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    private clientesService: ClientesService,
  ) {}

  async registrar(createDto: CreateCompraDto, estabelecimentoId: string, operadorId: string): Promise<Compra> {
    const cliente = await this.clientesService.buscarPorId(createDto.clienteId, estabelecimentoId);

    if (cliente.status === StatusCliente.BLOQUEADO) {
      throw new BadRequestException('Cliente bloqueado. Operação não permitida.');
    }

    const limiteDisponivel = Number(cliente.limiteCredito) - Number(cliente.saldoDevedor);
    if (createDto.valor > limiteDisponivel) {
      throw new BadRequestException(
        `Valor excede o limite disponível de R$ ${limiteDisponivel.toFixed(2)}`,
      );
    }

    const dataVencimento = createDto.dataVencimento
      ? new Date(createDto.dataVencimento)
      : dayjs(createDto.dataCompra).add(cliente.prazoPagamentoDias, 'day').toDate();

    const compra = this.compraRepository.create({
      ...createDto,
      dataVencimento,
      estabelecimentoId,
      operadorId,
    });

    const saved = await this.compraRepository.save(compra);
    await this.clientesService.atualizarSaldo(cliente.id, createDto.valor);
    return saved;
  }

  async importarXml(importarDto: ImportarXmlDto, estabelecimentoId: string, operadorId: string): Promise<Compra> {
    const dados = await this.parsearXmlNfe(importarDto.xml);

    const createDto: CreateCompraDto = {
      clienteId: importarDto.clienteId,
      valor: dados.valorTotal,
      dataCompra: dayjs().format('YYYY-MM-DD'),
      observacao: `NF-e ${dados.numeroNota}`,
      origem: OrigemCompra.XML_NFCE,
    };

    const compra = await this.registrar(createDto, estabelecimentoId, operadorId);

    await this.compraRepository.update(compra.id, {
      numeroNota: dados.numeroNota,
      chaveNfe: dados.chaveNfe,
      itensNfe: dados.itens,
    });

    return this.compraRepository.findOne({ where: { id: compra.id } });
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
      where.dataCompra = Between(new Date(dataInicio), new Date(dataFim));
    }

    const [compras, total] = await this.compraRepository.findAndCount({
      where,
      relations: ['cliente'],
      order: { dataCompra: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: compras, total, page, lastPage: Math.ceil(total / limit) };
  }

  async buscarPorId(id: string, estabelecimentoId: string): Promise<Compra> {
    const compra = await this.compraRepository.findOne({
      where: { id, estabelecimentoId },
      relations: ['cliente', 'operador'],
    });
    if (!compra) throw new NotFoundException('Compra não encontrada');
    return compra;
  }

  async cancelar(id: string, estabelecimentoId: string): Promise<Compra> {
    const compra = await this.buscarPorId(id, estabelecimentoId);
    if (compra.status === StatusCompra.QUITADA) {
      throw new BadRequestException('Não é possível cancelar uma compra já quitada');
    }

    const valorRestante = Number(compra.valor) - Number(compra.valorPago);
    await this.clientesService.atualizarSaldo(compra.clienteId, -valorRestante);
    compra.status = StatusCompra.CANCELADA;
    return this.compraRepository.save(compra);
  }

  private async parsearXmlNfe(xml: string) {
    const parser = new xml2js.Parser({ explicitArray: false });
    const resultado = await parser.parseStringPromise(xml);

    const nfeProc = resultado.nfeProc || resultado;
    const nfe = nfeProc.NFe || nfeProc;
    const infNFe = nfe.infNFe;
    const total = infNFe.total?.ICMSTot;
    const ide = infNFe.ide;
    const det = infNFe.det;

    const itens = Array.isArray(det) ? det : [det];

    return {
      numeroNota: ide?.nNF || '',
      chaveNfe: infNFe?.$?.Id?.replace('NFe', '') || '',
      valorTotal: parseFloat(total?.vNF || '0'),
      itens: itens.map((item: any) => ({
        descricao: item.prod?.xProd,
        quantidade: parseFloat(item.prod?.qCom || '0'),
        valorUnitario: parseFloat(item.prod?.vUnCom || '0'),
        valorTotal: parseFloat(item.prod?.vProd || '0'),
      })),
    };
  }
}
