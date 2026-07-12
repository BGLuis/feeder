import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../feeds/entities/article.entity';
import { Source } from '../feeds/entities/source.entity';
import { Subscription } from '../feeds/entities/subscription.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Source, Subscription, Webhook]),
    BullModule.registerQueue({
      name: 'scraper',
    }),
    BullModule.registerQueue({
      name: 'webhooks',
    }),
  ],
  controllers: [ScraperController],
  providers: [ScraperService, ScraperProcessor],
})
export class ScraperModule {}
