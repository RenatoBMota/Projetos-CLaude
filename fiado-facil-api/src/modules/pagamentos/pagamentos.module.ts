import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagamentosService } from './pagamentos.service';
import { PagamentosController } from './pagamentos.controller';
import { Pagamento } from './entities/pagamento.entity';
import { ClientesModule } from '../clientes/clientes.module';

@Module({
  imports: [TypeOrmModule.forFeature([Pagamento]), ClientesModule],
  providers: [PagamentosService],
  controllers: [PagamentosController],
  exports: [PagamentosService, TypeOrmModule],
})
export class PagamentosModule {}
