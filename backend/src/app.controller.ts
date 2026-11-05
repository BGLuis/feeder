import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Public()
@Controller()
export class AppController implements OnModuleDestroy {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    @Inject('REDIS_HEALTH_CLIENT') private readonly redisClient: Redis,
  ) {}

  async onModuleDestroy() {
    await this.redisClient.quit().catch(() => undefined);
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    let dbStatus = 'down';
    let redisStatus = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'up';
    } catch (error) {
      this.logger.error('Database health check failed', error as Error);
    }

    try {
      const pong = await this.redisClient.ping();
      if (pong === 'PONG') {
        redisStatus = 'up';
      }
    } catch (error) {
      this.logger.error('Redis health check failed', error as Error);
    }

    if (dbStatus !== 'up' || redisStatus !== 'up') {
      throw new HttpException(
        {
          status: 'error',
          uptime: process.uptime(),
          db: dbStatus,
          redis: redisStatus,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
      redis: redisStatus,
    };
  }
}
