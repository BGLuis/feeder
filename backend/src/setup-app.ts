import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Applies global pipes and configuration shared between bootstrap (main.ts)
 * and e2e test setups.
 */
export function setupApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  return app;
}
