import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-8">
      <div>
        <h1 class="text-heading-h1 font-medium text-text-primary tracking-tight">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-body text-text-secondary mt-1">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
}
