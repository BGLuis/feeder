import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source, SourceType } from './entities/source.entity';
import { Subscription } from './entities/subscription.entity';

@Injectable()
export class FeedsService {
  constructor(
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectQueue('scraper') private scraperQueue: Queue,
  ) {}

  async subscribe(
    userId: string,
    data: {
      url: string;
      name: string;
      isPrivate: boolean;
      selectors?: any;
      authStorageState?: string;
      tags?: string[];
    },
  ) {
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
      source.isPrivate = data.isPrivate;
      source.type = data.selectors ? SourceType.SCRAPE : SourceType.RSS;
      source.selectors = data.selectors;
      await this.sourceRepository.save(source);
    }

    const subscription = new Subscription();
    subscription.user = { id: userId } as any;
    subscription.source = source;
    subscription.tags =
      data.tags && data.tags.length > 0 ? data.tags : ['default'];
    subscription.customName = data.name;

    if (data.isPrivate && data.authStorageState) {
      subscription.authStorageState = data.authStorageState;
    }

    const saved = await this.subscriptionRepository.save(subscription);

    // Add job to fetch RSS now!
    await this.scraperQueue.add('fetch', {
      url: source.url,
      sourceId: source.id,
      authStorageState: data.authStorageState,
    });

    return saved;
  }

  async findAll(userId: string) {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      relations: { source: true },
    });
  }

  async getArticles(
    userId: string,
    tag?: string,
    search?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // Buscar todos os sources do usuario (filtrado por tag se fornecida)
    const query = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.source', 'source')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('user.id = :userId', { userId });

    if (tag) {
      query.andWhere('subscription.tags LIKE :tag', { tag: `%${tag}%` });
    }

    const subscriptions = await query.getMany();

    if (!subscriptions.length) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const sourceIds = subscriptions.map((s) => s.source.id);

    const articleQuery = this.sourceRepository.manager
      .createQueryBuilder('article', 'article')
      .leftJoinAndSelect('article.source', 'source')
      .where('source.id IN (:...sourceIds)', { sourceIds });

    if (search) {
      articleQuery.andWhere(
        '(LOWER(article.title) LIKE LOWER(:search) OR LOWER(article.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const skip = (page - 1) * limit;

    const [data, total] = await articleQuery
      .orderBy('article.publishedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    data: {
      customName?: string;
      tags?: string[];
      url?: string;
      selectors?: any;
    },
  ) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } as any },
      relations: { source: true },
    });
    if (!sub) throw new Error('Subscription not found');

    if (data.customName !== undefined) sub.customName = data.customName;
    if (data.tags !== undefined) sub.tags = data.tags;

    if (data.url !== undefined || data.selectors !== undefined) {
      if (data.url !== undefined) sub.source.url = data.url;
      if (data.selectors !== undefined) {
        sub.source.selectors = data.selectors === null ? null : data.selectors;
        sub.source.type = data.selectors ? SourceType.SCRAPE : SourceType.RSS;
      }
      await this.sourceRepository.save(sub.source);
    }

    return this.subscriptionRepository.save(sub);
  }

  async refreshSubscription(userId: string, subscriptionId: string) {
    const sub = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } as any },
      relations: { source: true },
    });
    if (!sub) throw new Error('Subscription not found');

    await this.scraperQueue.add('fetch', {
      url: sub.source.url,
      sourceId: sub.source.id,
      authStorageState: sub.authStorageState,
    });

    return { success: true };
  }

  async deleteSubscription(userId: string, subscriptionId: string) {
    return this.subscriptionRepository.delete({
      id: subscriptionId,
      user: { id: userId } as any,
    });
  }
}
