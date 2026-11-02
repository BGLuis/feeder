import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { FeedsScheduler } from './feeds.scheduler';
import { Source } from './entities/source.entity';

describe('FeedsScheduler', () => {
  let scheduler: FeedsScheduler;
  let mockSourceRepository: { find: jest.Mock };
  let mockScraperQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockSourceRepository = {
      find: jest.fn(),
    };
    mockScraperQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedsScheduler,
        {
          provide: getRepositoryToken(Source),
          useValue: mockSourceRepository,
        },
        {
          provide: getQueueToken('scraper'),
          useValue: mockScraperQueue,
        },
      ],
    }).compile();

    scheduler = module.get<FeedsScheduler>(FeedsScheduler);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('should do nothing when no feeds need scheduling', async () => {
    mockSourceRepository.find.mockResolvedValue([]);

    await scheduler.scheduleFeeds();

    expect(mockSourceRepository.find).toHaveBeenCalledWith({
      where: expect.arrayContaining([
        expect.objectContaining({ nextFetchAt: expect.anything() }),
      ]),
    });
    expect(mockScraperQueue.add).not.toHaveBeenCalled();
  });

  it('should schedule feeds with incremental delay and deterministic jobId', async () => {
    const mockSources = [
      { id: 'source-1', url: 'https://example.com/rss1' },
      { id: 'source-2', url: 'https://example.com/rss2' },
    ];
    mockSourceRepository.find.mockResolvedValue(mockSources);

    await scheduler.scheduleFeeds();

    expect(mockScraperQueue.add).toHaveBeenCalledTimes(2);
    expect(mockScraperQueue.add).toHaveBeenNthCalledWith(
      1,
      'fetch',
      { url: 'https://example.com/rss1', sourceId: 'source-1' },
      { delay: 0, jobId: 'sched:fetch:source-1' },
    );
    expect(mockScraperQueue.add).toHaveBeenNthCalledWith(
      2,
      'fetch',
      { url: 'https://example.com/rss2', sourceId: 'source-2' },
      { delay: 15000, jobId: 'sched:fetch:source-2' },
    );
  });
});
