import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronDown } from '@lucide/angular';

export interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [FormsModule, LucideChevronDown],
  template: `
    <div class="relative w-full">
      <select
        [(ngModel)]="value"
        [disabled]="disabled()"
        class="w-full appearance-none rounded-lg border border-border-default bg-bg-field px-3 py-2 pr-9 text-sm text-text-primary transition-colors focus:border-border-focus focus:outline-none focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        [class]="size() === 'lg' ? 'h-12 text-base' : 'h-10 text-sm'"
      >
        @if (placeholder()) {
          <option value="" disabled selected>{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      <svg
        lucideChevronDown
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-icon-secondary"
      ></svg>
    </div>
  `,
})
export class SelectComponent {
  value = model<any>('');
  options = input<SelectOption[]>([]);
  placeholder = input<string>('');
  disabled = input<boolean>(false);
  size = input<'md' | 'lg'>('md');
}
