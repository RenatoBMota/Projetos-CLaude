import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(prefix);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fiado Fácil API')
    .setDescription('API de controle de crediário para pequenos comércios')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação')
    .addTag('estabelecimentos', 'Gestão de estabelecimentos')
    .addTag('clientes', 'Gestão de clientes')
    .addTag('compras', 'Registro de compras fiadas')
    .addTag('pagamentos', 'Registro de pagamentos')
    .addTag('cobrancas', 'Cobranças automáticas')
    .addTag('dashboard', 'Indicadores e relatórios')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  console.log(`🚀 Fiado Fácil API rodando em: http://localhost:${port}/${prefix}`);
  console.log(`📚 Documentação disponível em: http://localhost:${port}/docs`);
}

bootstrap();
