import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig } from './config/winston.config';

async function bootstrap() {
  const logger = WinstonModule.createLogger(winstonConfig);

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Surat Embroidery Micro-ERP Backend API')
    .setDescription(
      `Multi-Tenant Backend for Surat Embroidery Job-Work Cluster (GST SAC 9988 - 5% GST).
      Features:
      - Multi-Tenancy Scoping by Company ID (UUID)
      - RBAC & CASL-style Granular Permissions
      - Munim (Accountant) Double-Handshake Collaboration
      - SAC 9988 Stitch Billing Calculation Engine ((Stitches / 1000) * Rate * Heads)
      - Fabric Shrinkage Reconciliation (>3% Warning)
      - Karigar Fortnightly Wage Hisab
      - Tally Prime XML Export
      - PDF Generation via Puppeteer microservice
      - Winston Logging & Financial Audit Trails`,
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Surat Embroidery Backend started on port ${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
