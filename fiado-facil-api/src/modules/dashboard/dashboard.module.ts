import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Compra } from '../compras/entities/compra.entity';
import { Pagamento } from '../pagamentos/entities/pagamento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, Compra, Pagamento])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
