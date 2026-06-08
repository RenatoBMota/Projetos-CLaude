import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estabelecimento } from './entities/estabelecimento.entity';
import { CreateEstabelecimentoDto } from './dto/create-estabelecimento.dto';

@Injectable()
export class EstabelecimentosService {
  constructor(
    @InjectRepository(Estabelecimento)
    private estabelecimentoRepository: Repository<Estabelecimento>,
  ) {}

  async criar(createDto: CreateEstabelecimentoDto): Promise<Estabelecimento> {
    const existe = await this.estabelecimentoRepository.findOne({
      where: { cnpj: createDto.cnpj },
    });
    if (existe) throw new ConflictException('CNPJ já cadastrado');

    const estab = this.estabelecimentoRepository.create(createDto);
    return this.estabelecimentoRepository.save(estab);
  }

  async buscarPorId(id: string): Promise<Estabelecimento> {
    const estab = await this.estabelecimentoRepository.findOne({ where: { id } });
    if (!estab) throw new NotFoundException('Estabelecimento não encontrado');
    return estab;
  }

  async atualizar(id: string, updateDto: Partial<CreateEstabelecimentoDto>): Promise<Estabelecimento> {
    const estab = await this.buscarPorId(id);
    Object.assign(estab, updateDto);
    return this.estabelecimentoRepository.save(estab);
  }

  async listar(): Promise<Estabelecimento[]> {
    return this.estabelecimentoRepository.find({ where: { ativo: true } });
  }
}
