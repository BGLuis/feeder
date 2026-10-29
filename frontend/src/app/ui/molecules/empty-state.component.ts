import { Component, input } from '@angular/core';
import { LucideInbox } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideInbox],
  template: `
    <div
      class="rounded-3xl border border-dashed border-border-default p-12 md:p-16 text-center flex flex-col items-center justify-center bg-bg-surface"
    >
      <div
        class="w-14 h-14 rounded-full bg-bg-muted flex items-center justify-center text-icon-secondary mb-4"
      >
        <ng-content select="[icon]">
          <svg lucideInbox class="w-7 h-7"></svg>
        </ng-content>
      </div>

      <h3 class="text-editorial-headline-m font-serif text-text-primary mb-2">
        {{ title() }}
      </h3>

      @if (description()) {
        <p class="text-body text-text-secondary max-w-sm mx-auto leading-relaxed mb-6">
          {{ description() }}
        </p>
      }

      <div class="flex items-center gap-3">
        <ng-content select="[action]"></ng-content>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  title = input.required<string>();
  description = input<string>('');
}
