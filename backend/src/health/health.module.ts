import { RedisModule } from '@redis/redis.module';
import { AppConfigModule } from '@config/app-config.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule, AppConfigModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
