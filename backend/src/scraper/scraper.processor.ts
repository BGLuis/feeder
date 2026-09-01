import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';
import Parser = require('rss-parser');
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Browser, chromium } from 'playwright';
import { Article } from '../feeds/entities/article.entity';
import { Source, SourceType } from '../feeds/entities/source.entity';
import { Subscription } from '../feeds/entities/subscription.entity';
import { Webhook } from '../webhooks/entities/webhook.entity';
import { assertUrlAllowed, safeFetch } from '../common/net/ssrf-guard';
import { decryptSecret } from '../common/crypto/secret-box';

const TITLE_MAX = 512;
const CONTENT_MAX = 8_000;
const MAX_ITEMS = 50;
// Below this pixel dimension an image is almost always an icon, avatar or
// tracking pixel — not worth showing as an article cover.
const MIN_IMAGE_DIM = 200;
// A width we ask CDNs for when we can only see a small one in the feed.
const TARGET_IMAGE_WIDTH = 1600;
// Per feed run, how many article pages we may fetch just to read `og:image`.
const OG_FETCH_MAX = 20;
const OG_FETCH_TIMEOUT_MS = 8_000;
const OG_HTML_SCAN_BYTES = 256 * 1024;
const FEED_BYTES_MAX = 5 * 1024 * 1024;
const NAV_TIMEOUT_MS = 30_000;
const SCRIPT_TIMEOUT_MS = 8_000;
const JOB_TIMEOUT_MS = 90_000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_DELAY_MS = 14 * 24 * HOUR_MS;
const MAX_BACKOFF_EXP = 12;

function clamp(value: string | null | undefined, max: number): string {
  if (!value) return '';
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function resolveMaybeRelative(
  raw: string | null | undefined,
  base: string,
): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function sanitizeImageUrl(
  raw: string | null | undefined,
  base: string,
): string | null {
  const resolved = resolveMaybeRelative(raw ?? undefined, base);
  if (!resolved || !isHttpUrl(resolved)) return null;
  return maximizeImageUrl(resolved);
}

/**
 * Rewrite a CDN/thumbnail image URL to point at the largest version the same
 * host can serve. This is not upscaling — feeds routinely embed a *resized*
 * URL (`?w=150`, `-150x150.jpg`, an image-proxy prefix) whose full-resolution
 * original is one transform away. We unwrap proxies and raise/drop size hints;
 * a wrong guess just 404s and the client falls back to its monogram.
 */
function maximizeImageUrl(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }

  // 1. Image proxies that carry the real source as the trailing path segment
  //    (Substack: /image/fetch/w_150,c_limit/https%3A%2F%2F...).
  const proxied = u.pathname.match(/\/(https?%3A%2F%2F.+)$/i);
  if (proxied) {
    try {
      const inner = decodeURIComponent(proxied[1]);
      if (isHttpUrl(inner) && inner !== url) return maximizeImageUrl(inner);
    } catch {
      /* fall through */
    }
  }

  // 2. Query-string proxies (Next.js /_next/image?url=..., wsrv/images.weserv).
  for (const key of ['url', 'u', 'image', 'src']) {
    const inner = u.searchParams.get(key);
    if (!inner) continue;
    try {
      const decoded = decodeURIComponent(inner);
      const abs = decoded.startsWith('//') ? `https:${decoded}` : decoded;
      if (isHttpUrl(abs) && abs !== url) return maximizeImageUrl(abs);
    } catch {
      /* fall through */
    }
  }

  // 3. Cloudflare / Cloudinary path transforms: /cdn-cgi/image/width=200,.../rest
  u.pathname = u.pathname.replace(
    /\/(cdn-cgi\/image|image\/upload)\/([^/]+)\//i,
    (_m, prefix: string, opts: string) => {
      const raised = opts
        .replace(/(?:w|width)=\d+/i, `width=${TARGET_IMAGE_WIDTH}`)
        .replace(/w_\d+/i, `w_${TARGET_IMAGE_WIDTH}`)
        .replace(/,?(?:h|height)=\d+/i, '')
        .replace(/,?h_\d+/i, '')
        .replace(/,?q(?:uality)?[=_]\d+/i, '');
      return `/${prefix}/${raised}/`;
    },
  );

  // 4. WordPress-style resize suffix: name-1024x576.jpg -> name.jpg (WP keeps
  //    the original). Only when the embedded size is modest.
  const wp = u.pathname.match(
    /-(\d{2,4})x(\d{2,4})(\.(?:jpe?g|png|webp|gif))$/i,
  );
  if (wp && (toInt(wp[1]) < 1200 || toInt(wp[2]) < 1200)) {
    u.pathname = u.pathname.slice(0, u.pathname.length - wp[0].length) + wp[3];
  }

  // 5. Bare size hints in the query string.
  for (const p of [...u.searchParams.keys()]) {
    const key = p.toLowerCase();
    const n = parseInt(u.searchParams.get(p) ?? '', 10);
    if (!Number.isFinite(n)) continue;
    if ((key === 'w' || key === 'width' || key === 'maxwidth') && n < 1200) {
      u.searchParams.set(p, String(TARGET_IMAGE_WIDTH));
    } else if (key === 'h' || key === 'height' || key === 'maxheight') {
      u.searchParams.delete(p);
    } else if ((key === 'q' || key === 'quality') && n < 85) {
      u.searchParams.set(p, '90');
    } else if (
      ['size', 'sz', 'resize', 'fit', 'crop', 's'].includes(key) &&
      n < 500
    ) {
      u.searchParams.delete(p);
    }
  }

  return u.toString();
}

