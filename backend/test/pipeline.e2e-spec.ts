import { randomBytes } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { UserCredential } from '../src/auth/entities/user-credential.entity';
import { Article } from '../src/feeds/entities/article.entity';
import { Source } from '../src/feeds/entities/source.entity';
import { Subscription } from '../src/feeds/entities/subscription.entity';
import { UserArticleState } from '../src/feeds/entities/user-article-state.entity';
import { FeedsScheduler } from '../src/feeds/feeds.scheduler';
import { InitialSchema1793557165894 } from '../src/migrations/1793557165894-InitialSchema';
import { DeduplicateSubscriptions1793557200000 } from '../src/migrations/1793557200000-DeduplicateSubscriptions';
import { ScraperProcessor } from '../src/scraper/scraper.processor';
import { Webhook } from '../src/webhooks/entities/webhook.entity';

// Runs against a real MySQL because the defects it guards (TypeORM query
// building, MySQL DDL rules) never show up with mocked repositories.
// Needs DB_HOST/DB_PORT/DB_USER/DB_PASSWORD of a user allowed to CREATE DATABASE;
// it works in a throwaway database and drops it afterwards.
jest.setTimeout(60_000);

const dbName = `feeder_e2e_${randomBytes(4).toString('hex')}`;
const connection = {
  type: 'mysql' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'rootpassword',
  timezone: 'Z',
};

describe('Ingestion pipeline against MySQL (e2e)', () => {
  let admin: DataSource;
  let ds: DataSource;

  beforeAll(async () => {
    admin = await new DataSource(connection).initialize();
    await admin.query(`CREATE DATABASE \`${dbName}\``);
    ds = await new DataSource({
      ...connection,
      database: dbName,
      entities: [
        User,
        UserCredential,
        Source,
        Subscription,
        Article,
        UserArticleState,
        Webhook,
      ],
      migrations: [
        InitialSchema1793557165894,
        DeduplicateSubscriptions1793557200000,
      ],
      synchronize: false,
    }).initialize();
  });

  afterAll(async () => {
    await ds?.destroy();
    await admin?.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await admin?.destroy();
  });

  it('production migrations apply to an empty database and match the entities', async () => {
    await ds.runMigrations();

    const pending = await ds.driver.createSchemaBuilder().log();
    expect(pending.upQueries.map((q) => q.query)).toEqual([]);

    const subscriptionIndex: { Non_unique: number }[] = await ds.query(
      "SHOW INDEX FROM `subscription` WHERE Key_name = 'IDX_40e9f10fab4aba3b1baedd2441'",
    );
    expect(subscriptionIndex.map((row) => Number(row.Non_unique))).toEqual([
      0, 0,
    ]);
  });

  describe('with data', () => {
    const userId = '00000000-0000-4000-8000-000000000001';

    beforeAll(async () => {
      await ds.query('INSERT INTO `user` (id, email) VALUES (?, ?)', [
        userId,
        'e2e@example.com',
      ]);
    });

    afterEach(async () => {
      await ds.query('DELETE FROM `article`');
      await ds.query('DELETE FROM `subscription`');
      await ds.query('DELETE FROM `source`');
    });

    const addSubscribedSource = async (
      id: string,
      url: string,
      nextFetchAt: string | null,
    ) => {
      await ds.query(
        'INSERT INTO `source` (id, url, name, nextFetchAt) VALUES (?, ?, ?, ?)',
        [id, url, id, nextFetchAt],
      );
      await ds.query(
        'INSERT INTO `subscription` (id, userId, sourceId) VALUES (UUID(), ?, ?)',
        [userId, id],
      );
    };

    it('scheduler enqueues due sources, never-fetched first, then the most overdue', async () => {
      await addSubscribedSource(
        'src-recent',
        'https://a.example',
        '2024-06-01',
      );
      await addSubscribedSource('src-never', 'https://b.example', null);
      await addSubscribedSource(
        'src-oldest',
        'https://c.example',
        '2020-01-01',
      );
      await addSubscribedSource(
        'src-future',
        'https://d.example',
        '2999-01-01',
      );

      const enqueued: string[] = [];
      const queue = {
        getJob: async () => undefined,
        add: async (_name: string, data: { sourceId: string }) => {
          enqueued.push(data.sourceId);
        },
      };
      const scheduler = new FeedsScheduler(
        ds.getRepository(Source),
        queue as unknown as Queue,
      );

      await scheduler.scheduleFeeds();

      expect(enqueued).toEqual(['src-never', 'src-oldest', 'src-recent']);
    });

    describe('RSS ingestion', () => {
      let server: Server;
      let feedUrl: string;

      beforeAll(async () => {
        server = createServer((_req, res) => {
          const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
          res.setHeader('content-type', 'application/rss+xml');
          res.end(
            `<?xml version="1.0"?><rss version="2.0"><channel><title>e2e</title>
						<item><title>One</title><link>${base}/one</link></item>
						<item><title>Two</title><link>${base}/two</link></item>
						</channel></rss>`,
          );
        });
        await new Promise<void>((resolve) =>
          server.listen(0, '127.0.0.1', resolve),
        );
        feedUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/feed`;
      });

      afterAll(async () => {
        await new Promise((resolve) => server.close(resolve));
      });

      it('a second fetch of the same feed succeeds and stores nothing new', async () => {
        await addSubscribedSource('src-rss', feedUrl, null);
        const processor = new ScraperProcessor(
          ds.getRepository(Article),
          ds.getRepository(Source),
          ds.getRepository(Subscription),
          ds.getRepository(Webhook),
          { add: async () => undefined } as unknown as Queue,
          {
            get: (key: string) =>
              key === 'SSRF_ALLOWED_HOSTS' ? '127.0.0.1' : undefined,
          } as unknown as ConfigService,
        );
        const job = (id: string) =>
          ({
            id,
            data: { sourceId: 'src-rss', url: feedUrl },
            attemptsMade: 0,
            opts: { attempts: 1 },
          }) as never;

        await expect(processor.process(job('first'))).resolves.toEqual({
          newArticles: 2,
        });
        await expect(processor.process(job('second'))).resolves.toEqual({
          newArticles: 0,
        });
        await expect(ds.getRepository(Article).count()).resolves.toBe(2);
      });
    });
  });
});
