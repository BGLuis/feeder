import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Public()
@Controller()
export class AppController implements OnModuleDestroy {
  private redisClient: Redis;

  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Optional() @Inject('REDIS_HEALTH_CLIENT') injectedRedis?: Redis,
  ) {
    if (injectedRedis) {
      this.redisClient = injectedRedis;
    } else {
      this.redisClient = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      this.redisClient.on('error', () => {});
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit().catch(() => undefined);
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
      const pong = await this.redisClient.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      return { status: 'ok', uptime: process.uptime(), db: 'up', redis: 'up' };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Health check failed',
          uptime: process.uptime(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