/** Heuristic: does this URL look like a small thumbnail worth replacing? */
function looksLikeThumbnail(url: string | null): boolean {
  if (!url) return true;
  return /(-\d{2,3}x\d{2,3}\.(?:jpe?g|png|webp)|[?&](?:w|width|h|height|size|sz)=\d{1,3}(?:&|$)|\/thumb(?:s|nail)?\/|_thumb\.|_small\.|=s\d{2,3}(?:-c)?$|\/\d{2,3}x\d{2,3}\/)/i.test(
    url,
  );
}

function toInt(value: string | number | null | undefined): number {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Pick the highest-resolution candidate from a `srcset` attribute. */
function largestFromSrcset(srcset: string | null | undefined): string | null {
  if (!srcset) return null;
  let best: { url: string; weight: number } | null = null;
  for (const part of srcset.split(',')) {
    const [url, descriptor] = part.trim().split(/\s+/, 2);
    if (!url) continue;
    const weight = descriptor?.endsWith('w')
      ? toInt(descriptor)
      : descriptor?.endsWith('x')
        ? parseFloat(descriptor) * 1000
        : 1;
    if (!best || weight > best.weight) best = { url, weight };
  }
  return best?.url ?? null;
}

/**
 * Choose the largest usable image from raw HTML: prefer the `<img>` with the
 * biggest declared width, fall back to the first, and mine `srcset` for a
 * higher-resolution source than the bare `src`.
 */
function pickLargestImgFromHtml(html: string): string | null {
  const tags = String(html).match(/<img[^>]+>/gi);
  if (!tags) return null;
  let best: { url: string; width: number } | null = null;
  let firstAny: string | null = null;
  for (const tag of tags) {
    const src =
      largestFromSrcset(tag.match(/srcset=["']([^"']+)["']/i)?.[1]) ??
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      tag.match(/data-(?:src|original|lazy-src)=["']([^"']+)["']/i)?.[1] ??
      null;
    if (!src || src.startsWith('data:')) continue;
    if (!firstAny) firstAny = src;
    const width = toInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1]);
    if (width && width < MIN_IMAGE_DIM) continue;
    if (!best || width > best.width) best = { url: src, width };
  }
  return best?.url ?? firstAny;
}

interface MediaEntry {
  $?: { url?: string; width?: string; type?: string; medium?: string };
}

/** Largest `$.url` from an array/single of `media:*` entries with `$.width`. */
function pickLargestMedia(
  entries: MediaEntry | MediaEntry[] | null | undefined,
): string | null {
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  let best: { url: string; width: number } | null = null;
  for (const entry of list) {
    const attrs = entry?.$;
    const url = attrs?.url;
    if (!url) continue;
    const type = String(attrs.type ?? attrs.medium ?? '');
    if (type && !type.startsWith('image') && type !== 'image') continue;
    const width = toInt(attrs.width);
    if (!best || width > best.width) best = { url, width };
  }
  return best?.url ?? null;
}

