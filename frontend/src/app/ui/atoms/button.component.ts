import { Component, input, computed } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-bg-inverse text-text-inverse hover:bg-bg-inverse-hover',
  secondary: 'bg-bg-surface text-text-primary border border-border-default hover:bg-bg-muted',
  ghost: 'bg-transparent text-text-secondary hover:bg-bg-muted hover:text-text-primary',
  danger: 'bg-bg-danger text-white hover:opacity-90 focus-visible:shadow-focus-ring-danger',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button [type]="type()" [class]="computedClasses()" [disabled]="disabled()">
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  customClass = input<string>('');

  computedClasses = computed(
    () => `${BASE} ${VARIANTS[this.variant()]} ${SIZES[this.size()]} ${this.customClass()}`,
  );
}
