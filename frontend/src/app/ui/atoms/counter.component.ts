import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    @if (display(); as text) {
      <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-muted px-1.5 text-xs font-medium text-text-secondary">{{ text }}</span>
    }
  `,
})
export class CounterComponent {
  value = input<number>(0);
  display = computed(() => {
    const v = this.value();
    if (v <= 0) return '';
    return v > 99 ? '99+' : String(v);
  });
}
