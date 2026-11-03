import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { envValidationSchema } from './config/env.validation';
import { deduplicateSubscriptionsPreSync } from './database/deduplicate-subscriptions';
import { FeedsModule } from './feeds/feeds.module';
import { LoggingModule } from './logging/logging.module';
import { ScraperModule } from './scraper/scraper.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV', 'development') === 'production';
        const dbHost = configService.get<string>('DB_HOST', 'localhost');
        const dbPort = configService.get<number>('DB_PORT', 3306);
        const dbUser = configService.get<string>('DB_USER', 'root');
        const dbPassword = configService.get<string>(
          'DB_PASSWORD',
          'rootpassword',
        );
        const dbName = configService.get<string>('DB_NAME', 'feeder');

        if (!isProduction) {
          await deduplicateSubscriptionsPreSync({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName,
          });
        }

        return {
          type: 'mysql',
          host: dbHost,
          port: dbPort,
          username: dbUser,
          password: dbPassword,
          database: dbName,
          autoLoadEntities: true,
          // Auto-DDL only outside production; prod needs a real migration workflow.
          synchronize: !isProduction,
          migrationsRun: isProduction,
          migrations: [`${__dirname}/migrations/*{.ts,.js}`],
          timezone: 'Z',
          maxQueryExecutionTime: 5_000,
          extra: { connectionLimit: 10 },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 3_600, count: 1_000 },
          removeOnFail: { age: 86_400 },
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    FeedsModule,
    ScraperModule,
    WebhooksModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_HEALTH_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
        });
        client.on('error', () => {});
        return client;
      },
      inject: [ConfigService],
    },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
