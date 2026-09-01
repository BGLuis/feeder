import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button [class]="computedClasses()" [disabled]="disabled()">
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  disabled = input<boolean>(false);
  customClass = input<string>('');

  computedClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm';
    const variant = this.variant();
    const primary =
      'bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-500 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200';
    const secondary =
      'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 focus:ring-zinc-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800';
    return `${base} ${variant === 'primary' ? primary : secondary} ${this.customClass()}`;
  });
}
