import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideBookmark,
  LucideExternalLink,
  LucideCheck,
  LucideNewspaper,
} from '@lucide/angular';
import { SourceMarkComponent } from '../atoms/source-mark.component';

export type ArticleDensity = 'compact' | 'comfortable' | 'magazine';

@Component({
  selector: 'app-article-card',
  standalone: true,
  imports: [
    CommonModule,
    LucideBookmark,
    LucideExternalLink,
    LucideCheck,
    LucideNewspaper,
    SourceMarkComponent,
  ],
  template: `
    <!-- COMPACT DENSITY -->
    @if (density() === 'compact') {
      <div
        class="relative flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-bg-hover transition-colors"
        [class.opacity-70]="isRead()"
      >
        @if (!isRead()) {
          <span class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-emerald-500"></span>
        }
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <app-source-mark
            [name]="sourceName()"
            [color]="brandColor()"
            size="sm"
          ></app-source-mark>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-xs text-text-tertiary mb-0.5">
              <span class="font-medium text-text-secondary truncate">{{ sourceName() }}</span>
              <span>·</span>
              <span class="whitespace-nowrap">{{ formattedTime() }}</span>
            </div>
            <a
              [href]="article().url"
              target="_blank"
              rel="noopener"
              (click)="onOpen($event)"
              class="block text-editorial-headline-s font-serif truncate transition-colors hover:text-text-accent"
              [class]="isRead() ? 'text-text-secondary font-normal' : 'text-text-primary font-medium'"
            >
              {{ article().title }}
            </a>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            (click)="toggleSave.emit(article())"
            class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
            [class.text-icon-accent]="isSaved()"
            [title]="isSaved() ? 'Remover dos salvos' : 'Salvar artigo'"
          >
            <svg lucideBookmark class="w-4 h-4" [class.fill-current]="isSaved()"></svg>
          </button>
          <button
            type="button"
            (click)="markRead.emit(article())"
            class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
            [class.text-icon-accent]="isRead()"
            [title]="isRead() ? 'Marcar como não lido' : 'Marcar como lido'"
          >
            <svg lucideCheck class="w-4 h-4"></svg>
          </button>
          <a
            [href]="article().url"
            target="_blank"
            rel="noopener"
            (click)="onOpen($event)"
            class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
            title="Abrir link externo"
          >
            <svg lucideExternalLink class="w-4 h-4"></svg>
          </a>
        </div>
      </div>
    }

    <!-- COMFORTABLE DENSITY -->
    @if (density() === 'comfortable') {
      <article
        class="relative rounded-2xl border border-border-default bg-bg-surface p-6 hover:border-border-strong hover:shadow-elevation-2 transition-all group"
        [class.opacity-75]="isRead()"
      >
        @if (!isRead()) {
          <span class="absolute left-0 top-6 bottom-6 w-[3px] rounded-r bg-emerald-500"></span>
        }

        <div class="flex items-center gap-2.5 mb-3">
          <app-source-mark
            [name]="sourceName()"
            [color]="brandColor()"
            size="md"
          ></app-source-mark>
          <span class="text-sm font-medium text-text-secondary truncate">{{ sourceName() }}</span>
          <span class="text-text-tertiary text-xs">•</span>
          <time class="text-xs text-text-tertiary whitespace-nowrap">{{ formattedTime() }}</time>

          <div class="ml-auto flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              (click)="toggleSave.emit(article())"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              [class.text-icon-accent]="isSaved()"
              [title]="isSaved() ? 'Remover dos salvos' : 'Salvar artigo'"
            >
              <svg lucideBookmark class="w-4 h-4" [class.fill-current]="isSaved()"></svg>
            </button>
            <button
              type="button"
              (click)="markRead.emit(article())"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              [class.text-icon-accent]="isRead()"
              [title]="isRead() ? 'Marcar como não lido' : 'Marcar como lido'"
            >
              <svg lucideCheck class="w-4 h-4"></svg>
            </button>
            <a
              [href]="article().url"
              target="_blank"
              rel="noopener"
              (click)="onOpen($event)"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              title="Abrir link externo"
            >
              <svg lucideExternalLink class="w-4 h-4"></svg>
            </a>
          </div>
        </div>

        <h2 class="text-editorial-headline-m font-serif leading-snug mb-2">
          <a
            [href]="article().url"
            target="_blank"
            rel="noopener"
            (click)="onOpen($event)"
            class="transition-colors hover:text-text-accent"
            [class]="isRead() ? 'text-text-secondary font-normal' : 'text-text-primary font-medium'"
          >
            {{ article().title }}
          </a>
        </h2>

        @if (article().content) {
          <p class="text-body-sm text-text-secondary line-clamp-2 leading-relaxed">
            {{ article().content }}
          </p>
        }
      </article>
    }

    <!-- MAGAZINE DENSITY -->
    @if (density() === 'magazine') {
      <article
        class="relative rounded-2xl border border-border-default bg-bg-surface p-6 hover:border-border-strong hover:shadow-elevation-2 transition-all group"
        [class.opacity-75]="isRead()"
      >
        @if (!isRead()) {
          <span class="absolute left-0 top-6 bottom-6 w-[3px] rounded-r bg-emerald-500"></span>
        }

        <div class="flex items-center gap-2.5 mb-4">
          <app-source-mark
            [name]="sourceName()"
            [color]="brandColor()"
            size="md"
          ></app-source-mark>
          <span class="text-sm font-medium text-text-secondary truncate">{{ sourceName() }}</span>
          <span class="text-text-tertiary text-xs">•</span>
          <time class="text-xs text-text-tertiary whitespace-nowrap">{{ formattedTime() }}</time>

          <div class="ml-auto flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              (click)="toggleSave.emit(article())"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              [class.text-icon-accent]="isSaved()"
              [title]="isSaved() ? 'Remover dos salvos' : 'Salvar artigo'"
            >
              <svg lucideBookmark class="w-4 h-4" [class.fill-current]="isSaved()"></svg>
            </button>
            <button
              type="button"
              (click)="markRead.emit(article())"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              [class.text-icon-accent]="isRead()"
              [title]="isRead() ? 'Marcar como não lido' : 'Marcar como lido'"
            >
              <svg lucideCheck class="w-4 h-4"></svg>
            </button>
            <a
              [href]="article().url"
              target="_blank"
              rel="noopener"
              (click)="onOpen($event)"
              class="p-1.5 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              title="Abrir link externo"
            >
              <svg lucideExternalLink class="w-4 h-4"></svg>
            </a>
          </div>
        </div>

        <figure class="mb-5 rounded-xl overflow-hidden border border-border-default bg-bg-muted aspect-video relative flex items-center justify-center">
          @if (article().imageUrl && !hasImageError()) {
            <img
              [src]="article().imageUrl"
              [alt]="article().title"
              (error)="onImageError()"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              class="w-full h-full object-cover"
            />
          } @else {
            <div class="flex flex-col items-center justify-center text-icon-tertiary gap-2">
              <svg lucideNewspaper class="w-10 h-10 opacity-50"></svg>
            </div>
          }
        </figure>

        <h2 class="text-editorial-headline-l font-serif leading-snug mb-3">
          <a
            [href]="article().url"
            target="_blank"
            rel="noopener"
            (click)="onOpen($event)"
            class="transition-colors hover:text-text-accent"
            [class]="isRead() ? 'text-text-secondary font-normal' : 'text-text-primary font-medium'"
          >
            {{ article().title }}
          </a>
        </h2>

        @if (article().content) {
          <p class="text-body text-text-secondary line-clamp-3 leading-relaxed">
            {{ article().content }}
          </p>
        }
      </article>
    }
  `,
})
export class ArticleCardComponent {
  article = input.required<any>();
  density = input<ArticleDensity>('comfortable');
  isRead = input<boolean>(false);
  isSaved = input<boolean>(false);
  brandColor = input<string | null | undefined>(null);

  hasImageError = signal<boolean>(false);

  onImageError() {
    this.hasImageError.set(true);
  }

  markRead = output<any>();
  toggleSave = output<any>();
  openLink = output<any>();

  sourceName = computed(() => this.article().source?.name || 'Feed');

  formattedTime = computed(() => {
    const pub = this.article().publishedAt;
    if (!pub) return '';
    try {
      const d = new Date(pub);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'now';
      if (diffMin < 60) return `${diffMin}m`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d`;
    } catch {
      return '';
    }
  });

  onOpen(e: MouseEvent) {
    this.markRead.emit(this.article());
    this.openLink.emit(this.article());
  }
}