@Processor('scraper', { concurrency: 2, lockDuration: 120_000 })
export class ScraperProcessor extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(ScraperProcessor.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  private rssParser = new Parser({
    customFields: {
      item: [
        ['media:content', 'mediaContent', { keepArray: true }],
        ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
        ['media:group', 'mediaGroup'],
      ],
    },
  });

  constructor(
    @InjectRepository(Article) private articleRepository: Repository<Article>,
    @InjectRepository(Source) private sourceRepository: Repository<Source>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Webhook) private webhookRepository: Repository<Webhook>,
    @InjectQueue('webhooks') private webhooksQueue: Queue,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async onModuleDestroy() {
    await this.browser?.close().catch(() => undefined);
  }

  private get allowedHosts(): string | undefined {
    return this.config.get<string>('SSRF_ALLOWED_HOSTS');
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (!this.browserPromise) {
      this.browserPromise = chromium
        .launch()
        .then((b) => {
          this.browser = b;
          this.browserPromise = null;
          return b;
        })
        .catch((err) => {
          this.browserPromise = null;
          throw err;
        });
    }
    return this.browserPromise;
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} for URL: ${job.data.url}`);

    const source = await this.sourceRepository.findOne({
      where: { id: job.data.sourceId },
    });
    if (!source) {
      this.logger.error(`Source not found: ${job.data.sourceId}`);
      return;
    }

    // Hard ceiling for the whole job so a hung page / script cannot pin a
    // worker slot. On timeout we abort: `run()` observes the signal and its
    // in-flight Playwright/HTTP work is torn down.
    const ac = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, JOB_TIMEOUT_MS);

    // The work promise MUST always carry a handler: once a timeout has been
    // reported to BullMQ, a later rejection here would otherwise crash the
    // process as an unhandledRejection.
    const work = this.run(job, source, ac.signal);
    work.catch(() => undefined);

    try {
      const newArticles = await work;
      await this.dispatchWebhooks(newArticles, source);
      await this.calculateNextFetch(source, newArticles.length > 0);
      return { newArticles: newArticles.length };
    } catch (error) {
      if (timedOut) {
        const msg = `Job ${job.id} timed out after ${JOB_TIMEOUT_MS}ms`;
        this.logger.error(msg);
        throw new Error(msg);
      }
      this.logger.error(`Error scraping ${job.data.url}`, error as Error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private async run(
    job: Job<any, any, string>,
    source: Source,
    signal: AbortSignal,
  ): Promise<Article[]> {
    // SSRF: authoritative check right before we touch the network.
    await assertUrlAllowed(job.data.url, this.allowedHosts);

    if (source.type === SourceType.RSS) {
      return this.processRss(job.data.url, source, signal);
    }
    return this.processScrape(job, source, signal);
  }

  // ---------------------------------------------------------------- RSS -----

  private async processRss(
    url: string,
    source: Source,
    signal: AbortSignal,
  ): Promise<Article[]> {
    const res = await safeFetch(
      url,
      {
        headers: {
          accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.any([signal, AbortSignal.timeout(NAV_TIMEOUT_MS)]),
      },
      this.allowedHosts,
    );
    if (!res.ok) throw new Error(`Feed ${url} responded ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > FEED_BYTES_MAX) {
      throw new Error(`Feed ${url} exceeds ${FEED_BYTES_MAX} bytes`);
    }
    const feed = await this.rssParser.parseString(buf.toString('utf8'));

    const created: Article[] = [];
    let ogBudget = OG_FETCH_MAX;
    for (const item of feed.items) {
      if (!item.link) continue;
      const exists = await this.articleRepository.findOne({
        where: { url: item.link, source: { id: source.id } },
      });
      if (exists) continue;

      const anyItem = item as any;
      let ytDescription = '';
      const mediaDesc = anyItem.mediaGroup?.['media:description'];
      if (mediaDesc) {
        if (Array.isArray(mediaDesc)) {
          ytDescription =
            typeof mediaDesc[0] === 'string'
              ? mediaDesc[0]
              : (mediaDesc[0]?._ ?? '');
        } else if (typeof mediaDesc === 'string') {
          ytDescription = mediaDesc;
        }
      }

      const rawContent =
        anyItem['content:encoded'] || item.content || ytDescription || '';
      const strippedContent = String(rawContent)
        .replace(/<[^>]+>/g, '')
        .trim();

      const article = new Article();
      article.title = clamp(item.title, TITLE_MAX) || 'Untitled';
      article.url = item.link;
      article.content = clamp(
        item.contentSnippet || strippedContent,
        CONTENT_MAX,
      );
      let imageUrl = sanitizeImageUrl(
        this.extractRssImage(anyItem, rawContent),
        item.link,
      );
      // The feed only gave us a thumbnail (or nothing) — the article page's
      // og:image is almost always the full-size hero the site itself shows.
      if (looksLikeThumbnail(imageUrl) && ogBudget > 0) {
        ogBudget--;
        const og = await this.fetchOgImage(item.link, signal);
        if (og) imageUrl = og;
      }
      article.imageUrl = imageUrl;

      const parsedDate = item.pubDate ? new Date(item.pubDate) : null;
      article.publishedAt =
        parsedDate && Number.isFinite(parsedDate.getTime())
          ? parsedDate
          : new Date();
      article.source = source;

      const saved = await this.saveArticle(article, source);
      if (saved) created.push(saved);
    }

    this.logger.log(
      `RSS ${source.url}: ${created.length} new of ${feed.items.length} items`,
    );
    return created;
  }

  private extractRssImage(anyItem: any, rawContent: string): string | null {
    if (
      anyItem.enclosure?.url &&
      typeof anyItem.enclosure.type === 'string' &&
      anyItem.enclosure.type.startsWith('image/')
    ) {
      return anyItem.enclosure.url;
    }
    // Prefer full-resolution `media:content` (largest declared width) over a
    // `media:thumbnail`, which feeds tend to cap at ~150px.
    return (
      pickLargestMedia(anyItem.mediaGroup?.['media:content']) ??
      pickLargestMedia(anyItem.mediaContent) ??
      pickLargestImgFromHtml(rawContent) ??
      anyItem.mediaGroup?.['media:thumbnail']?.[0]?.$?.url ??
      anyItem.mediaThumbnail?.[0]?.$?.url ??
      null
    );
  }

  // ------------------------------------------------------------- SCRAPE -----

  private async processScrape(
    job: Job<any, any, string>,
    source: Source,
    signal: AbortSignal,
  ): Promise<Article[]> {
    const useScript = Boolean(source.selectors?.script);

    // Only non-script modes get the authenticated session; arbitrary JS never does.
    let storageState: any;
    if (!useScript && job.data.authStorageState) {
      try {
        storageState = JSON.parse(decryptSecret(job.data.authStorageState));
      } catch (e) {
        this.logger.warn(
          `Ignoring unreadable authStorageState for job ${job.id}: ${(e as Error).message}`,
        );
      }
    }

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      serviceWorkers: 'block',
      ...(storageState ? { storageState } : {}),
    });
    context.setDefaultTimeout(NAV_TIMEOUT_MS);

    // If the job's hard timeout fires, tear the context down now so any
    // in-flight page.* call rejects promptly instead of lingering.
    const onAbort = () => void context.close().catch(() => undefined);
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      const page = await context.newPage();
      const response = await page
        .goto(job.data.url, {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT_MS,
        })
        .catch((e) => {
          throw new Error(`Navigation to ${job.data.url} failed: ${e.message}`);
        });
      if (response && !response.ok() && response.status() >= 400) {
        throw new Error(`${job.data.url} responded ${response.status()}`);
      }

      const origin = new URL(job.data.url).origin;

      if (useScript) {
        return await this.runCustomScript(page, source, job.data.url, origin);
      }
      if (source.selectors?.item) {
        return await this.runItemSelectors(page, source, job.data.url, origin);
      }
      return await this.runSingleItem(page, source, job.data.url, origin);
    } finally {
      signal.removeEventListener('abort', onAbort);
      await context.close().catch(() => undefined);
    }
  }

  private async runCustomScript(
    page: import('playwright').Page,
    source: Source,
    url: string,
    origin: string,
  ): Promise<Article[]> {
    let results: any[] = [];
    try {
      const evaluation = page.evaluate(
        `(async () => { ${source.selectors.script} })()`,
      );
      // Keep a handler on the orphan so a late rejection (script error / page
      // closed after the timeout won) never becomes an unhandledRejection.
      evaluation.catch(() => undefined);
      let scriptTimer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        scriptTimer = setTimeout(
          () => reject(new Error('custom script timeout')),
          SCRIPT_TIMEOUT_MS,
        );
      });
      try {
        results = (await Promise.race([evaluation, timeout])) as any[];
      } finally {
        if (scriptTimer) clearTimeout(scriptTimer);
      }
    } catch (err) {
      this.logger.error(`Custom script failed on ${url}`, err as Error);
      return [];
    }
    if (!Array.isArray(results)) {
      this.logger.warn(
        `Custom script did not return an array (${typeof results})`,
      );
      return [];
    }

    const created: Article[] = [];
    const items = results.slice(0, MAX_ITEMS);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item?.url !== 'string' || typeof item?.title !== 'string') {
        continue;
      }
      const itemUrl = resolveMaybeRelative(item.url, origin);
      if (!itemUrl || !isHttpUrl(itemUrl)) continue;

      if (await this.isDuplicate(itemUrl, source)) continue;

      const article = new Article();
      article.title = clamp(item.title, TITLE_MAX);
      article.url = itemUrl;
      article.content = clamp(item.content, CONTENT_MAX);
      article.imageUrl = sanitizeImageUrl(item.imageUrl, origin);
      const parsed = item.date ? new Date(item.date).getTime() : Date.now();
      article.publishedAt = new Date(
        (Number.isFinite(parsed) ? parsed : Date.now()) - i * 1000,
      );
      article.source = source;

      const saved = await this.saveArticle(article, source);
      if (saved) created.push(saved);
    }
    return created;
  }

  private async runItemSelectors(
    page: import('playwright').Page,
    source: Source,
    url: string,
    origin: string,
  ): Promise<Article[]> {
    await page
      .waitForSelector(source.selectors.item, { timeout: 15_000 })
      .catch(() => undefined);
    const elements = (await page.$$(source.selectors.item)).slice(0, MAX_ITEMS);

    const created: Article[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      let title = 'Untitled';
      let content = '';
      let image: string | null = null;
      let itemUrl = url;

      if (source.selectors.title) {
        const t = await el.$(source.selectors.title);
        if (t) title = clamp(await t.innerText(), TITLE_MAX) || title;
      }
      if (source.selectors.link) {
        const l = await el.$(source.selectors.link);
        const href = l ? await l.getAttribute('href') : null;
        const resolved = resolveMaybeRelative(href, origin);
        if (resolved) itemUrl = resolved;
      }
      if (source.selectors.content) {
        const c = await el.$(source.selectors.content);
        if (c) content = clamp(await c.innerText(), CONTENT_MAX);
      }
      if (source.selectors.image) {
        const im = await el.$(source.selectors.image);
        if (im) image = sanitizeImageUrl(await this.readImageAttr(im), origin);
      }

      if (!isHttpUrl(itemUrl) || (await this.isDuplicate(itemUrl, source))) {
        continue;
      }

      const article = new Article();
      article.title = title;
      article.url = itemUrl;
      article.content = content;
      article.imageUrl = image;
      article.publishedAt = new Date(Date.now() - i * 1000);
      article.source = source;

      const saved = await this.saveArticle(article, source);
      if (saved) created.push(saved);
    }
    return created;
  }

  private async runSingleItem(
    page: import('playwright').Page,
    source: Source,
    url: string,
    origin: string,
  ): Promise<Article[]> {
    let title = clamp(await page.title(), TITLE_MAX) || 'Untitled';
    let content = '';
    let image: string | null = null;
    let itemUrl = url;

    if (source.selectors) {
      if (source.selectors.title) {
        const el = await page.$(source.selectors.title);
        if (el) title = clamp(await el.innerText(), TITLE_MAX) || title;
      }
      if (source.selectors.link) {
        const el = await page.$(source.selectors.link);
        const href = el ? await el.getAttribute('href') : null;
        const resolved = resolveMaybeRelative(href, origin);
        if (resolved) itemUrl = resolved;
      }
      if (source.selectors.content) {
        const el = await page.$(source.selectors.content);
        if (el) content = clamp(await el.innerText(), CONTENT_MAX);
      }
      if (source.selectors.image) {
        const el = await page.$(source.selectors.image);
        if (el) image = sanitizeImageUrl(await this.readImageAttr(el), origin);
      }
    }

    // Fall back to the page's social-share image — usually a full-size asset.
    if (!image) {
      const og = await page.$(
        'meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"], meta[property="twitter:image"]',
      );
      if (og)
        image = sanitizeImageUrl(await og.getAttribute('content'), origin);
    }

    if (!isHttpUrl(itemUrl) || (await this.isDuplicate(itemUrl, source))) {
      return [];
    }

    const article = new Article();
    article.title = title;
    article.url = itemUrl;
    article.content = content;
    article.imageUrl = image;
    article.publishedAt = new Date();
    article.source = source;

    const saved = await this.saveArticle(article, source);
    return saved ? [saved] : [];
  }

  // ------------------------------------------------------------- helpers ----

  /**
   * Read the best image URL off a scraped element: the largest `srcset`
   * candidate wins, then `src`, then common lazy-load attributes, then a
   * `<meta content>` value.
   */
  private async readImageAttr(el: {
    getAttribute(name: string): Promise<string | null>;
  }): Promise<string | null> {
    return (
      largestFromSrcset(await el.getAttribute('srcset')) ||
      (await el.getAttribute('src')) ||
      (await el.getAttribute('data-src')) ||
      (await el.getAttribute('data-original')) ||
      (await el.getAttribute('data-lazy-src')) ||
      (await el.getAttribute('content'))
    );
  }

  /**
   * Fetch just the `<head>` of an article page and read its social-share image
   * (`og:image` / `twitter:image`). Bounded: capped byte read, short timeout,
   * SSRF-guarded, and rate-limited by the caller's per-run budget.
   */
  private async fetchOgImage(
    pageUrl: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    try {
      await assertUrlAllowed(pageUrl, this.allowedHosts);
      const res = await safeFetch(
        pageUrl,
        {
          headers: { accept: 'text/html,application/xhtml+xml' },
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
          ]),
        },
        this.allowedHosts,
      );
      if (!res.ok) return null;

      const buf = Buffer.from(await res.arrayBuffer());
      const html = buf.subarray(0, OG_HTML_SCAN_BYTES).toString('utf8');
      const head = html.split(/<\/head>/i)[0] ?? html;

      const raw =
        head.match(
          /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*\scontent=["']([^"']+)["']/i,
        )?.[1] ??
        head.match(
          /<meta[^>]+\scontent=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i,
        )?.[1] ??
        head.match(
          /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
        )?.[1] ??
        null;

      return raw ? sanitizeImageUrl(raw, pageUrl) : null;
    } catch {
      return null;
    }
  }

  private async isDuplicate(url: string, source: Source): Promise<boolean> {
    const existing = await this.articleRepository.findOne({
      where: { url, source: { id: source.id } },
    });
    return Boolean(existing);
  }

  /** Insert one article, tolerating the (source,url) unique constraint under races. */
  private async saveArticle(
    article: Article,
    source: Source,
  ): Promise<Article | null> {
    try {
      return await this.articleRepository.save(article);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062) return null;
      this.logger.error(
        `Failed to save article ${article.url} for source ${source.id}`,
        e as Error,
      );
      return null;
    }
  }

  // ---------------------------------------------------------- webhooks ------

  private async dispatchWebhooks(articles: Article[], source: Source) {
    if (articles.length === 0) return;

    const subscriptions = await this.subscriptionRepository.find({
      where: { source: { id: source.id } },
      relations: { user: true },
    });
    const userIds = [...new Set(subscriptions.map((s) => s.user.id))];
    if (userIds.length === 0) return;

    const webhooks = await this.webhookRepository
      .createQueryBuilder('webhook')
      .leftJoinAndSelect('webhook.user', 'user')
      .where('webhook.isActive = :active', { active: true })
      .andWhere('user.id IN (:...userIds)', { userIds })
      .getMany();
    if (webhooks.length === 0) return;

    for (const article of articles) {
      for (const webhook of webhooks) {
        const userSub = subscriptions.find(
          (s) => s.user.id === webhook.user.id,
        );
        if (!userSub) continue;
        if (!this.webhookMatches(webhook, userSub, source)) continue;

        const payload = this.renderPayload(webhook, article, source);
        if (!payload) continue;

        await this.webhooksQueue.add('dispatch', {
          targetUrl: webhook.url,
          secret: webhook.secret,
          payload,
        });
      }
    }
  }

  private webhookMatches(
    webhook: Webhook,
    sub: Subscription,
    source: Source,
  ): boolean {
    if (webhook.triggerType === 'ALL') return true;
    if (webhook.triggerType === 'SOURCE') {
      return webhook.triggerValue === source.id;
    }
    if (webhook.triggerType === 'TAG') {
      return Boolean(sub.tags?.includes(webhook.triggerValue));
    }
    return false;
  }

  private renderPayload(
    webhook: Webhook,
    article: Article,
    source: Source,
  ): any | null {
    const template =
      webhook.payloadTemplate ||
      JSON.stringify({
        event: 'new_article',
        feed: '{{feed.name}}',
        article: {
          title: '{{item.title}}',
          url: '{{item.url}}',
          image: '{{item.imageUrl}}',
        },
      });

    // Every substitution is JSON-string-escaped so scraped values can never
    // break out of their string position or inject structure.
    const esc = (v: string | null | undefined) =>
      JSON.stringify(v ?? '').slice(1, -1);
    const rendered = template
      .replace(/\{\{item\.title\}\}/g, esc(article.title))
      .replace(/\{\{item\.url\}\}/g, esc(article.url))
      .replace(/\{\{item\.content\}\}/g, esc(article.content))
      .replace(/\{\{item\.imageUrl\}\}/g, esc(article.imageUrl))
      .replace(/\{\{feed\.name\}\}/g, esc(source.name));

    try {
      return JSON.parse(rendered);
    } catch (e) {
      this.logger.error(
        `Invalid payload template for webhook ${webhook.id}`,
        e as Error,
      );
      return null;
    }
  }

  // -------------------------------------------------------- scheduling -----

  private async calculateNextFetch(source: Source, foundNewPosts: boolean) {
    const now = new Date();
    source.lastFetchAt = now;
    source.consecutiveMisses = foundNewPosts
      ? 0
      : (source.consecutiveMisses || 0) + 1;

    const lastArticles = await this.articleRepository.find({
      where: { source: { id: source.id } },
      order: { publishedAt: 'DESC' },
      take: 10,
    });

    const times = lastArticles
      .map((a) => a.publishedAt?.getTime())
      .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));

    const exp = Math.min(source.consecutiveMisses, MAX_BACKOFF_EXP);
    const backoff = Math.pow(1.5, exp);

    let baseMs: number;
    if (times.length >= 2) {
      let total = 0;
      for (let i = 0; i < times.length - 1; i++) {
        total += Math.abs(times[i] - times[i + 1]);
      }
      baseMs = Math.max(total / (times.length - 1), HOUR_MS);
    } else {
      baseMs = 24 * HOUR_MS;
    }

    let delayMs = baseMs * backoff;
    if (!Number.isFinite(delayMs) || delayMs <= 0) delayMs = 24 * HOUR_MS;
    delayMs = Math.min(delayMs, MAX_DELAY_MS);

    source.nextFetchAt = new Date(now.getTime() + delayMs);
    await this.sourceRepository.save(source);
    this.logger.log(
      `Source ${source.id} next fetch at ${source.nextFetchAt.toISOString()} (misses: ${source.consecutiveMisses})`,
    );
  }
}
