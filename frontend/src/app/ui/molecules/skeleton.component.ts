import { Component, input } from '@angular/core';

export type SkeletonVariant = 'article' | 'row' | 'card' | 'box';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    @switch (variant()) {
      @case ('article') {
        <div class="rounded-2xl border border-border-default bg-bg-surface p-6 animate-pulse">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-6 h-6 rounded-md bg-bg-skeleton"></div>
            <div class="h-4 w-32 rounded bg-bg-skeleton"></div>
            <div class="h-3 w-16 rounded bg-bg-skeleton ml-auto"></div>
          </div>
          <div class="h-6 w-3/4 rounded bg-bg-skeleton mb-3"></div>
          <div class="h-4 w-full rounded bg-bg-skeleton mb-2"></div>
          <div class="h-4 w-2/3 rounded bg-bg-skeleton"></div>
        </div>
      }

      @case ('row') {
        <div class="flex items-center justify-between gap-4 p-5 border-b border-border-subtle animate-pulse">
          <div class="flex items-center gap-4 flex-1">
            <div class="w-10 h-10 rounded-lg bg-bg-skeleton shrink-0"></div>
            <div class="space-y-2 flex-1 max-w-md">
              <div class="h-4 w-48 rounded bg-bg-skeleton"></div>
              <div class="h-3 w-64 rounded bg-bg-skeleton"></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-bg-skeleton"></div>
            <div class="w-8 h-8 rounded-full bg-bg-skeleton"></div>
          </div>
        </div>
      }

      @case ('card') {
        <div class="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-8 animate-pulse">
          <div class="h-3 w-24 rounded bg-bg-skeleton mb-4"></div>
          <div class="h-12 w-32 rounded bg-bg-skeleton mb-4"></div>
          <div class="h-3 w-40 rounded bg-bg-skeleton"></div>
        </div>
      }

      @default {
        <div
          class="rounded bg-bg-skeleton animate-pulse"
          [style.width]="width()"
          [style.height]="height()"
        ></div>
      }
    }
  `,
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('article');
  width = input<string>('100%');
  height = input<string>('1rem');
}
