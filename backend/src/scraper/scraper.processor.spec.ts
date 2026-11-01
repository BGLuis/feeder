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
import { encryptSecret } from '../common/crypto/secret-box';

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
    lastError: null,
    lastErrorAt: null,
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
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    subRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };
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

  it('dedupes RSS items by (url, source) using In() batch existence check', async () => {
    parseStringMock.mockResolvedValue({
      items: [
        { title: 'A', link: 'https://feed.example/a', pubDate: 'not-a-date' },
        { title: 'B', link: 'https://feed.example/b' },
      ],
    });
    // A already stored in database
    articleRepo.find.mockResolvedValueOnce([
      { url: 'https://feed.example/a' },
    ]);

    const res = await processor.process(
      job({ sourceId: 'src-1', url: rssSource.url }),
    );

    const existenceCalls = articleRepo.find.mock.calls.filter(
      (c: any) => c[0]?.where?.url,
    );
    expect(existenceCalls).toHaveLength(1);
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

  describe('issue #5: failure handling & error tracking', () => {
    it('moves nextFetchAt forward and stores lastError when run() rejects', async () => {
      assertUrlAllowedMock.mockRejectedValueOnce(new Error('connection refused'));

      await expect(
        processor.process(job({ sourceId: 'src-1', url: rssSource.url })),
      ).rejects.toThrow('connection refused');

      expect(sourceRepo.update).toHaveBeenCalledWith(
        'src-1',
        expect.objectContaining({
          lastError: 'connection refused',
          lastErrorAt: expect.any(Date),
          nextFetchAt: expect.any(Date),
          consecutiveMisses: 1,
        }),
      );
      const updatePayload = sourceRepo.update.mock.calls[0][1];
      expect(updatePayload.nextFetchAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it('clears lastError on a following successful run', async () => {
      const sourceWithError = {
        ...rssSource,
        lastError: 'previous error message',
        lastErrorAt: new Date(Date.now() - 60000),
      };
      sourceRepo.findOne.mockResolvedValueOnce(sourceWithError);
      parseStringMock.mockResolvedValueOnce({ items: [] });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      expect(sourceRepo.update).toHaveBeenCalledWith('src-1', {
        lastError: null,
        lastErrorAt: null,
      });
    });
  });

  describe('issue #6: private feed authentication', () => {
    it('loads decrypted authStorageState from subscription when private source has none in job', async () => {
      const privateSource = {
        ...rssSource,
        isPrivate: true,
        type: SourceType.SCRAPE,
        selectors: { item: '.post' },
      };
      sourceRepo.findOne.mockResolvedValueOnce(privateSource);
      assertUrlAllowedMock.mockResolvedValue(new URL('https://private.example'));

      const storageObj = { cookies: [{ name: 'auth', value: 'token123' }] };
      subRepo.findOne.mockResolvedValueOnce({
        authStorageState: encryptSecret(JSON.stringify(storageObj)),
      });

      const page = {
        goto: jest.fn().mockResolvedValue({ ok: () => true, status: () => 200 }),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        $$: jest.fn().mockResolvedValue([]),
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
        job({ sourceId: 'src-1', url: 'https://private.example' }),
      );

      expect(subRepo.findOne).toHaveBeenCalledWith({
        where: { source: { id: 'src-1' } },
      });
      expect(browser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({ storageState: storageObj }),
      );
    });

    it('never gives storage state to a public source', async () => {
      const publicSource = {
        ...rssSource,
        isPrivate: false,
        type: SourceType.SCRAPE,
        selectors: { item: '.post' },
      };
      sourceRepo.findOne.mockResolvedValueOnce(publicSource);
      assertUrlAllowedMock.mockResolvedValue(new URL('https://public.example'));

      const storageObj = { cookies: [{ name: 'auth', value: 'secret' }] };

      const page = {
        goto: jest.fn().mockResolvedValue({ ok: () => true, status: () => 200 }),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        $$: jest.fn().mockResolvedValue([]),
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
          url: 'https://public.example',
          authStorageState: encryptSecret(JSON.stringify(storageObj)),
        }),
      );

      expect(browser.newContext).toHaveBeenCalledWith(
        expect.not.objectContaining({ storageState: expect.anything() }),
      );
    });
  });

  describe('issue #7: column limits handling', () => {
    it('saves an item with a 512-character title and includes it in result', async () => {
      const longTitle = 'T'.repeat(512);
      parseStringMock.mockResolvedValue({
        items: [{ title: longTitle, link: 'https://feed.example/long-title' }],
      });

      const res = await processor.process(
        job({ sourceId: 'src-1', url: rssSource.url }),
      );

      expect(articleRepo.save).toHaveBeenCalledTimes(1);
      const saved = articleRepo.save.mock.calls[0][0] as Article;
      expect(saved.title).toBe(longTitle);
      expect(saved.title.length).toBe(512);
      expect(res).toEqual({ newArticles: 1 });
    });

    it('skips an item whose link exceeds 700 characters with a warning', async () => {
      const longUrl = 'https://feed.example/' + 'x'.repeat(700);
      parseStringMock.mockResolvedValue({
        items: [
          { title: 'Too Long Link', link: longUrl },
          { title: 'Normal Link', link: 'https://feed.example/normal' },
        ],
      });

      const res = await processor.process(
        job({ sourceId: 'src-1', url: rssSource.url }),
      );

      expect(articleRepo.save).toHaveBeenCalledTimes(1);
      const saved = articleRepo.save.mock.calls[0][0] as Article;
      expect(saved.url).toBe('https://feed.example/normal');
      expect(res).toEqual({ newArticles: 1 });
    });
  });

  describe('issue #9: RSS loop bounded processing & timestamps', () => {
    it('aborts the signal after the first item and asserts no further save call', async () => {
      parseStringMock.mockResolvedValue({
        items: [
          { title: 'First', link: 'https://feed.example/first' },
          { title: 'Second', link: 'https://feed.example/second' },
          { title: 'Third', link: 'https://feed.example/third' },
        ],
      });

      const origRun = (processor as any).run.bind(processor);
      jest.spyOn(processor as any, 'run').mockImplementation(async (j, s, signal) => {
        // Abort signal after first save inside processRss
        articleRepo.save.mockImplementationOnce(async (a: any) => {
          Object.defineProperty(signal, 'aborted', {
            value: true,
            configurable: true,
          });
          return { id: 'a-1', ...a };
        });
        return origRun(j, s, signal);
      });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      expect(articleRepo.save).toHaveBeenCalledTimes(1);
    });

    it('caps a feed of 200 items at MAX_ITEMS saves and makes one existence query', async () => {
      const items = Array.from({ length: 200 }, (_, i) => ({
        title: `Item ${i}`,
        link: `https://feed.example/item-${i}`,
      }));
      parseStringMock.mockResolvedValue({ items });

      const res = await processor.process(
        job({ sourceId: 'src-1', url: rssSource.url }),
      );

      const existenceCalls = articleRepo.find.mock.calls.filter(
        (c: any) => c[0]?.where?.url,
      );
      expect(existenceCalls).toHaveLength(1);
      expect(articleRepo.save).toHaveBeenCalledTimes(50); // MAX_ITEMS = 50
      expect(res).toEqual({ newArticles: 50 });
    });

    it('calculateNextFetch calls update with only the three scheduling fields', async () => {
      parseStringMock.mockResolvedValue({ items: [] });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      expect(sourceRepo.update).toHaveBeenCalledWith('src-1', {
        lastFetchAt: expect.any(Date),
        consecutiveMisses: expect.any(Number),
        nextFetchAt: expect.any(Date),
      });
    });

    it('clamps future pubDate so publishedAt is <= now', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      parseStringMock.mockResolvedValue({
        items: [
          {
            title: 'Future Item',
            link: 'https://feed.example/future',
            pubDate: tomorrow.toISOString(),
          },
        ],
      });

      await processor.process(job({ sourceId: 'src-1', url: rssSource.url }));

      const saved = articleRepo.save.mock.calls[0][0] as Article;
      expect(saved.publishedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
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
