import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { FeedsService } from './feeds.service';
import { Source, SourceType } from './entities/source.entity';
import { Subscription } from './entities/subscription.entity';

describe('FeedsService', () => {
  let service: FeedsService;
  let sourceRepository: any;
  let subscriptionRepository: any;
  let scraperQueue: any;

  beforeEach(async () => {
    sourceRepository = {
      findOne: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((s) => Promise.resolve({ id: 's-new', ...s })),
    };
    subscriptionRepository = {
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };
    scraperQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedsService,
        { provide: getRepositoryToken(Source), useValue: sourceRepository },
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
        { provide: getQueueToken('scraper'), useValue: scraperQueue },
      ],
    }).compile();

    service = module.get<FeedsService>(FeedsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('subscribe', () => {
    it('reuses an existing public Source and enqueues a fetch', async () => {
      const existing = { id: 'src-1', url: 'http://rss.com', isPrivate: false };
      sourceRepository.findOne.mockResolvedValueOnce(existing);

      await service.subscribe('user-1', {
        url: 'http://rss.com',
        name: 'Feed',
        isPrivate: false,
      });

      expect(sourceRepository.save).not.toHaveBeenCalled();
      expect(scraperQueue.add).toHaveBeenCalledWith(
        'fetch',
        expect.objectContaining({ sourceId: 'src-1', url: 'http://rss.com' }),
      );
    });

    it('encrypts authStorageState for a private feed before persisting it', async () => {
      await service.subscribe('user-1', {
        url: 'http://private.com',
        name: 'Private',
        isPrivate: true,
        authStorageState: JSON.stringify({ cookies: [] }),
      });

      const savedSub = subscriptionRepository.save.mock.calls[0][0];
      expect(savedSub.authStorageState).toEqual(expect.stringMatching(/^v1\./));
      expect(savedSub.authStorageState).not.toContain('cookies');
    });
  });

  describe('updateSubscription', () => {
    it('copies a shared Source instead of mutating it in place', async () => {
      const sharedSource = {
        id: 'src-shared',
        url: 'http://old.com',
        name: 'Shared',
        isPrivate: false,
        selectors: null,
      };
      subscriptionRepository.findOne.mockResolvedValueOnce({
        id: 'sub-1',
        source: sharedSource,
      });
      subscriptionRepository.count.mockResolvedValueOnce(3); // other co-subscribers

      await service.updateSubscription('user-1', 'sub-1', {
        url: 'http://new.com',
      });

      // original shared row untouched...
      expect(sourceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'http://new.com', isPrivate: true }),
      );
      expect(sharedSource.url).toBe('http://old.com');
    });

    it('edits the Source in place when it is private and solely owned', async () => {
      const ownSource = {
        id: 'src-own',
        url: 'http://old.com',
        name: 'Mine',
        isPrivate: true,
        selectors: null,
        type: SourceType.RSS,
      };
      subscriptionRepository.findOne.mockResolvedValueOnce({
        id: 'sub-1',
        source: ownSource,
      });
      subscriptionRepository.count.mockResolvedValueOnce(1);

      await service.updateSubscription('user-1', 'sub-1', {
        url: 'http://new.com',
      });

      expect(ownSource.url).toBe('http://new.com');
    });
  });

  describe('getArticles', () => {
    it('searches title/content (never a non-existent description column)', async () => {
      const articleQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      const subQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ source: { id: 'src-1' } }]),
      };
      subscriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(subQb);
      sourceRepository.manager = {
        createQueryBuilder: jest.fn().mockReturnValue(articleQb),
      };

      await service.getArticles('user-1', { search: 'term', limit: 9999 });

      const sql = articleQb.andWhere.mock.calls[0][0] as string;
      expect(sql).toContain('article.content');
      expect(sql).not.toContain('description');
      // limit is clamped to 100
      expect(articleQb.take).toHaveBeenCalledWith(100);
    });
  });
});
