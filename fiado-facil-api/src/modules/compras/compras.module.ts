import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { Compra } from './entities/compra.entity';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Compra]), ClientesModule],
  providers: [ComprasService],
  controllers: [ComprasController],
  exports: [ComprasService, TypeOrmModule],
})
export class ComprasModule {}
