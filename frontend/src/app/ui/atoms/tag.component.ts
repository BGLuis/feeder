import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

export type TagTone = 'neutral' | 'accent';

@Component({
  selector: 'app-tag',
  standalone: true,
  imports: [LucideX],
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium lowercase transition-colors"
      [class]="
        tone() === 'accent'
          ? 'bg-bg-accent-subtle text-text-accent border border-border-accent'
          : 'bg-bg-muted text-text-secondary border border-border-subtle'
      "
    >
      <span>{{ label() }}</span>
      @if (removable()) {
        <button
          type="button"
          (click)="remove.emit()"
          class="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-current focus:outline-none"
          aria-label="Remover tag"
        >
          <svg lucideX class="w-3 h-3"></svg>
        </button>
      }
    </span>
  `,
})
export class TagComponent {
  label = input.required<string>();
  tone = input<TagTone>('neutral');
  removable = input<boolean>(false);
  remove = output<void>();
}
