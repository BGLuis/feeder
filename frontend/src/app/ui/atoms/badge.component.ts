import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'warning' | 'info';

const TONE_CLASSES: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: {
    badge: 'bg-bg-muted text-text-secondary',
    dot: 'bg-text-tertiary',
  },
  accent: {
    badge: 'bg-bg-accent-subtle text-text-accent',
    dot: 'bg-bg-accent',
  },
  danger: {
    badge: 'bg-bg-danger-subtle text-text-danger',
    dot: 'bg-bg-danger',
  },
  warning: {
    badge: 'bg-bg-warning-subtle text-text-warning',
    dot: 'bg-text-warning',
  },
  info: {
    badge: 'bg-bg-info-subtle text-text-info',
    dot: 'bg-text-info',
  },
};

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="toneClass().badge"
    >
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full shrink-0" [class]="toneClass().dot"></span>
      }
      <span>{{ label() }}</span>
    </span>
  `,
})
export class BadgeComponent {
  label = input.required<string>();
  tone = input<BadgeTone>('neutral');
  dot = input<boolean>(false);

  toneClass = computed(() => TONE_CLASSES[this.tone()]);
}
