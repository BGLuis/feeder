import { Component, inject, signal, OnInit, computed, ViewChild, ElementRef } from '@angular/core';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { FeedsService, FeedSubscription } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';
import { RouterLink } from '@angular/router';
import { CodeEditorComponent, CodeTemplate } from '../ui/code-editor.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MainLayoutComponent, RouterLink, CodeEditorComponent],
  template: `
    <app-main-layout>
      <div class="max-w-6xl mx-auto py-8 md:py-12">
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 class="text-4xl tracking-tight font-medium text-zinc-900 dark:text-zinc-50 mb-2">
              Overview
            </h1>
            <p class="text-zinc-600 dark:text-zinc-400 text-lg">
              {{
                loading()
                  ? 'Loading your subscriptions…'
                  : (feeds().length === 1 ? '1 source' : feeds().length + ' sources') +
                    ' across ' +
                    (tags().length === 1 ? '1 tag' : tags().length + ' tags') +
                    ', processed privately.'
              }}
            </p>
          </div>
          <a
            routerLink="/discover"
            class="press inline-flex bg-zinc-100 dark:bg-white hover:bg-white text-zinc-950 px-6 py-3 rounded-full font-medium items-center justify-center gap-2 text-sm shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Feed
          </a>
        </header>

        <!-- Bento Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <div
            class="md:col-span-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/50 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between text-zinc-900 dark:text-white shadow-sm"
          >
            <div>
              <span
                class="text-zinc-600 dark:text-zinc-400 font-medium text-xs tracking-[0.1em] uppercase"
                >Active Subscriptions</span
              >
              <div class="mt-4 text-6xl font-light tracking-tighter">
                {{ loading() ? '—' : feeds().length }}
              </div>
            </div>
            <a
              routerLink="/discover"
              class="mt-12 inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
            >
              Add another feed
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>

          <div
            class="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/50 rounded-[2rem] p-8 md:p-10 flex flex-col justify-between shadow-sm"
          >
            <span class="text-zinc-500 font-medium text-sm">Tags</span>
            <div class="text-5xl font-light tracking-tighter text-zinc-900 dark:text-zinc-100 mt-6">
              {{ loading() ? '—' : tags().length }}
            </div>
            <a
              routerLink="/reader"
              class="mt-12 pt-5 border-t border-zinc-200 dark:border-zinc-800/50 text-sm text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors flex items-center justify-between"
            >
              <span>Open Timeline</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>
        </div>

        <!-- Editorial List -->
        <div>
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 class="text-xl font-medium text-zinc-900 dark:text-zinc-50 tracking-tight">
              Your Subscriptions
            </h2>
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
                (input)="searchQuery.set(searchInput.value)"
                type="text"
                placeholder="Search subscriptions..."
                class="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/50 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-600"
              />
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
              class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing"
            >
              <button
                (click)="selectedTag.set(null)"
                [class]="
                  !selectedTag()
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200'
                "
                class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
              >
                All
              </button>
              @for (tag of tags(); track tag) {
                <button
                  (click)="selectedTag.set(tag)"
                  [class]="
                    selectedTag() === tag
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200'
                  "
                  class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap capitalize inline-flex items-center gap-1"
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

          @if (loading()) {
            <div class="py-16 flex justify-center">
              <div
                class="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-200 rounded-full animate-spin"
              ></div>
            </div>
          } @else if (feeds().length === 0) {
            <div
              class="border border-zinc-300 dark:border-zinc-800 border-dashed rounded-[2rem] p-16 text-center flex flex-col items-center"
            >
              <div
                class="w-16 h-16 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mb-6"
              >
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                No feeds yet
              </h3>
              <p class="text-zinc-500 max-w-[40ch] mx-auto mb-8 leading-relaxed">
                You haven't subscribed to any feeds. Start exploring to populate your dashboard.
              </p>
              <a
                routerLink="/discover"
                class="bg-white text-zinc-950 px-6 py-3 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Add your first feed
              </a>
            </div>
          } @else {
            <div
              class="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-sm"
            >
              <ul class="divide-y divide-zinc-800/50">
                @for (feed of filteredFeeds(); track feed.id || feed.source?.url) {
                  <li
                    class="p-6 md:px-8 hover:bg-zinc-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div class="flex items-center gap-5">
                      <div
                        class="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-200 dark:bg-zinc-800 transition-colors overflow-hidden border border-zinc-300 dark:border-zinc-800"
                      >
                        <img
                          [src]="getFavicon(feed.source?.url)"
                          alt=""
                          class="w-6 h-6 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <h3 class="font-medium text-zinc-900 dark:text-zinc-100 text-base">
                            {{ feed.customName || feed.source?.name || 'Unnamed Feed' }}
                          </h3>
                          @for (tag of feed.tags || ['default']; track tag) {
                            <span
                              class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] uppercase font-bold tracking-wider"
                            >
                              <svg
                                class="w-3 h-3"
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
                            </span>
                          }
                        </div>
                        <a
                          [href]="feed.source?.url"
                          target="_blank"
                          class="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors line-clamp-1"
                        >
                          {{ feed.source?.url }}
                        </a>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <button
                        (click)="refreshFeed(feed)"
                        class="press p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-full transition-colors"
                        title="Force Sync (Fetch latest)"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                      <button
                        (click)="openEditModal(feed)"
                        class="p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 rounded-full transition-colors"
                        title="Edit subscription"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        (click)="deleteSubscription(feed)"
                        class="press p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                        title="Delete subscription"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                }

                @if (filteredFeeds().length === 0) {
                  <li class="p-8 text-center text-zinc-500 text-sm">No feeds for this tag.</li>
                }
              </ul>
            </div>
          }
        </div>
      </div>

      <!-- Edit Modal -->
      @if (editingFeed()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            class="bg-white dark:bg-[#121212] border border-zinc-300 dark:border-zinc-800 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              (click)="closeEditModal()"
              class="absolute top-6 right-6 text-zinc-500 hover:text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h2 class="text-2xl font-medium text-zinc-900 dark:text-zinc-50 tracking-tight mb-6">
              Edit Feed
            </h2>

            <div
              class="flex flex-col gap-5 mb-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            >
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >Feed Name</label
                >
                <input
                  #editNameInput
                  type="text"
                  [value]="editingFeed()?.customName || editingFeed()?.source?.name || ''"
                  class="w-full px-4 py-3 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >Tags
                <span class="text-zinc-500 font-normal ml-1">(Press Enter or Comma)</span></label
              >
              <div
                class="flex flex-wrap items-center gap-2 p-2 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all min-h-[52px] text-zinc-900 dark:text-zinc-100"
              >
                @for (tag of editCurrentTags(); track tag) {
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium"
                  >
                    <svg
                      class="w-3 h-3 text-zinc-500"
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
                    <button
                      type="button"
                      (click)="removeEditTag(tag)"
                      class="text-zinc-500 hover:text-zinc-900 dark:text-white transition-colors ml-0.5 focus:outline-none"
                    >
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                }
                <input
                  type="text"
                  #editTagsInput
                  (keydown.enter)="
                    $event.preventDefault();
                    addEditTag(editTagsInput.value);
                    editTagsInput.value = ''
                  "
                  (keydown.comma)="
                    $event.preventDefault();
                    addEditTag(editTagsInput.value);
                    editTagsInput.value = ''
                  "
                  (blur)="addEditTag(editTagsInput.value); editTagsInput.value = ''"
                  placeholder="add tag..."
                  class="flex-1 min-w-[120px] bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-600 px-2 py-1 text-sm"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >Source URL</label
                >
                <input
                  #editUrlInput
                  type="text"
                  [value]="editingFeed()?.source?.url || ''"
                  class="w-full px-4 py-3 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-800 dark:text-zinc-200 font-mono"
                />
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >Advanced Selectors (JSON)</label
                >
                <app-code-editor
                  title="Seletores HTML"
                  language="json"
                  height="200px"
                  [code]="tempSelectorsJson"
                  [templates]="selectorTemplates"
                  (codeChange)="tempSelectorsJson = $event"
                ></app-code-editor>
                <p class="text-xs text-zinc-500">Leave empty for standard RSS feeds.</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3">
              <button
                (click)="closeEditModal()"
                class="px-5 py-2.5 rounded-full text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                (click)="saveEdit(editNameInput.value, editUrlInput.value, tempSelectorsJson)"
                [disabled]="isSaving()"
                class="inline-flex bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2.5 rounded-full font-medium transition-colors items-center justify-center gap-2 text-sm shadow-sm"
              >
                @if (isSaving()) {
                  <span
                    class="inline-block w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin"
                  ></span>
                  Saving...
                } @else {
                  Save Changes
                }
              </button>
            </div>
          </div>
        </div>
      }
    </app-main-layout>
  `,
})
export class DashboardComponent implements OnInit {
  private feedsService = inject(FeedsService);
  private toast = inject(ToastService);

