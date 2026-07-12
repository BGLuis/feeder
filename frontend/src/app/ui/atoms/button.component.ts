import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [class]="computedClasses()"
      [disabled]="disabled()"
    >
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
  disabled = input<boolean>(false);
  customClass = input<string>('');

  computedClasses = computed(() => {
    const base = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
    const variant = this.variant();
    const primary = 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md focus:ring-blue-500';
    const secondary = 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500';
    return `${base} ${variant === 'primary' ? primary : secondary} ${this.customClass()}`;
  });
}
