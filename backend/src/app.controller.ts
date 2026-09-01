import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Minimal liveness endpoint. The heavyweight vendored HealthModule (Kafka /
  // Meilisearch / RustFS checks, needs kafkajs) is not wired into this app.
  @Get('health')
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }
}
