import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { EstabelecimentosModule } from './modules/estabelecimentos/estabelecimentos.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ComprasModule } from './modules/compras/compras.module';
import { PagamentosModule } from './modules/pagamentos/pagamentos.module';
import { CobrancasModule } from './modules/cobrancas/cobrancas.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60),
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    EstabelecimentosModule,
    ClientesModule,
    ComprasModule,
    PagamentosModule,
    CobrancasModule,
    DashboardModule,
  ],
})
export class AppModule {}
