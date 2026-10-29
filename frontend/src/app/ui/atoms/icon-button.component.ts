import { Component, computed, input } from '@angular/core';

export type IconButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<IconButtonSize, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };

@Component({
  selector: 'app-icon-button',
  standalone: true,
  template: `
    <button
      type="button"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      [class]="classes()"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class IconButtonComponent {
  label = input.required<string>();
  size = input<IconButtonSize>('md');
  disabled = input<boolean>(false);

  classes = computed(
    () =>
      `inline-flex items-center justify-center rounded-full text-text-secondary press hover:bg-bg-muted hover:text-text-primary focus-visible:outline-none focus-visible:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${SIZES[this.size()]}`,
  );
}
