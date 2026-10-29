import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  type WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedsService } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LucideRefreshCw } from '@lucide/angular';
import { PageHeaderComponent } from '../ui/molecules/page-header.component';
import { ArticleCardComponent, ArticleDensity } from '../ui/molecules/article-card.component';
import { EmptyStateComponent } from '../ui/molecules/empty-state.component';
import { SkeletonComponent } from '../ui/molecules/skeleton.component';
import { SearchFieldComponent } from '../ui/atoms/search-field.component';
import { SegmentedComponent, SegmentOption } from '../ui/atoms/segmented.component';
import { ChipComponent } from '../ui/atoms/chip.component';
import { ButtonComponent } from '../ui/atoms/button.component';

type Density = 'compact' | 'comfortable' | 'magazine';
type ViewFilter = 'all' | 'unread' | 'saved';

interface ArticleGroup {
  label: string;
  items: any[];
}

const DENSITY_KEY = 'feeder_reader_density';
const READ_KEY = 'feeder_read_articles';
const SAVED_KEY = 'feeder_saved_articles';
const LOCAL_CAP = 1000;

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [
    CommonModule,
    LucideRefreshCw,
    PageHeaderComponent,
    ArticleCardComponent,
    EmptyStateComponent,
    SkeletonComponent,
    SearchFieldComponent,
    SegmentedComponent,
    ChipComponent,
    ButtonComponent,
  ],
  template: `
    <div class="max-w-[768px] mx-auto">
        <!-- Page Header -->
        <app-page-header
          title="Timeline"
          [subtitle]="unreadCount() > 0 ? unreadCount() + ' unread' : 'You are all caught up'"
        >
          <div actions class="flex items-center gap-2">
            <app-button
              (click)="refresh(true)"
              [disabled]="loading()"
              variant="secondary"
              size="md"
            >
              <svg
                lucideRefreshCw
                class="w-4 h-4"
                [class.animate-spin-sync]="loading()"
              ></svg>
              <span>Refresh</span>
            </app-button>
          </div>
        </app-page-header>

        <!-- Search Bar -->
        <div class="mb-5">
          <app-search-field
            [value]="searchQuery()"
            (valueChange)="onSearch($event)"
            placeholder="Search articles..."
          ></app-search-field>
        </div>

        <!-- Controls: view filter + density -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
          <app-segmented
            [options]="viewOptions"
            [value]="view()"
            (valueChange)="setView($event)"
            ariaLabel="View filter"
          ></app-segmented>

          <app-segmented
            [options]="densityOptions"
            [value]="density()"
            (valueChange)="setDensity($event)"
            ariaLabel="Density toggle"
          ></app-segmented>
        </div>

        <!-- Tag rail -->
        @if (tags().length > 0) {
          <div
            #tagContainer
            (mousedown)="startDrag($event)"
            (mouseleave)="stopDrag()"
            (mouseup)="stopDrag()"
            (mousemove)="onDrag($event)"
            class="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          >
            <app-chip
              label="All News"
              [selected]="!selectedTag()"
              (click)="selectTag(null)"
            ></app-chip>
            @for (tag of tags(); track tag) {
              <app-chip
                [label]="tag"
                [selected]="selectedTag() === tag"
                (click)="selectTag(tag)"
              ></app-chip>
            }
          </div>
        }

        <!-- Loading skeletons -->
        @if (loading() && articles().length === 0) {
          <div class="space-y-4">
            <app-skeleton variant="article"></app-skeleton>
            <app-skeleton variant="article"></app-skeleton>
            <app-skeleton variant="article"></app-skeleton>
          </div>
        } @else if (visibleGroups().length === 0) {
          <app-empty-state
            [title]="
              view() === 'saved'
                ? 'Nothing saved yet'
                : view() === 'unread'
                  ? 'Nothing unread'
                  : 'No articles found'
            "
            [description]="
              view() === 'saved'
                ? 'Tap the bookmark on any article to keep it here.'
                : view() === 'unread'
                  ? 'Every article in this view has been read.'
                  : 'Nothing has landed here yet.'
            "
          >
            <div action>
              @if (view() === 'all') {
                <app-button (click)="refresh(true)" variant="primary" size="md">
                  Sync now
                </app-button>
              } @else {
                <app-button (click)="setView('all')" variant="primary" size="md">
                  Show all articles
                </app-button>
              }
            </div>
          </app-empty-state>
        } @else {
          @for (group of visibleGroups(); track group.label) {
            <section class="mb-8">
              <h2 class="text-overline uppercase text-text-tertiary mb-3 pl-1 font-semibold tracking-wider">
                {{ group.label }}
              </h2>

              <!-- Compact container -->
              @if (density() === 'compact') {
                <div
                  class="rounded-2xl border border-border-default overflow-hidden bg-bg-surface divide-y divide-border-subtle shadow-elevation-1"
                >
                  @for (article of group.items; track article.id) {
                    <app-article-card
                      class="rise-in block"
                      [style.--i]="$index < 8 ? $index : 8"
                      [article]="article"
                      density="compact"
                      [isRead]="isRead(article.id)"
                      [isSaved]="isSaved(article.id)"
                      [brandColor]="brandColor(article)"
                      (markRead)="toggleRead(article)"
                      (toggleSave)="toggleSaved(article)"
                      (openLink)="markRead(article)"
                    ></app-article-card>
                  }
                </div>
              } @else {
                <!-- Comfortable & Magazine -->
                <div class="space-y-4">
                  @for (article of group.items; track article.id) {
                    <app-article-card
                      class="rise-in block"
                      [style.--i]="$index < 8 ? $index : 8"
                      [article]="article"
                      [density]="density()"
                      [isRead]="isRead(article.id)"
                      [isSaved]="isSaved(article.id)"
                      [brandColor]="brandColor(article)"
                      (markRead)="toggleRead(article)"
                      (toggleSave)="toggleSaved(article)"
                      (openLink)="markRead(article)"
                    ></app-article-card>
                  }
                </div>
              }
            </section>
          }

          <div #scrollAnchor class="flex justify-center pt-4 h-12">
            @if (loading() && hasMore()) {
              <svg
                lucideRefreshCw
                class="w-5 h-5 animate-spin text-icon-secondary"
              ></svg>
            }
          </div>
        }
      </div>
  `,
})
export class ReaderComponent implements OnInit, OnDestroy {
  private feedsService = inject(FeedsService);
  private toast = inject(ToastService);

