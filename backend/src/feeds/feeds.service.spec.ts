import { Test, TestingModule } from '@nestjs/testing';
import { FeedsService } from './feeds.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Source } from './entities/source.entity';
import { Subscription } from './entities/subscription.entity';

describe('FeedsService', () => {
  let service: FeedsService;
  let sourceRepository: any;
  let subscriptionRepository: any;

  beforeEach(async () => {
    sourceRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((src) => Promise.resolve(src)),
    };
    subscriptionRepository = {
      save: jest.fn().mockImplementation((sub) => Promise.resolve(sub)),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedsService,
        { provide: getRepositoryToken(Source), useValue: sourceRepository },
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<FeedsService>(FeedsService);
  });

  describe('subscribe (Deduplication Intents)', () => {
    it('should link to existing global source if isPrivate is false and URL exists', async () => {
      // Intention: Avoid scraping the same public feed multiple times by reusing the Source.
      const existingSource = {
        id: 'source-1',
        url: 'http://rss.com',
        isPrivate: false,
      };
      sourceRepository.findOne.mockResolvedValueOnce(existingSource);

      await service.subscribe('user-1', {
        url: 'http://rss.com',
        name: 'My Feed',
        isPrivate: false,
      });

      expect(sourceRepository.findOne).toHaveBeenCalledWith({
        where: { url: 'http://rss.com', isPrivate: false },
      });
      expect(sourceRepository.save).not.toHaveBeenCalled();

      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 'user-1' },
          source: existingSource,
        }),
      );
    });

    it('should create exclusive source and save auth state if isPrivate is true', async () => {
      // Intention: Private feeds (e.g. requiring login) cannot be shared. A new Source must be created.
      const authState = JSON.stringify({ cookies: [] });

      await service.subscribe('user-1', {
        url: 'http://private.com',
        name: 'Private',
        isPrivate: true,
        authStorageState: authState,
      });

      expect(sourceRepository.findOne).not.toHaveBeenCalled();

      expect(sourceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://private.com',
          isPrivate: true,
        }),
      );

      expect(subscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 'user-1' },
          authStorageState: authState,
        }),
      );
    });
  });
});
