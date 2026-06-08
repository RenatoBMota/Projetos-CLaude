import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CobrancasService } from './cobrancas.service';
import { CobrancasController } from './cobrancas.controller';
import { WhatsappService } from './whatsapp.service';
import { Cobranca } from './entities/cobranca.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Compra } from '../compras/entities/compra.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cobranca, Cliente, Compra])],
  providers: [CobrancasService, WhatsappService],
  controllers: [CobrancasController],
  exports: [WhatsappService],
})
export class CobrancasModule {}
