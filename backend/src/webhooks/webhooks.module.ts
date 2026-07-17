import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { Webhook } from './entities/webhook.entity';
import { AuthModule } from '../auth/auth.module';
import { WebhooksProcessor } from './webhooks.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook]),
    AuthModule,
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor],
})
export class WebhooksModule {}
