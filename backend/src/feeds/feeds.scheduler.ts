import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Source } from './entities/source.entity';

export const DEFAULT_SCHEDULER_BATCH_SIZE = 100;

@Injectable()
export class FeedsScheduler {
	private readonly logger = new Logger(FeedsScheduler.name);
	readonly batchSize: number = DEFAULT_SCHEDULER_BATCH_SIZE;

	constructor(
		@InjectRepository(Source) private sourceRepository: Repository<Source>,
		@InjectQueue('scraper') private scraperQueue: Queue,
	) {}

	@Cron('0,30 * * * *') // Runs every 30 minutes
	async scheduleFeeds() {
		this.logger.log('Running Master Scheduler for Feeds...');
		const now = new Date();

		// Fetch sources that have at least one subscription and need fetching,
		// prioritizing most overdue sources (nulls first, then oldest nextFetchAt)
		const sourcesToFetch = await this.sourceRepository
			.createQueryBuilder('source')
			.innerJoin('source.subscriptions', 'subscription')
			.where(
				'(source.nextFetchAt <= :now OR source.nextFetchAt IS NULL)',
				{
					now,
				},
			)
			.distinct(true)
			.orderBy(
				'CASE WHEN source.nextFetchAt IS NULL THEN 0 ELSE 1 END',
				'ASC',
			)
			.addOrderBy('source.nextFetchAt', 'ASC')
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

			// If a previous job is finished (completed or failed), remove it so BullMQ does not ignore the re-added job.
			// Active / delayed / waiting jobs are preserved to deduplicate in-flight runs.
			const existingJob = await this.scraperQueue.getJob(jobId);
			if (existingJob) {
				const state = await existingJob.getState();
				if (state === 'completed' || state === 'failed') {
					await existingJob.remove().catch(() => undefined);
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
