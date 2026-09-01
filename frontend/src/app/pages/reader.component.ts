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
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { FeedsService } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

type Density = 'compact' | 'comfortable' | 'magazine';
type ViewFilter = 'all' | 'unread' | 'saved';
type ImgState = 'loading' | 'ok' | 'small' | 'error';

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
  imports: [MainLayoutComponent, CommonModule],
  template: `
    <app-main-layout>
      <div class="max-w-4xl mx-auto py-8 md:py-12">
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 class="text-4xl tracking-tight font-medium text-zinc-900 dark:text-zinc-50 mb-2">
              Timeline
            </h1>
            <p class="text-zinc-600 dark:text-zinc-400 text-lg">
              {{ unreadCount() > 0 ? unreadCount() + ' unread' : 'You are all caught up' }}
            </p>
          </div>
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative w-full md:w-64">
              <svg
                class="w-4 h-4 absolute left-3 top-2.5 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                #searchInput
                (input)="onSearch(searchInput.value)"
                type="text"
                placeholder="Search articles..."
                class="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-600"
              />
            </div>
            <button
              (click)="refresh(true)"
              [disabled]="loading()"
              class="press inline-flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-5 py-2 rounded-full font-medium items-center justify-center gap-2 text-sm shadow-sm flex-shrink-0"
            >
              <svg
                class="w-4 h-4"
                [class.animate-spin]="loading()"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        <!-- Controls: view filter + density -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div
            class="inline-flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-full p-1 gap-1"
          >
            @for (v of viewFilters; track v.id) {
              <button
                (click)="setView(v.id)"
                class="press px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors"
                [class]="
                  view() === v.id
                    ? 'bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                "
              >
                {{ v.label }}
              </button>
            }
          </div>
          <div
            class="inline-flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-full p-1 gap-1"
            title="Display density"
          >
            <button
              (click)="setDensity('compact')"
              aria-label="Compact"
              class="press w-8 h-7 rounded-full inline-flex items-center justify-center transition-colors"
              [class]="
                density() === 'compact'
                  ? 'bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              "
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              (click)="setDensity('comfortable')"
              aria-label="Comfortable"
              class="press w-8 h-7 rounded-full inline-flex items-center justify-center transition-colors"
              [class]="
                density() === 'comfortable'
                  ? 'bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              "
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M4 7h16M4 14h16" />
              </svg>
            </button>
            <button
              (click)="setDensity('magazine')"
              aria-label="Magazine"
              class="press w-8 h-7 rounded-full inline-flex items-center justify-center transition-colors"
              [class]="
                density() === 'magazine'
                  ? 'bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              "
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <rect x="4" y="4" width="16" height="9" rx="1" />
                <path d="M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Tag Filter -->
        @if (tags().length > 0) {
          <div
            #tagContainer
            (mousedown)="startDrag($event)"
            (mouseleave)="stopDrag()"
            (mouseup)="stopDrag()"
            (mousemove)="onDrag($event)"
            class="flex items-center gap-2 overflow-x-auto pb-6 mb-2 scrollbar-hide border-b border-zinc-200 dark:border-zinc-800/50 cursor-grab active:cursor-grabbing"
          >
            <button
              (click)="selectTag(null)"
              [class]="
                !selectedTag()
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              "
              class="press px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            >
              All News
            </button>
            @for (tag of tags(); track tag) {
              <button
                (click)="selectTag(tag)"
                [class]="
                  selectedTag() === tag
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                "
                class="press px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap capitalize inline-flex items-center gap-1"
              >
                <svg
                  class="w-3.5 h-3.5 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {{ tag }}
              </button>
            }
          </div>
        }

        <!-- Loading skeletons -->
        @if (loading() && articles().length === 0) {
          <div class="space-y-4 pt-2">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <div class="border border-zinc-200 dark:border-zinc-800/50 rounded-[1.25rem] p-5">
                <div class="flex items-center gap-3 mb-3">
                  <div class="skeleton w-5 h-5 rounded-md"></div>
                  <div class="skeleton h-3 w-28 rounded"></div>
                </div>
                <div class="skeleton h-4 w-3/4 rounded mb-2.5"></div>
                <div class="skeleton h-3 w-full rounded"></div>
              </div>
            }
          </div>
        } @else if (visibleGroups().length === 0) {
          <div
            class="border border-zinc-300 dark:border-zinc-800 border-dashed rounded-[2rem] p-16 text-center flex flex-col items-center"
          >
            <div
              class="w-16 h-16 bg-zinc-100 dark:bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mb-6"
            >
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-3">
              {{
                view() === 'saved'
                  ? 'Nothing saved yet'
                  : view() === 'unread'
                    ? 'Nothing unread'
                    : 'No articles found'
              }}
            </h3>
            <p class="text-zinc-500 max-w-[42ch] mx-auto leading-relaxed mb-6">
              {{
                view() === 'saved'
                  ? 'Tap the bookmark on any article to keep it here.'
                  : view() === 'unread'
                    ? 'Every article in this view has been read.'
                    : 'Nothing has landed here yet.'
              }}
            </p>
            @if (view() === 'all') {
              <button
                (click)="refresh(true)"
                class="press bg-zinc-100 dark:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-colors"
              >
                Sync now
              </button>
            } @else {
              <button
                (click)="setView('all')"
                class="press bg-zinc-100 dark:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-colors"
              >
                Show all articles
              </button>
            }
          </div>
        } @else {
          @for (group of visibleGroups(); track group.label) {
            <section class="mb-8">
              <h2 class="text-xs font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3 pl-1">
                {{ group.label }}
              </h2>

              <!-- Compact -->
              @if (density() === 'compact') {
                <ul
                  class="rounded-[1.25rem] border border-zinc-200 dark:border-zinc-800/50 overflow-hidden bg-white dark:bg-[#121212]"
                >
                  @for (article of group.items; track article.id; let i = $index) {
                    <li
                      class="rise-in relative flex items-start gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                      [style.--i]="i"
                      [class.opacity-60]="isRead(article.id)"
                    >
                      @if (!isRead(article.id)) {
                        <span
                          class="absolute left-0 top-3 bottom-3 w-[2px] rounded bg-emerald-500"
                        ></span>
                      }
                      <span
                        class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                        [style.background]="brandColor(article)"
                      >
                        {{ initial(article) }}
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-0.5">
                          <span class="font-medium text-zinc-600 dark:text-zinc-400 truncate">{{
                            article.source?.name || 'Feed'
                          }}</span>
                          <span>·</span
                          ><span class="whitespace-nowrap">{{
                            relativeTime(article.publishedAt)
                          }}</span>
                        </div>
                        <a
                          [href]="article.url"
                          target="_blank"
                          rel="noopener"
                          (click)="markRead(article)"
                          class="block text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          {{ article.title }}
                        </a>
                      </div>
                      <div class="flex shrink-0 items-center gap-0.5">
                        <ng-container
                          [ngTemplateOutlet]="rowActions"
                          [ngTemplateOutletContext]="{ $implicit: article }"
                        ></ng-container>
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <!-- Comfortable + Magazine -->
                <div class="space-y-4">
                  @for (article of group.items; track article.id; let i = $index) {
                    <article
                      class="rise-in relative bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/50 rounded-[1.5rem] p-6 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 group"
                      [style.--i]="i"
                      [class.opacity-70]="isRead(article.id)"
                    >
                      @if (!isRead(article.id)) {
                        <span
                          class="absolute left-0 top-6 bottom-6 w-[3px] rounded bg-emerald-500"
                        ></span>
                      }

                      <div class="flex items-center gap-3 mb-4">
                        <span
                          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                          [style.background]="brandColor(article)"
                        >
                          {{ initial(article) }}
                        </span>
                        <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">{{
                          article.source?.name || 'Feed'
                        }}</span>
                        <span class="text-zinc-600 text-xs">•</span>
                        <time class="text-sm text-zinc-500">{{
                          relativeTime(article.publishedAt)
                        }}</time>
                        <div
                          class="ml-auto flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <ng-container
                            [ngTemplateOutlet]="rowActions"
                            [ngTemplateOutletContext]="{ $implicit: article }"
                          ></ng-container>
                        </div>
                      </div>

                      <h2
                        class="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-3 leading-snug"
                      >
                        <a
                          [href]="article.url"
                          target="_blank"
                          rel="noopener"
                          (click)="markRead(article)"
                          class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >{{ article.title }}</a
                        >
                      </h2>

                      @if (
                        density() === 'magazine' &&
                        article.imageUrl &&
                        imgState(article.id) !== 'error'
                      ) {
                        <figure
                          class="mb-5 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800/50 bg-zinc-100 dark:bg-zinc-900 aspect-video relative"
                          [class.skeleton]="imgState(article.id) === 'loading'"
                        >
                          @if (imgState(article.id) === 'small') {
                            <img
                              [src]="article.imageUrl"
                              alt=""
                              aria-hidden="true"
                              class="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60"
                            />
                          }
                          <img
                            [src]="article.imageUrl"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            referrerpolicy="no-referrer"
                            class="media-fade relative w-full h-full"
                            [class.object-cover]="imgState(article.id) !== 'small'"
                            [class.object-contain]="imgState(article.id) === 'small'"
                            [class.is-loaded]="
                              imgState(article.id) === 'ok' || imgState(article.id) === 'small'
                            "
                            (load)="onImgLoad(article.id, $event)"
                            (error)="setImg(article.id, 'error')"
                          />
                        </figure>
                      }

                      @if (article.content) {
                        <p
                          class="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6"
                          [class.line-clamp-2]="density() === 'comfortable'"
                          [class.line-clamp-3]="density() === 'magazine'"
                        >
                          {{ article.content }}
                        </p>
                      }

                      <div
                        class="flex items-center gap-4 border-t border-zinc-200 dark:border-zinc-800/50 pt-4 mt-4"
                      >
                        <a
                          [href]="article.url"
                          target="_blank"
                          rel="noopener"
                          (click)="markRead(article)"
                          class="text-xs font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          Read Full Post
                          <svg
                            class="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </a>
                        <button
                          (click)="toggleRead(article)"
                          class="press ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        >
                          {{ isRead(article.id) ? 'Mark unread' : 'Mark read' }}
                        </button>
                      </div>
                    </article>
                  }
                </div>
              }
            </section>
          }

          <div #scrollAnchor class="flex justify-center pt-4 h-12">
            @if (loading() && hasMore()) {
              <svg
                class="w-5 h-5 animate-spin text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            }
          </div>
        }
      </div>
    </app-main-layout>

    <!-- Per-row action buttons (save / mark read) -->
    <ng-template #rowActions let-article>
      <button
        (click)="toggleSaved(article)"
        class="press rounded-lg p-1.5 transition-colors"
        [class]="
          isSaved(article.id)
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
        "
        [attr.aria-label]="isSaved(article.id) ? 'Remove from saved' : 'Save article'"
      >
        <svg
          class="w-4 h-4"
          viewBox="0 0 24 24"
          [attr.fill]="isSaved(article.id) ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
          />
        </svg>
      </button>
      <button
        (click)="toggleRead(article)"
        class="press rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        [attr.aria-label]="isRead(article.id) ? 'Mark as unread' : 'Mark as read'"
      >
        @if (isRead(article.id)) {
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        } @else {
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.4"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5" />
          </svg>
        }
      </button>
    </ng-template>
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
  private imgStates = signal<Record<string, ImgState>>({});

  page = signal(1);
  hasMore = signal(true);
  searchQuery = signal('');

  readonly viewFilters = [
    { id: 'all' as ViewFilter, label: 'All' },
    { id: 'unread' as ViewFilter, label: 'Unread' },
    { id: 'saved' as ViewFilter, label: 'Saved' },
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

  // ---- local read / saved state -------------------------------------------

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

  // ---- imagery -----------------------------------------------------------

  imgState(id: string): ImgState {
    return this.imgStates()[id] ?? 'loading';
  }

  setImg(id: string, state: ImgState) {
    this.imgStates.update((m) => ({ ...m, [id]: state }));
  }

  onImgLoad(id: string, ev: Event) {
    const img = ev.target as HTMLImageElement;
    // Below the slot width the source would be upscaled and blurry — letterbox
    // it over a blurred copy of itself instead of stretching.
    this.setImg(id, img.naturalWidth > 0 && img.naturalWidth < 480 ? 'small' : 'ok');
  }

  initial(article: any): string {
    const name = article.source?.name || article.source?.url || 'F';
    return name
      .replace(/^https?:\/\/(www\.)?/, '')
      .charAt(0)
      .toUpperCase();
  }

  /** Deterministic, evenly-spread brand colour from the source identity. */
  brandColor(article: any): string {
    const seed = article.source?.url || article.source?.name || article.source?.id || 'feed';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 55% 45%)`;
  }

  // ---- time formatting -------------------------------------------------

  relativeTime(value: string | Date | undefined): string {
    if (!value) return '';
    const then = new Date(value).getTime();
    if (!Number.isFinite(then)) return '';
    const diff = Date.now() - then;
    const min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.round(hr / 24);
    if (day < 7) return `${day}d`;
    return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

  // ---- data loading ----------------------------------------------------

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

  // ---- drag-to-scroll for the tag rail --------------------------------

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
