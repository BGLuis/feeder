import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { FeedsService } from '../core/services/feeds.service';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [MainLayoutComponent, CommonModule],
  template: `
    <app-main-layout>
      <div class="max-w-4xl mx-auto py-8 md:py-12">
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 class="text-4xl tracking-tight font-medium text-zinc-50 mb-2">Timeline</h1>
            <p class="text-zinc-400 text-lg">Your chronological feed of articles.</p>
          </div>
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative w-full md:w-64">
              <svg class="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input #searchInput (input)="searchQuery.set(searchInput.value)" type="text" placeholder="Search articles..." class="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200 placeholder:text-zinc-600">
            </div>
            <button (click)="loadArticles()" [disabled]="loading()" class="inline-flex bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-5 py-2 rounded-full font-medium transition-colors items-center justify-center gap-2 text-sm shadow-sm flex-shrink-0">
              <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </header>

        <!-- Tag Filter -->
        @if (tags().length > 0) {
          <div class="flex items-center gap-2 overflow-x-auto pb-6 mb-2 scrollbar-hide border-b border-zinc-800/50">
            <button 
              (click)="selectTag(null)"
              [class]="!selectedTag() ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
              class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap">
              All News
            </button>
            @for (tag of tags(); track tag) {
              <button 
                (click)="selectTag(tag)"
                [class]="selectedTag() === tag ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap capitalize inline-flex items-center gap-1">
                <svg class="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ tag }}
              </button>
            }
          </div>
        }

        <div class="space-y-6">
          @if (loading() && articles().length === 0) {
            <div class="py-16 flex justify-center">
              <div class="w-8 h-8 border-2 border-zinc-800 border-t-zinc-200 rounded-full animate-spin"></div>
            </div>
          } @else if (filteredArticles().length === 0) {
            <div class="border border-zinc-800 border-dashed rounded-[2rem] p-16 text-center flex flex-col items-center">
              <div class="w-16 h-16 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mb-6">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 class="text-xl font-medium text-zinc-200 mb-3">No articles found</h3>
              <p class="text-zinc-500 max-w-[40ch] mx-auto leading-relaxed">It seems there are no items to display yet. Wait for the engine to fetch the latest feeds.</p>
            </div>
          } @else {
            @for (article of filteredArticles(); track article.id) {
              <article class="bg-[#121212] border border-zinc-800/50 rounded-[1.5rem] p-6 hover:border-zinc-700 transition-colors group">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-xs text-zinc-500 font-medium">
                    {{ article.source?.name?.charAt(0) || 'F' }}
                  </div>
                  <span class="text-sm font-medium text-zinc-400">{{ article.source?.name || 'Feed' }}</span>
                  <span class="text-zinc-600 text-xs">•</span>
                  <time class="text-sm text-zinc-500">{{ article.publishedAt | date:'mediumDate' }}</time>
                </div>
                
                <h2 class="text-xl font-medium text-zinc-100 mb-3 group-hover:text-white transition-colors leading-snug">
                  <a [href]="article.url" target="_blank">{{ article.title }}</a>
                </h2>
                
                @if (article.imageUrl) {
                  <div class="mb-5 rounded-xl overflow-hidden border border-zinc-800/50 bg-zinc-900 aspect-video relative">
                    <img [src]="article.imageUrl" alt="Cover" class="w-full h-full object-cover" loading="lazy" />
                  </div>
                }
                
                @if (article.content) {
                  <p class="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-6">{{ article.content }}</p>
                }
                
                <div class="flex items-center gap-4 border-t border-zinc-800/50 pt-4 mt-4">
                  <a [href]="article.url" target="_blank" class="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
                    Read Full Post
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              </article>
            }
          }
        </div>
      </div>
    </app-main-layout>
  `
})
export class ReaderComponent implements OnInit {
  private feedsService = inject(FeedsService);
  
  articles = signal<any[]>([]);
  loading = signal(true);
  tags = signal<string[]>([]);
  selectedTag = signal<string | null>(null);
  searchQuery = signal('');

  filteredArticles = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.articles();
    if (!q) return list;
    return list.filter(a => (a.title || '').toLowerCase().includes(q));
  });

  async ngOnInit() {
    this.loadTags();
    this.loadArticles();
  }

  async loadTags() {
    try {
      const subs = await this.feedsService.getSubscriptions();
      const allTags = new Set((subs || []).flatMap(s => s.tags && s.tags.length > 0 ? s.tags : ['default']));
      this.tags.set(Array.from(allTags).sort());
    } catch(e) {}
  }

  selectTag(tag: string | null) {
    this.selectedTag.set(tag);
    this.loadArticles();
  }

  async loadArticles() {
    this.loading.set(true);
    try {
      const data = await this.feedsService.getArticles(this.selectedTag() || undefined);
      this.articles.set(data || []);
    } catch (err) {
      console.error('Falha ao carregar artigos', err);
    } finally {
      this.loading.set(false);
    }
  }
}
