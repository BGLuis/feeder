import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source } from './entities/source.entity';

export const DEFAULT_SCHEDULER_BATCH_SIZE = 100;

@Injectable()
export class FeedsScheduler {
  private readonly logger = new Logger(FeedsScheduler.name);
  batchSize: number = DEFAULT_SCHEDULER_BATCH_SIZE;

  constructor(
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectQueue('scraper') private scraperQueue: Queue,
  ) {}

  @Cron('0,30 * * * *') // Runs every 30 minutes
  async scheduleFeeds() {
    this.logger.log('Running Master Scheduler for Feeds...');
    const now = new Date();

    // Fetch sources that have at least one subscription and need fetching
    const sourcesToFetch = await this.sourceRepository
      .createQueryBuilder('source')
      .innerJoin('source.subscriptions', 'subscription')
      .where('(source.nextFetchAt <= :now OR source.nextFetchAt IS NULL)', { now })
      .distinct(true)
      .take(this.batchSize)
      .getMany();

    if (sourcesToFetch.length === 0) {
      this.logger.log('No feeds to schedule at this time.');
      return;
    }

    this.logger.log(`Found ${sourcesToFetch.length} feeds to schedule.`);

    // 15 seconds spacing between jobs to prevent spikes
    const SPACING_MS = 15000;

    for (let i = 0; i < sourcesToFetch.length; i++) {
      const source = sourcesToFetch[i];
      const jobId = `sched:fetch:${source.id}`;

      // If a previous job failed, remove it so BullMQ does not ignore the re-added job
      const existingJob = await this.scraperQueue.getJob(jobId);
      if (existingJob) {
        const isFailed =
          typeof existingJob.isFailed === 'function'
            ? await existingJob.isFailed()
            : (await existingJob.getState?.()) === 'failed';
        if (isFailed) {
          await existingJob.remove();
        }
      }

      // Deterministic jobId: if a previous run's job for this source is still
      // waiting/delayed, BullMQ ignores the duplicate instead of piling on.
      await this.scraperQueue.add(
        'fetch',
        { url: source.url, sourceId: source.id },
        { delay: i * SPACING_MS, jobId },
      );
      this.logger.log(
        `Queued source ${source.id} (${source.url}) with delay ${i * SPACING_MS}ms`,
      );
    }
  }
}