  feeds = signal<FeedSubscription[]>([]);
  loading = signal(true);
  selectedTag = signal<string | null>(null);
  searchQuery = signal('');

  editingFeed = signal<FeedSubscription | null>(null);
  isSaving = signal(false);

  // Drag to scroll
  @ViewChild('tagContainer') tagContainer?: ElementRef;
  private isDragging = false;
  private startX = 0;
  private scrollLeft = 0;

  tempSelectorsJson = '';

  editCurrentTags = signal<string[]>([]);

  addEditTag(tagValue: string) {
    const tag = tagValue.trim().toLowerCase();
    if (tag && !this.editCurrentTags().includes(tag)) {
      this.editCurrentTags.update((tags) => [...tags, tag]);
    }
  }

  removeEditTag(tagToRemove: string) {
    this.editCurrentTags.update((tags) => tags.filter((t) => t !== tagToRemove));
  }

  selectorTemplates: CodeTemplate[] = [
    { name: 'RSS Padrão (Limpar)', code: '' },
    {
      name: 'Artigo Simples',
      code: '{\n  "title": "h1",\n  "content": ".article-body",\n  "author": ".author-name"\n}',
    },
    {
      name: 'Medium / Substack',
      code: '{\n  "title": "h1",\n  "content": "article",\n  "date": "time"\n}',
    },
  ];

