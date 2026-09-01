import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Playwright / BullMQ worker code can reject from detached promises. Node 24
  // treats an unhandled rejection as fatal by default — for a long-running API
  // that also hosts scraper workers, log it loudly but keep serving.
  process.on('unhandledRejection', (reason) => {
    logger.error(
      `Unhandled promise rejection: ${
        reason instanceof Error ? reason.stack : String(reason)
      }`,
    );
  });

  app.use(helmet());

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  if ((process.env.ENABLE_SWAGGER ?? 'true') !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Feeder API')
      .setDescription('The Feeder API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
