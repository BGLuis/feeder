import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source } from './entities/source.entity';

@Injectable()
export class FeedsScheduler {
  private readonly logger = new Logger(FeedsScheduler.name);

  constructor(
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectQueue('scraper') private scraperQueue: Queue,
  ) {}

  @Cron('0,30 * * * *') // Runs every 30 minutes
  async scheduleFeeds() {
    this.logger.log('Running Master Scheduler for Feeds...');
    const now = new Date();

    // Fetch sources that need fetching
    const sourcesToFetch = await this.sourceRepository.find({
      where: [{ nextFetchAt: LessThanOrEqual(now) }, { nextFetchAt: IsNull() }],
    });

    if (sourcesToFetch.length === 0) {
      this.logger.log('No feeds to schedule at this time.');
      return;
    }

    this.logger.log(`Found ${sourcesToFetch.length} feeds to schedule.`);

    // 15 seconds spacing between jobs to prevent spikes
    const SPACING_MS = 15000;

    for (let i = 0; i < sourcesToFetch.length; i++) {
      const source = sourcesToFetch[i];
      await this.scraperQueue.add(
        'fetch',
        { url: source.url, sourceId: source.id },
        { delay: i * SPACING_MS },
      );
      this.logger.log(
        `Queued source ${source.id} (${source.url}) with delay ${i * SPACING_MS}ms`,
      );
    }
  }
}
