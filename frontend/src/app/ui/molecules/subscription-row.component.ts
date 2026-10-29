import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideRefreshCw,
  LucidePencil,
  LucideTrash2,
} from '@lucide/angular';
import { BadgeComponent } from '../atoms/badge.component';
import { TagComponent } from '../atoms/tag.component';
import { SourceMarkComponent } from '../atoms/source-mark.component';

@Component({
  selector: 'app-subscription-row',
  standalone: true,
  imports: [
    CommonModule,
    LucideRefreshCw,
    LucidePencil,
    LucideTrash2,
    BadgeComponent,
    TagComponent,
    SourceMarkComponent,
  ],
  template: `
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-bg-hover transition-colors border-b border-border-subtle last:border-b-0 group"
    >
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <app-source-mark
          [name]="title()"
          [favicon]="faviconUrl()"
          size="lg"
        ></app-source-mark>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h3 class="font-medium text-text-primary text-base truncate">
              {{ title() }}
            </h3>
            <app-badge
              [label]="isHealthy() ? 'Healthy' : 'Error'"
              [tone]="isHealthy() ? 'accent' : 'danger'"
              [dot]="true"
            ></app-badge>

            @for (tag of feed().tags || []; track tag) {
              <app-tag [label]="tag" tone="neutral"></app-tag>
            }
          </div>

          <div class="flex items-center gap-3 text-xs text-text-tertiary">
            <a
              [href]="feed().source?.url"
              target="_blank"
              rel="noopener"
              class="truncate max-w-xs hover:text-text-primary hover:underline transition-colors"
            >
              {{ feed().source?.url }}
            </a>
            @if (nextFetchTime()) {
              <span>•</span>
              <span class="whitespace-nowrap">Next fetch: {{ nextFetchTime() }}</span>
            }
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          (click)="refresh.emit(feed())"
          class="p-2 rounded-full text-icon-tertiary hover:text-icon-accent hover:bg-bg-muted transition-colors"
          title="Force sync"
        >
          <svg lucideRefreshCw class="w-4 h-4"></svg>
        </button>
        <button
          type="button"
          (click)="edit.emit(feed())"
          class="p-2 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-muted transition-colors"
          title="Edit feed"
        >
          <svg lucidePencil class="w-4 h-4"></svg>
        </button>
        <button
          type="button"
          (click)="delete.emit(feed())"
          class="p-2 rounded-full text-icon-tertiary hover:text-icon-danger hover:bg-bg-danger-subtle transition-colors"
          title="Delete subscription"
        >
          <svg lucideTrash2 class="w-4 h-4"></svg>
        </button>
      </div>
    </div>
  `,
})
export class SubscriptionRowComponent {
  feed = input.required<any>();

  refresh = output<any>();
  edit = output<any>();
  delete = output<any>();

  title = computed(() => this.feed().customName || this.feed().source?.name || 'Unnamed Feed');

  isHealthy = computed(() => {
    const misses = this.feed().source?.consecutiveMisses;
    return !misses || misses <= 0;
  });

  faviconUrl = computed(() => {
    const url = this.feed().source?.url;
    if (!url) return null;
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    } catch {
      return null;
    }
  });

  nextFetchTime = computed(() => {
    const next = this.feed().source?.nextFetchAt;
    if (!next) return '';
    try {
      const d = new Date(next);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  });
}
