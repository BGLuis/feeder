import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { FeedsScheduler } from './feeds.scheduler';
import { Source } from './entities/source.entity';

describe('FeedsScheduler', () => {
  let scheduler: FeedsScheduler;
  let sourceRepository: any;
  let scraperQueue: any;
  let qb: any;

  beforeEach(async () => {
    qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    sourceRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    scraperQueue = {
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedsScheduler,
        { provide: getRepositoryToken(Source), useValue: sourceRepository },
        { provide: getQueueToken('scraper'), useValue: scraperQueue },
      ],
    }).compile();

    scheduler = module.get<FeedsScheduler>(FeedsScheduler);
  });

  afterEach(() => jest.clearAllMocks());

  it('asserts only sources with at least one subscription are queried and enqueued', async () => {
    const subscribedSource = {
      id: 'src-1',
      url: 'https://subscribed.example/feed',
    };
    qb.getMany.mockResolvedValueOnce([subscribedSource]);

    await scheduler.scheduleFeeds();

    expect(qb.innerJoin).toHaveBeenCalledWith(
      'source.subscriptions',
      'subscription',
    );
    expect(scraperQueue.add).toHaveBeenCalledTimes(1);
    expect(scraperQueue.add).toHaveBeenCalledWith(
      'fetch',
      { url: subscribedSource.url, sourceId: subscribedSource.id },
      expect.objectContaining({ jobId: 'sched:fetch:src-1' }),
    );
  });

  it('enqueues at most the configured batch size per run with 500 due sources', async () => {
    const batchSize = 100;
    const sources = Array.from({ length: batchSize }, (_, i) => ({
      id: `src-${i}`,
      url: `https://example.com/feed/${i}`,
    }));
    qb.getMany.mockResolvedValueOnce(sources);

    await scheduler.scheduleFeeds();

    expect(qb.take).toHaveBeenCalledWith(100);
    expect(scraperQueue.add).toHaveBeenCalledTimes(batchSize);
  });

  it('asserts that a source whose previous job failed is enqueued again on the next run', async () => {
    const source = { id: 'src-failed', url: 'https://failed.example/feed' };
    qb.getMany.mockResolvedValueOnce([source]);

    const failedJob = {
      id: 'sched:fetch:src-failed',
      isFailed: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    scraperQueue.getJob.mockResolvedValueOnce(failedJob);

    await scheduler.scheduleFeeds();

    expect(failedJob.remove).toHaveBeenCalled();
    expect(scraperQueue.add).toHaveBeenCalledWith(
      'fetch',
      { url: source.url, sourceId: source.id },
      expect.objectContaining({ jobId: 'sched:fetch:src-failed' }),
    );
  });

  it('asserts that the scheduler job data still contains no authStorageState', async () => {
    const source = { id: 'src-private', url: 'https://private.example/feed' };
    qb.getMany.mockResolvedValueOnce([source]);

    await scheduler.scheduleFeeds();

    expect(scraperQueue.add).toHaveBeenCalledWith(
      'fetch',
      expect.not.objectContaining({ authStorageState: expect.anything() }),
      expect.anything(),
    );
    const addedPayload = scraperQueue.add.mock.calls[0][1];
    expect(addedPayload).toEqual({ url: source.url, sourceId: source.id });
    expect(addedPayload.authStorageState).toBeUndefined();
  });
});
