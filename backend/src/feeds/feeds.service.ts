import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source, SourceType } from './entities/source.entity';
import { Subscription } from './entities/subscription.entity';
import { encryptSecret } from '../common/crypto/secret-box';
import {
  ListArticlesQueryDto,
  SubscribeDto,
  UpdateSubscriptionDto,
} from './dto/feeds.dto';

@Injectable()
export class FeedsService {
  constructor(
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectQueue('scraper') private scraperQueue: Queue,
  ) {}

  async subscribe(userId: string, data: SubscribeDto) {
    let source: Source | null = null;

    if (!data.isPrivate) {
      source = await this.sourceRepository.findOne({
        where: { url: data.url, isPrivate: false },
      });
    }

    if (!source) {
      source = new Source();
      source.url = data.url;
      source.name = data.name;
      source.isPrivate = data.isPrivate ?? false;
      source.type = data.selectors ? SourceType.SCRAPE : SourceType.RSS;
      source.selectors = data.selectors ?? null;
      await this.sourceRepository.save(source);
    }

    const encryptedState =
      data.isPrivate && data.authStorageState
        ? encryptSecret(data.authStorageState)
        : undefined;

    const subscription = new Subscription();
    subscription.user = { id: userId } as any;
    subscription.source = source;
    subscription.tags =
      data.tags && data.tags.length > 0 ? data.tags : ['default'];
    subscription.customName = data.name;
    if (encryptedState) subscription.authStorageState = encryptedState;

    const saved = await this.subscriptionRepository.save(subscription);

    await this.enqueueFetch(source, encryptedState);

    return saved;
  }

  async findAll(userId: string) {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      relations: { source: true },
    });
  }

  async getArticles(userId: string, query: ListArticlesQueryDto = {}) {
    const { tag, search } = query;
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 50));

    const subQuery = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.source', 'source')
      .leftJoin('subscription.user', 'user')
      .where('user.id = :userId', { userId });

    if (tag) {
      subQuery.andWhere('subscription.tags LIKE :tag', { tag: `%${tag}%` });
    }

    const subscriptions = await subQuery.getMany();

    if (!subscriptions.length) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const sourceIds = [...new Set(subscriptions.map((s) => s.source.id))];

    const articleQuery = this.sourceRepository.manager
      .createQueryBuilder('article', 'article')
      .leftJoinAndSelect('article.source', 'source')
      .where('source.id IN (:...sourceIds)', { sourceIds });

    if (search) {
      articleQuery.andWhere(
        '(LOWER(article.title) LIKE LOWER(:search) OR LOWER(article.content) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await articleQuery
      .orderBy('article.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    data: UpdateSubscriptionDto,
  ) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } as any },
      relations: { source: true },
    });
    if (!sub) throw new Error('Subscription not found');

    if (data.customName !== undefined) sub.customName = data.customName;
    if (data.tags !== undefined) sub.tags = data.tags;

    if (data.url !== undefined || data.selectors !== undefined) {
      const nextUrl = data.url ?? sub.source.url;
      const nextSelectors =
        data.selectors === undefined
          ? sub.source.selectors
          : data.selectors === null
            ? null
            : data.selectors;

      // A Source row can be shared by many users' subscriptions. Only edit it
      // in place when it is private AND this subscription is its sole owner;
      // otherwise copy-on-write into a fresh private Source so other
      // co-subscribers are not repointed / script-injected.
      const owners = await this.subscriptionRepository.count({
        where: { source: { id: sub.source.id } },
      });
      const soleOwner = sub.source.isPrivate && owners <= 1;

      if (soleOwner) {
        sub.source.url = nextUrl;
        sub.source.selectors = nextSelectors;
        sub.source.type = nextSelectors ? SourceType.SCRAPE : SourceType.RSS;
        await this.sourceRepository.save(sub.source);
      } else {
        const clone = new Source();
        clone.url = nextUrl;
        clone.name = sub.source.name;
        clone.isPrivate = true;
        clone.selectors = nextSelectors;
        clone.type = nextSelectors ? SourceType.SCRAPE : SourceType.RSS;
        await this.sourceRepository.save(clone);
        sub.source = clone;
      }
    }

    return this.subscriptionRepository.save(sub);
  }

  async refreshSubscription(userId: string, subscriptionId: string) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } as any },
      relations: { source: true },
    });
    if (!sub) throw new Error('Subscription not found');

    await this.enqueueFetch(sub.source, sub.authStorageState);

    return { success: true };
  }

  async deleteSubscription(userId: string, subscriptionId: string) {
    return this.subscriptionRepository.delete({
      id: subscriptionId,
      user: { id: userId } as any,
    });
  }

  /**
   * Manual "fetch now" (subscribe / refresh). authStorageState is passed through
   * already-encrypted; the processor decrypts it. No deterministic jobId here —
   * the user asked for an immediate run. The cron scheduler dedupes separately.
   */
  private async enqueueFetch(source: Source, authStorageState?: string) {
    await this.scraperQueue.add('fetch', {
      url: source.url,
      sourceId: source.id,
      authStorageState,
    });
  }
}
