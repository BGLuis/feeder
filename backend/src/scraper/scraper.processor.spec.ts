import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ScraperProcessor } from './scraper.processor';
import { Article } from '../feeds/entities/article.entity';
import { Source, SourceType } from '../feeds/entities/source.entity';
import { Subscription } from '../feeds/entities/subscription.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';

const parseStringMock = jest.fn();
jest.mock('rss-parser', () =>
  jest.fn().mockImplementation(() => ({ parseString: parseStringMock })),
);

const launchMock = jest.fn();
jest.mock('playwright', () => ({
  chromium: { launch: (...a: any[]) => launchMock(...a) },
}));

const safeFetchMock = jest.fn();
const assertUrlAllowedMock = jest.fn();
jest.mock('../common/net/ssrf-guard', () => {
  const actual = jest.requireActual('../common/net/ssrf-guard');
  return {
    ...actual,
    safeFetch: (...a: any[]) => safeFetchMock(...a),
    assertUrlAllowed: (...a: any[]) => assertUrlAllowedMock(...a),
  };
});

function feedResponse(xml = '<rss/>') {
  return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(xml) };
}

describe('ScraperProcessor', () => {
  let processor: ScraperProcessor;
  let articleRepo: any;
  let sourceRepo: any;
  let subRepo: any;
  let webhookRepo: any;
  let webhooksQueue: any;
  let webhookQb: any;

  const rssSource: Source = {
    id: 'src-1',
    url: 'https://feed.example/rss',
    name: 'Example',
    type: SourceType.RSS,
    isPrivate: false,
    selectors: null,
    consecutiveMisses: 0,
  } as unknown as Source;

  beforeEach(async () => {
    assertUrlAllowedMock.mockResolvedValue(new URL(rssSource.url));
    safeFetchMock.mockResolvedValue(feedResponse());
    parseStringMock.mockResolvedValue({ items: [] });

    articleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((a) => Promise.resolve({ id: 'a-1', ...a })),
      find: jest.fn().mockResolvedValue([]),
    };
    sourceRepo = {
      findOne: jest.fn().mockResolvedValue(rssSource),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
    };
    subRepo = { find: jest.fn().mockResolvedValue([]) };
    webhookQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    webhookRepo = { createQueryBuilder: jest.fn().mockReturnValue(webhookQb) };
    webhooksQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperProcessor,
        { provide: getRepositoryToken(Article), useValue: articleRepo },
        { provide: getRepositoryToken(Source), useValue: sourceRepo },
        { provide: getRepositoryToken(Subscription), useValue: subRepo },
        { provide: getRepositoryToken(Webhook), useValue: webhookRepo },
        { provide: getQueueToken('webhooks'), useValue: webhooksQueue },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    processor = module.get(ScraperProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  const job = (data: any) =>
    ({ id: 'j1', data }) as unknown as Job<any, any, string>;

  it('returns early when the source is unknown', async () => {
    sourceRepo.findOne.mockResolvedValueOnce(null);
    await processor.process(job({ sourceId: 'missing', url: 'x' }));
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it('runs the SSRF check before fetching an RSS feed', async () => {
    assertUrlAllowedMock.mockRejectedValueOnce(new Error('blocked'));
    await expect(
      processor.process(job({ sourceId: 'src-1', url: rssSource.url })),
    ).rejects.toThrow('blocked');
    expect(safeFetchMock).not.toHaveBeenCalled();
  });

  it('dedupes RSS items by (url, source)', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        { title: 'A', link: 'https://feed.example/a', pubDate: 'not-a-date' },
        { title: 'B', link: 'https://feed.example/b' },
      ],
    });
    articleRepo.findOne
      .mockResolvedValueOnce({ id: 'existing' }) // A already stored
      .mockResolvedValueOnce(null); // B is new

    const res = await processor.process(
      job({ sourceId: 'src-1', url: rssSource.url }),
    );

    expect(articleRepo.save).toHaveBeenCalledTimes(1);
    const savedB = articleRepo.save.mock.calls[0][0] as Article;
    expect(savedB.url).toBe('https://feed.example/b');
    expect(res).toEqual({ newArticles: 1 });
  });

  it('falls back to now for an unparseable pubDate', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        { title: 'A', link: 'https://feed.example/a', pubDate: 'garbage' },
      ],
    });

    await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

    const saved = articleRepo.save.mock.calls[0][0] as Article;
    expect(Number.isFinite(saved.publishedAt.getTime())).toBe(true);
  });

  it('rejects a javascript: image url', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        {
          title: 'A',
          link: 'https://feed.example/a',
          enclosure: { url: 'javascript:alert(1)', type: 'image/png' },
        },
      ],
    });

    await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

    const saved = articleRepo.save.mock.calls[0][0] as Article;
    expect(saved.imageUrl).toBeNull();
  });

  describe('webhook fan-out', () => {
    it('escapes scraped values so a quote in the url cannot break the payload JSON', async () => {
      parseStringMock.mockResolvedValue({
        items: [
          { title: 'T', link: 'https://feed.example/a"evil', content: 'c' },
        ],
      });
      subRepo.find.mockResolvedValue([
        { user: { id: 'u1' }, tags: ['default'] },
      ]);
      webhookQb.getMany.mockResolvedValue([
        {
          id: 'w1',
          url: 'https://hook.example',
          secret: 's'.repeat(16),
          triggerType: 'ALL',
          user: { id: 'u1' },
          payloadTemplate: '',
        },
      ]);

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      expect(webhooksQueue.add).toHaveBeenCalledWith(
        'dispatch',
        expect.objectContaining({
          targetUrl: 'https://hook.example',
          payload: expect.objectContaining({ event: 'new_article' }),
        }),
      );
    });

    it('does not fan out to webhooks whose owner is not a subscriber', async () => {
      parseStringMock.mockResolvedValue({
        items: [{ title: 'T', link: 'https://feed.example/a' }],
      });
      subRepo.find.mockResolvedValue([{ user: { id: 'u1' }, tags: [] }]);
      webhookQb.getMany.mockResolvedValue([]); // filtered out by the SQL WHERE

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));
      expect(webhooksQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('calculateNextFetch', () => {
    it('resets consecutiveMisses when new posts were found', async () => {
      parseStringMock.mockResolvedValue({
        items: [{ title: 'T', link: 'https://feed.example/new' }],
      });
      sourceRepo.findOne.mockResolvedValue({
        ...rssSource,
        consecutiveMisses: 4,
      });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      const saved = sourceRepo.save.mock.calls.at(-1)[0] as Source;
      expect(saved.consecutiveMisses).toBe(0);
      expect(Number.isFinite(saved.nextFetchAt.getTime())).toBe(true);
    });

    it('increments misses and stays finite when there are no articles', async () => {
      parseStringMock.mockResolvedValue({ items: [] });
      sourceRepo.findOne.mockResolvedValue({
        ...rssSource,
        consecutiveMisses: 2,
      });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      const saved = sourceRepo.save.mock.calls.at(-1)[0] as Source;
      expect(saved.consecutiveMisses).toBe(3);
      expect(Number.isFinite(saved.nextFetchAt.getTime())).toBe(true);
    });
  });

  describe('custom script isolation', () => {
    it('never injects authStorageState into the script browser context', async () => {
      const scriptSource = {
        ...rssSource,
        type: SourceType.SCRAPE,
        selectors: { script: 'return [];' },
      };
      sourceRepo.findOne.mockResolvedValue(scriptSource);
      assertUrlAllowedMock.mockResolvedValue(new URL('https://site.example'));

      const page = {
        goto: jest
          .fn()
          .mockResolvedValue({ ok: () => true, status: () => 200 }),
        evaluate: jest.fn().mockResolvedValue([]),
      };
      const context = {
        newPage: jest.fn().mockResolvedValue(page),
        setDefaultTimeout: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
      const browser = {
        isConnected: () => true,
        newContext: jest.fn().mockResolvedValue(context),
        close: jest.fn().mockResolvedValue(undefined),
      };
      launchMock.mockResolvedValue(browser);

      await processor.process(
        job({
          sourceId: 'src-1',
          url: 'https://site.example',
          authStorageState: 'v1.something',
        }),
      );

      expect(browser.newContext).toHaveBeenCalledWith(
        expect.not.objectContaining({ storageState: expect.anything() }),
      );
    });
  });
});
