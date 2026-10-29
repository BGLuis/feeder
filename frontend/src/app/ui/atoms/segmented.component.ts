import { Component, input, model } from '@angular/core';

export interface SegmentOption {
  label?: string;
  value: any;
  icon?: string;
  ariaLabel?: string;
}

@Component({
  selector: 'app-segmented',
  standalone: true,
  template: `
    <div
      class="inline-flex items-center rounded-lg bg-bg-muted p-0.5 border border-border-subtle"
      role="group"
      [attr.aria-label]="ariaLabel()"
    >
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          (click)="value.set(opt.value)"
          [attr.aria-pressed]="value() === opt.value"
          [attr.aria-label]="opt.ariaLabel || opt.label"
          class="relative flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all select-none focus-visible:outline-none focus-visible:shadow-focus-ring"
          [class]="
            value() === opt.value
              ? 'bg-bg-segment-selected text-text-primary shadow-elevation-1'
              : 'text-text-secondary hover:text-text-primary'
          "
        >
          @if (opt.label) {
            <span>{{ opt.label }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class SegmentedComponent {
  options = input.required<SegmentOption[]>();
  value = model<any>();
  ariaLabel = input<string>('Segmented options');
}
