import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstabelecimentosService } from './estabelecimentos.service';
import { EstabelecimentosController } from './estabelecimentos.controller';
import { Estabelecimento } from './entities/estabelecimento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estabelecimento])],
  providers: [EstabelecimentosService],
  controllers: [EstabelecimentosController],
  exports: [EstabelecimentosService, TypeOrmModule],
})
export class EstabelecimentosModule {}
