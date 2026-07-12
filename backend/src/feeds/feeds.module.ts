import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { Source } from './entities/source.entity';
import { Subscription } from './entities/subscription.entity';
import { Article } from './entities/article.entity';
import { UserArticleState } from './entities/user-article-state.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Source, Subscription, Article, UserArticleState]),
    BullModule.registerQueue({
      name: 'scraper',
    }),
    AuthModule
  ],
  controllers: [FeedsController],
  providers: [FeedsService]
})
export class FeedsModule {}
