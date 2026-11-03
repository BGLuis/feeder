import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    subscriptionRepository = {
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
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
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

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
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

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

    it('rejects with ConflictException (409) and creates no row on duplicate subscription', async () => {
      const existing = { id: 'src-1', url: 'http://rss.com', isPrivate: false };
      sourceRepository.findOne.mockResolvedValueOnce(existing);
      subscriptionRepository.findOne.mockResolvedValueOnce({
        id: 'sub-existing',
        user: { id: 'user-1' },
        source: existing,
      });

      await expect(
        service.subscribe('user-1', {
          url: 'http://rss.com',
          name: 'Feed',
          isPrivate: false,
        }),
      ).rejects.toThrow(ConflictException);

      expect(subscriptionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('throws NotFoundException when subscription is not found', async () => {
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateSubscription('user-1', 'missing-id', {
          customName: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

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

  describe('refreshSubscription', () => {
    it('throws NotFoundException when subscription is not found', async () => {
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.refreshSubscription('user-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('enqueues fetch for found subscription', async () => {
      const sub = {
        id: 'sub-1',
        source: { id: 'src-1', url: 'https://example.com/rss' },
        authStorageState: 'state-1',
      };
      subscriptionRepository.findOne.mockResolvedValueOnce(sub);

      const res = await service.refreshSubscription('user-1', 'sub-1');
      expect(res).toEqual({ success: true });
      expect(scraperQueue.add).toHaveBeenCalledWith('fetch', {
        url: sub.source.url,
        sourceId: sub.source.id,
        authStorageState: 'state-1',
      });
    });
  });

  describe('deleteSubscription', () => {
    it('throws NotFoundException when subscription is not found', async () => {
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.deleteSubscription('user-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deleting the last subscription of a public source does not delete the source', async () => {
      const publicSource = {
        id: 'src-public',
        url: 'https://public.example/feed',
        isPrivate: false,
      };
      subscriptionRepository.findOne.mockResolvedValueOnce({
        id: 'sub-pub',
        source: publicSource,
      });

      await service.deleteSubscription('user-1', 'sub-pub');

      expect(subscriptionRepository.delete).toHaveBeenCalledWith('sub-pub');
      expect(sourceRepository.delete).not.toHaveBeenCalled();
    });

    it('deleting the only subscription of a private source deletes that Source row', async () => {
      const privateSource = {
        id: 'src-priv',
        url: 'https://private.example/feed',
        isPrivate: true,
      };
      subscriptionRepository.findOne.mockResolvedValueOnce({
        id: 'sub-priv',
        source: privateSource,
      });
      subscriptionRepository.count.mockResolvedValueOnce(0); // 0 remaining owners

      await service.deleteSubscription('user-1', 'sub-priv');

      expect(subscriptionRepository.delete).toHaveBeenCalledWith('sub-priv');
      expect(sourceRepository.delete).toHaveBeenCalledWith('src-priv');
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

    it('filters whole tag with FIND_IN_SET so news does not match newsletter', async () => {
      const subQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      subscriptionRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(subQb);

      await service.getArticles('user-1', { tag: 'news' });

      expect(subQb.andWhere).toHaveBeenCalledWith(
        'FIND_IN_SET(:tag, subscription.tags) > 0',
        { tag: 'news' },
      );
    });
  });

  describe('refreshSubscription', () => {
    it('throws when subscription is not found', async () => {
      subscriptionRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.refreshSubscription('user-1', 'sub-missing'),
      ).rejects.toThrow('Subscription not found');
    });

    it('enqueues fetch when subscription is found and returns success', async () => {
      const sub = {
        id: 'sub-1',
        authStorageState: 'enc-state',
        source: { id: 'src-1', url: 'https://example.com/feed.xml' },
      };
      subscriptionRepository.findOne.mockResolvedValueOnce(sub);

      const result = await service.refreshSubscription('user-1', 'sub-1');

      expect(result).toEqual({ success: true });
      expect(scraperQueue.add).toHaveBeenCalledWith(
        'fetch',
        expect.objectContaining({
          sourceId: 'src-1',
          url: 'https://example.com/feed.xml',
          authStorageState: 'enc-state',
        }),
      );
    });
  });

  describe('deleteSubscription', () => {
    it('calls subscriptionRepository.delete with id and userId', async () => {
      subscriptionRepository.delete = jest
        .fn()
        .mockResolvedValueOnce({ affected: 1 });

      const result = await service.deleteSubscription('user-1', 'sub-1');

      expect(subscriptionRepository.delete).toHaveBeenCalledWith({
        id: 'sub-1',
        user: { id: 'user-1' },
      });
      expect(result).toEqual({ affected: 1 });
    });
  });
});