  articles = signal<any[]>([]);
  loading = signal(true);
  tags = signal<string[]>([]);
  selectedTag = signal<string | null>(null);

  density = signal<Density>(this.readDensity());
  view = signal<ViewFilter>('all');

  readIds = signal<Set<string>>(this.readSet(READ_KEY));
  savedIds = signal<Set<string>>(this.readSet(SAVED_KEY));

  page = signal(1);
  hasMore = signal(true);
  searchQuery = signal('');

  readonly viewOptions: SegmentOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
    { label: 'Saved', value: 'saved' },
  ];

  readonly densityOptions: SegmentOption[] = [
    { label: 'Compact', value: 'compact' },
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Magazine', value: 'magazine' },
  ];

  @ViewChild('tagContainer') tagContainer?: ElementRef;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  private limit = 20;

  private observer?: IntersectionObserver;
  private _scrollAnchor?: ElementRef;

  @ViewChild('scrollAnchor') set scrollAnchor(el: ElementRef | undefined) {
    if (el) {
      this._scrollAnchor = el;
      this.setupObserver();
    }
  }

  unreadCount = computed(() => this.articles().filter((a) => !this.readIds().has(a.id)).length);

  private filtered = computed(() => {
    const v = this.view();
    return this.articles().filter((a) => {
      if (v === 'unread') return !this.readIds().has(a.id);
      if (v === 'saved') return this.savedIds().has(a.id);
      return true;
    });
  });

  visibleGroups = computed<ArticleGroup[]>(() => {
    const groups: ArticleGroup[] = [];
    let current: ArticleGroup | null = null;
    for (const a of this.filtered()) {
      const label = this.dayLabel(a.publishedAt);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(a);
    }
    return groups;
  });

  async ngOnInit() {
    this.loadTags();
    this.searchSub = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.refresh();
      });
    this.loadArticles(true);
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
    this.observer?.disconnect();
  }

  setupObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && this.hasMore() && !this.loading()) {
          this.loadArticles();
        }
      },
      { rootMargin: '200px' },
    );
    if (this._scrollAnchor) this.observer.observe(this._scrollAnchor.nativeElement);
  }

  onSearch(query: string) {
    this.searchSubject.next(query);
  }

  async refresh(manual = false) {
    if (manual) {
      await this.toast.promise(this.reloadFromApi(), {
        loading: 'Syncing your timeline…',
        success: (n) =>
          n > 0 ? `Timeline updated · ${n} article${n === 1 ? '' : 's'}` : 'Timeline is up to date',
        error: 'Could not refresh the timeline',
      });
      return;
    }
    this.loadArticles(true);
  }

  private async reloadFromApi(): Promise<number> {
    this.page.set(1);
    this.hasMore.set(true);
    this.loading.set(true);
    try {
      const response = await this.feedsService.getArticles(
        this.selectedTag() || undefined,
        this.searchQuery() || undefined,
        1,
        this.limit,
      );
      const data = response.data || [];
      this.articles.set(data);
      this.hasMore.set(response.page < response.totalPages);
      if (this.hasMore()) this.page.set(2);
      return response.total ?? data.length;
    } finally {
      this.loading.set(false);
    }
  }

  async loadTags() {
    try {
      const subs = await this.feedsService.getSubscriptions();
      const allTags = new Set(
        (subs || []).flatMap((s) => (s.tags && s.tags.length > 0 ? s.tags : ['default'])),
      );
      this.tags.set(Array.from(allTags).sort());
    } catch {
      /* tags are optional chrome */
    }
  }

  selectTag(tag: string | null) {
    this.selectedTag.set(tag);
    this.refresh();
  }

  setDensity(d: Density) {
    this.density.set(d);
    try {
      localStorage.setItem(DENSITY_KEY, d);
    } catch {
      /* private mode */
    }
  }

  setView(v: ViewFilter) {
    this.view.set(v);
  }

  isRead(id: string) {
    return this.readIds().has(id);
  }
  isSaved(id: string) {
    return this.savedIds().has(id);
  }

  markRead(article: any) {
    if (this.readIds().has(article.id)) return;
    this.mutateSet(this.readIds, READ_KEY, article.id, true);
  }

  toggleRead(article: any) {
    const next = !this.readIds().has(article.id);
    this.mutateSet(this.readIds, READ_KEY, article.id, next);
  }

  toggleSaved(article: any) {
    const next = !this.savedIds().has(article.id);
    this.mutateSet(this.savedIds, SAVED_KEY, article.id, next);
    this.toast.info(next ? 'Saved' : 'Removed from saved', {
      description: article.title,
      action: {
        label: 'Undo',
        run: () => this.mutateSet(this.savedIds, SAVED_KEY, article.id, !next),
      },
      duration: 3500,
    });
  }

  private mutateSet(sig: WritableSignal<Set<string>>, key: string, id: string, add: boolean) {
    const next = new Set(sig());
    if (add) next.add(id);
    else next.delete(id);
    sig.set(next);
    try {
      localStorage.setItem(key, JSON.stringify([...next].slice(-LOCAL_CAP)));
    } catch {
      /* ignore quota / private mode */
    }
  }

  private readSet(key: string): Set<string> {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private readDensity(): Density {
    try {
      const v = localStorage.getItem(DENSITY_KEY);
      if (v === 'compact' || v === 'comfortable' || v === 'magazine') return v;
    } catch {
      /* ignore */
    }
    return 'comfortable';
  }

  brandColor(article: any): string {
    const seed = article.source?.url || article.source?.name || article.source?.id || 'feed';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 55% 45%)`;
  }

  private dayLabel(value: string | Date | undefined): string {
    if (!value) return 'Earlier';
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return 'Earlier';
    const today = new Date();
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(today) - startOf(d)) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }

  async loadArticles(reset = false) {
    if (reset) {
      this.page.set(1);
      this.articles.set([]);
      this.hasMore.set(true);
    }
    if (!this.hasMore()) return;

    this.loading.set(true);
    try {
      const response = await this.feedsService.getArticles(
        this.selectedTag() || undefined,
        this.searchQuery() || undefined,
        this.page(),
        this.limit,
      );
      const newArticles = response.data || [];
      if (reset) this.articles.set(newArticles);
      else this.articles.update((prev) => [...prev, ...newArticles]);

      this.hasMore.set(response.page < response.totalPages);
      if (this.hasMore()) this.page.update((p) => p + 1);
    } catch (err) {
      console.error('Falha ao carregar artigos', err);
      if (!reset) this.toast.error('Could not load more articles');
    } finally {
      this.loading.set(false);
    }
  }

  startDrag(e: MouseEvent) {
    this.isDragging = true;
    const el = this.tagContainer?.nativeElement;
    if (!el) return;
    this.startX = e.pageX - el.offsetLeft;
    this.scrollLeft = el.scrollLeft;
  }
  stopDrag() {
    this.isDragging = false;
  }
  onDrag(e: MouseEvent) {
    if (!this.isDragging) return;
    e.preventDefault();
    const el = this.tagContainer?.nativeElement;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = this.scrollLeft - (x - this.startX) * 1.5;
  }
}