  tags = computed(() => {
    const allTags = new Set(
      this.feeds().flatMap((f) => (f.tags && f.tags.length > 0 ? f.tags : ['default'])),
    );
    return Array.from(allTags).sort();
  });

  filteredFeeds = computed(() => {
    let feeds = this.feeds();
    const tag = this.selectedTag();
    const q = this.searchQuery().toLowerCase();

    if (tag) {
      feeds = feeds.filter((f) =>
        (f.tags && f.tags.length > 0 ? f.tags : ['default']).includes(tag),
      );
    }

    if (q) {
      feeds = feeds.filter(
        (f) =>
          (f.customName || '').toLowerCase().includes(q) ||
          (f.source?.name || '').toLowerCase().includes(q) ||
          (f.source?.url || '').toLowerCase().includes(q),
      );
    }

    return feeds;
  });

  async ngOnInit() {
    this.loadFeeds();
  }

  // Drag to scroll logic
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
    const walk = (x - this.startX) * 1.5;
    el.scrollLeft = this.scrollLeft - walk;
  }

  async loadFeeds() {
    this.loading.set(true);
    try {
      const data = await this.feedsService.getSubscriptions();
      this.feeds.set(data || []);
    } catch (err) {
      console.error('Falha ao carregar feeds', err);
      this.feeds.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  openEditModal(feed: FeedSubscription) {
    this.editingFeed.set(feed);
    this.tempSelectorsJson = this.getSelectorsJson(feed);
    this.editCurrentTags.set(feed.tags && feed.tags.length > 0 ? feed.tags : ['default']);
  }

  closeEditModal() {
    this.editingFeed.set(null);
  }

  async refreshFeed(feed: FeedSubscription) {
    const name = feed.customName || feed.source?.name || 'feed';
    try {
      await this.toast.promise(this.feedsService.refreshSubscription(feed.id!), {
        loading: `Queuing sync for ${name}…`,
        success: `${name} queued for sync`,
        error: `Could not sync ${name}`,
      });
    } catch (e) {
      console.error('Failed to force sync', e);
    }
  }

  getSelectorsJson(feed: FeedSubscription | null): string {
    if (!feed || !feed.source || !feed.source.selectors) return '';
    return JSON.stringify(feed.source.selectors, null, 2);
  }

  getFavicon(url: string | undefined): string {
    if (!url) return '';
    try {
      const hostname = new URL(url).hostname;
      // Shown in a 24px slot — request 2x so it stays crisp on retina screens.
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } catch {
      return '';
    }
  }

  async saveEdit(newName: string, newUrl: string, newSelectorsStr: string) {
    const feed = this.editingFeed();
    if (!feed) return;

    let selectorsObj = undefined;
    if (newSelectorsStr && newSelectorsStr.trim() !== '') {
      try {
        selectorsObj = JSON.parse(newSelectorsStr);
      } catch (err) {
        alert('Invalid JSON format in Selectors field!');
        return;
      }
    } else if (newSelectorsStr.trim() === '') {
      selectorsObj = null; // Clear selectors
    }

    this.isSaving.set(true);
    try {
      const tagsArray = this.editCurrentTags();
      await this.feedsService.updateSubscription(feed.id!, {
        customName: newName,
        tags: tagsArray.length > 0 ? tagsArray : ['default'],
        url: newUrl,
        selectors: selectorsObj,
      });
      await this.loadFeeds();
      this.closeEditModal();
      this.toast.success('Feed updated', { description: newName || feed.source?.name });
    } catch (e) {
      console.error(e);
      this.toast.error('Could not save changes', { description: 'Your edits were not applied.' });
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteSubscription(feed: FeedSubscription) {
    const id = feed.id!;
    const name = feed.customName || feed.source?.name || 'Subscription';
    // Optimistic: drop it now, offer an undo window before the API call lands.
    const snapshot = this.feeds();
    this.feeds.update((list) => list.filter((f) => f.id !== id));

    let undone = false;
    this.toast.info('Subscription removed', {
      description: name,
      duration: 5000,
      action: {
        label: 'Undo',
        run: () => {
          undone = true;
          this.feeds.set(snapshot);
        },
      },
    });

    setTimeout(async () => {
      if (undone) return;
      try {
        await this.feedsService.deleteSubscription(id);
      } catch (err) {
        console.error('Failed to delete', err);
        this.feeds.set(snapshot);
        this.toast.error('Could not remove subscription', { description: name });
      }
    }, 5000);
  }
}
