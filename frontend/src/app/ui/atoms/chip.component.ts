import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-chip',
  standalone: true,
  template: `
    <button
      type="button"
      [attr.aria-pressed]="selected()"
      [disabled]="disabled()"
      (click)="toggle()"
      class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium press select-none focus-visible:outline-none focus-visible:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
      [class]="
        selected()
          ? 'bg-bg-inverse text-text-inverse shadow-elevation-1'
          : 'bg-bg-muted text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'
      "
    >
      <ng-content select="[leading]"></ng-content>
      <span>{{ label() }}</span>
      @if (count() !== undefined && count() !== null) {
        <span
          class="inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold"
          [class]="selected() ? 'bg-white/20 text-text-inverse' : 'bg-black/10 dark:bg-white/10 text-text-tertiary'"
        >
          {{ count() }}
        </span>
      }
      <ng-content select="[trailing]"></ng-content>
    </button>
  `,
})
export class ChipComponent {
  label = input.required<string>();
  count = input<number | undefined>(undefined);
  selected = model<boolean>(false);
  disabled = input<boolean>(false);

  toggle() {
    if (!this.disabled()) {
      this.selected.set(!this.selected());
    }
  }
}
