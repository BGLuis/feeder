import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import Parser = require('rss-parser');
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../feeds/entities/article.entity';
import { Source, SourceType } from '../feeds/entities/source.entity';
import { Subscription } from '../feeds/entities/subscription.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';
import { chromium } from 'playwright';

@Processor('scraper')
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  private rssParser = new Parser({
    customFields: {
      item: [
        ['media:content', 'mediaContent', { keepArray: true }],
        ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
        ['media:group', 'mediaGroup']
      ]
    }
  });

  constructor(
    @InjectRepository(Article) private articleRepository: Repository<Article>,
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectRepository(Subscription) private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Webhook) private webhookRepository: Repository<Webhook>,
    @InjectQueue('webhooks') private webhooksQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} for URL: ${job.data.url}`);
    
    // Buscar a source
    const source = await this.sourceRepository.findOne({ where: { id: job.data.sourceId } });
    if (!source) {
      this.logger.error(`Source not found: ${job.data.sourceId}`);
      return;
    }

    let foundNewPosts = false;

    try {
      if (source.type === SourceType.RSS) {
        // Fetch and parse RSS
        const feed = await this.rssParser.parseURL(job.data.url);
        
        for (const item of feed.items) {
          const exists = await this.articleRepository.findOne({ where: { url: item.link, source: { id: source.id } } });
          if (!exists && item.link) {
            const article = new Article();
            article.title = item.title || 'Untitled';
            article.url = item.link;
            
            const anyItem = item as any;

            let ytDescription = '';
            if (anyItem.mediaGroup && anyItem.mediaGroup['media:description'] && anyItem.mediaGroup['media:description'][0]) {
              ytDescription = typeof anyItem.mediaGroup['media:description'][0] === 'string' ? anyItem.mediaGroup['media:description'][0] : anyItem.mediaGroup['media:description'][0]._;
            }
            if (!ytDescription && anyItem.mediaGroup && anyItem.mediaGroup['media:description']) {
                ytDescription = anyItem.mediaGroup['media:description'];
            }

            const rawContent = (item as any)['content:encoded'] || item.content || ytDescription || '';
            const strippedContent = rawContent.replace(/<[^>]+>/g, '').trim();
            article.content = item.contentSnippet || strippedContent.substring(0, 300);
            
            // Extract Image URL
            let imageUrl = null;
            
            if (anyItem.enclosure && anyItem.enclosure.url && anyItem.enclosure.type && anyItem.enclosure.type.startsWith('image/')) {
              imageUrl = anyItem.enclosure.url;
            } else if (anyItem.mediaGroup && anyItem.mediaGroup['media:thumbnail'] && anyItem.mediaGroup['media:thumbnail'][0] && anyItem.mediaGroup['media:thumbnail'][0].$) {
              imageUrl = anyItem.mediaGroup['media:thumbnail'][0].$.url;
            } else if (anyItem.mediaGroup && anyItem.mediaGroup['media:content'] && anyItem.mediaGroup['media:content'][0] && anyItem.mediaGroup['media:content'][0].$) {
              imageUrl = anyItem.mediaGroup['media:content'][0].$.url;
            } else if (anyItem.mediaContent && anyItem.mediaContent[0] && anyItem.mediaContent[0].$) {
              imageUrl = anyItem.mediaContent[0].$.url;
            } else if (anyItem.mediaThumbnail && anyItem.mediaThumbnail[0] && anyItem.mediaThumbnail[0].$) {
              imageUrl = anyItem.mediaThumbnail[0].$.url;
            } else {
              const imgMatch = rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
              if (imgMatch && imgMatch[1]) {
                let imgUrl = imgMatch[1];
                if (imgUrl.startsWith('/')) {
                  try {
                    const parsedUrl = new URL(item.link || job.data.url);
                    imgUrl = `${parsedUrl.protocol}//${parsedUrl.host}${imgUrl}`;
                  } catch(e) {}
                }
                imageUrl = imgUrl;
              }
            }
            article.imageUrl = imageUrl;
            
            article.publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
            article.source = source;
            await this.articleRepository.save(article);
            foundNewPosts = true;
            await this.triggerWebhooks(article, source);

          }
        }
        this.logger.log(`Successfully parsed RSS for ${source.url}`);
      } else {
        // Scraping com Playwright
        const browser = await chromium.launch();
        try {
          const contextOptions: any = {};
          if (job.data.authStorageState) {
            contextOptions.storageState = JSON.parse(job.data.authStorageState);
          }
          const context = await browser.newContext(contextOptions);
          const page = await context.newPage();
          await page.goto(job.data.url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
          
          if (source.selectors && source.selectors.script) {
            this.logger.log(`Executing custom script for ${job.data.url}`);
            
            // The user's script should return an array of objects matching { title, url, content?, imageUrl? }
            let results: any[] = [];
            try {
              results = await page.evaluate(`(async () => {
                ${source.selectors.script}
              })()`);
            } catch (err) {
              this.logger.error(`Error evaluating custom script on ${job.data.url}`, err);
            }
            
            if (Array.isArray(results)) {
              this.logger.log(`Custom script returned ${results.length} items`);
              for (let i = 0; i < results.slice(0, 50).length; i++) {
                const item = results[i];
                if (!item.url || !item.title) {
                   this.logger.warn(`Skipping item due to missing url or title: ${JSON.stringify(item)}`);
                   continue;
                }
                
                const itemUrl = item.url.startsWith('/') ? `${new URL(job.data.url).origin}${item.url}` : item.url;
                const exists = await this.articleRepository.findOne({ where: { url: itemUrl, source: { id: source.id } } });
                
                if (!exists) {
                  const article = new Article();
                  article.title = item.title;
                  article.url = itemUrl;
                  article.content = item.content || '';
                  if (item.imageUrl) {
                    article.imageUrl = item.imageUrl.startsWith('/') ? `${new URL(job.data.url).origin}${item.imageUrl}` : item.imageUrl;
                  }
                  
                  // Use provided date or subtract seconds based on index to preserve scrape order
                  if (item.date) {
                    const parsedTime = new Date(item.date).getTime();
                    article.publishedAt = new Date(parsedTime - i * 1000);
                  } else {
                    article.publishedAt = new Date(Date.now() - i * 1000);
                  }
                  
                  article.source = source;
                  try {
            await this.articleRepository.save(article);
            foundNewPosts = true;
            await this.triggerWebhooks(article, source);


                    this.logger.log(`Saved new article: ${article.title}`);
                  } catch (e) {
                    this.logger.error(`Error saving article ${article.title}`, e);
                  }
                }
              }
            } else {
              this.logger.warn(`Custom script did not return an array. Returned: ${typeof results}`);
            }
          } else if (source.selectors && source.selectors.item) {
            // Wait for the item to appear in the DOM (crucial for SPAs like React/Vue)
            await page.waitForSelector(source.selectors.item, { timeout: 15000 }).catch(() => {});
            
            const elements = await page.$$(source.selectors.item);
            this.logger.log(`Found ${elements.length} items using selector ${source.selectors.item}`);
            
            for (let i = 0; i < elements.slice(0, 50).length; i++) {
              const el = elements[i];
              let itemTitle = 'Untitled';
              let itemContent = '';
              let itemImageUrl = null;
              let itemUrl = job.data.url;
              
              if (source.selectors.title) {
                const titleEl = await el.$(source.selectors.title);
                if (titleEl) itemTitle = (await titleEl.innerText()).trim();
              }
              
              if (source.selectors.link) {
                const linkEl = await el.$(source.selectors.link);
                if (linkEl) {
                  const href = await linkEl.getAttribute('href');
                  if (href) {
                    itemUrl = href.startsWith('/') ? `${new URL(job.data.url).origin}${href}` : href;
                  }
                }
              }

              if (source.selectors.content) {
                const contentEl = await el.$(source.selectors.content);
                if (contentEl) itemContent = (await contentEl.innerText()).trim();
              }
              
              if (source.selectors.image) {
                const imgEl = await el.$(source.selectors.image);
                if (imgEl) {
                  itemImageUrl = await imgEl.getAttribute('src') || await imgEl.getAttribute('content');
                  if (itemImageUrl && itemImageUrl.startsWith('/')) {
                    itemImageUrl = `${new URL(job.data.url).origin}${itemImageUrl}`;
                  }
                }
              }
              
              const exists = await this.articleRepository.findOne({ where: { url: itemUrl, source: { id: source.id } } });
              if (!exists) {
                const article = new Article();
                article.title = itemTitle;
                article.url = itemUrl;
                article.content = itemContent;
                if (itemImageUrl) article.imageUrl = itemImageUrl;
                article.publishedAt = new Date(Date.now() - i * 1000);
                article.source = source;
            await this.articleRepository.save(article);
            foundNewPosts = true;
            await this.triggerWebhooks(article, source);


              }
            }
          } else {
            // SINGLE ITEM LOGIC (Fallback)
            let title = await page.title();
            let content = 'Scraped content...';
            let imageUrl = null;
            let itemUrl = job.data.url;

            if (source.selectors) {
              if (source.selectors.title) {
                const el = await page.$(source.selectors.title);
                if (el) title = (await el.innerText()).trim() || title;
              }
              if (source.selectors.link) {
                const el = await page.$(source.selectors.link);
                if (el) {
                  const href = await el.getAttribute('href');
                  if (href) {
                    itemUrl = href.startsWith('/') ? `${new URL(job.data.url).origin}${href}` : href;
                  }
                }
              }
              if (source.selectors.content) {
                const el = await page.$(source.selectors.content);
                if (el) content = (await el.innerText()).trim();
              }
              if (source.selectors.image) {
                const el = await page.$(source.selectors.image);
                if (el) {
                  imageUrl = await el.getAttribute('src') || await el.getAttribute('content');
                  if (imageUrl && imageUrl.startsWith('/')) {
                    imageUrl = `${new URL(job.data.url).origin}${imageUrl}`;
                  }
                }
              }
            }

            const exists = await this.articleRepository.findOne({ where: { url: itemUrl, source: { id: source.id } } });
            if (!exists) {
              const article = new Article();
              article.title = title;
              article.url = itemUrl;
              article.content = content;
              if (imageUrl) article.imageUrl = imageUrl;
              article.publishedAt = new Date();
              article.source = source;
            await this.articleRepository.save(article);
            foundNewPosts = true;
            await this.triggerWebhooks(article, source);


            }
          }
          
          await context.close();
        } finally {
          await browser.close();
        }
      }

      await this.calculateNextFetch(source, foundNewPosts);
    } catch (error) {
      this.logger.error(`Error scraping ${job.data.url}`, error);
      throw error;
    }
  }

  private async triggerWebhooks(article: Article, source: Source) {
    const subscriptions = await this.subscriptionRepository.find({
      where: { source: { id: source.id } },
      relations: { user: true },
    });

    const userIds = [...new Set(subscriptions.map(s => s.user.id))];
    if (userIds.length === 0) return;

    const webhooks = await this.webhookRepository.find({
      where: { isActive: true },
      relations: { user: true }
    });
    
    const relevantWebhooks = webhooks.filter(w => userIds.includes(w.user.id));

    for (const webhook of relevantWebhooks) {
      const userSub = subscriptions.find(s => s.user.id === webhook.user.id);
      if (!userSub) continue;

      let shouldTrigger = false;
      if (webhook.triggerType === 'ALL') {
        shouldTrigger = true;
      } else if (webhook.triggerType === 'SOURCE' && webhook.triggerValue === source.id) {
        shouldTrigger = true;
      } else if (webhook.triggerType === 'TAG' && userSub.tags && userSub.tags.includes(webhook.triggerValue)) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        let payloadString = webhook.payloadTemplate;
        if (!payloadString) {
          payloadString = JSON.stringify({
            event: 'new_article',
            feed: '{{feed.name}}',
            article: {
              title: '{{item.title}}',
              url: '{{item.url}}',
              image: '{{item.imageUrl}}'
            }
          });
        }

        payloadString = payloadString
          .replace(/\{\{item\.title\}\}/g, JSON.stringify(article.title || '').slice(1, -1))
          .replace(/\{\{item\.url\}\}/g, article.url || '')
          .replace(/\{\{item\.content\}\}/g, JSON.stringify(article.content || '').slice(1, -1))
          .replace(/\{\{item\.imageUrl\}\}/g, article.imageUrl || '')
          .replace(/\{\{feed\.name\}\}/g, JSON.stringify(source.name || '').slice(1, -1));

        let payload;
        try {
          payload = JSON.parse(payloadString);
        } catch (e) {
          this.logger.error(`Invalid webhook payload template for webhook ${webhook.id}`, e);
          continue;
        }

        await this.webhooksQueue.add('dispatch', {
          targetUrl: webhook.url,
          secret: webhook.secret,
          payload
        });
      }
    }
  }

  private async calculateNextFetch(source: Source, foundNewPosts: boolean) {
    source.lastFetchAt = new Date();

    if (foundNewPosts) {
      source.consecutiveMisses = 0;
    } else {
      source.consecutiveMisses = (source.consecutiveMisses || 0) + 1;
    }

    const lastArticles = await this.articleRepository.find({
      where: { source: { id: source.id } },
      order: { publishedAt: 'DESC' },
      take: 10
    });

    const now = new Date();
    let nextFetch = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (lastArticles.length >= 2) {
      let totalDiff = 0;
      for (let i = 0; i < lastArticles.length - 1; i++) {
        totalDiff += Math.abs(lastArticles[i].publishedAt.getTime() - lastArticles[i+1].publishedAt.getTime());
      }
      let avgDiffMs = totalDiff / (lastArticles.length - 1);
      
      if (avgDiffMs < 60 * 60 * 1000) avgDiffMs = 60 * 60 * 1000;
      
      const backoffMultiplier = Math.pow(1.5, source.consecutiveMisses);
      let delayedDiffMs = avgDiffMs * backoffMultiplier;

      const MAX_DELAY_MS = 14 * 24 * 60 * 60 * 1000;
      if (delayedDiffMs > MAX_DELAY_MS) delayedDiffMs = MAX_DELAY_MS;

      nextFetch = new Date(now.getTime() + delayedDiffMs);
    } else {
      const baseDelayMs = 24 * 60 * 60 * 1000;
      let delayedDiffMs = baseDelayMs * Math.pow(1.5, source.consecutiveMisses);
      const MAX_DELAY_MS = 14 * 24 * 60 * 60 * 1000;
      if (delayedDiffMs > MAX_DELAY_MS) delayedDiffMs = MAX_DELAY_MS;
      nextFetch = new Date(now.getTime() + delayedDiffMs);
    }

    source.nextFetchAt = nextFetch;
    await this.sourceRepository.save(source);
    this.logger.log(`Source ${source.id} next fetch scheduled at ${nextFetch.toISOString()} (misses: ${source.consecutiveMisses})`);
  }
}
