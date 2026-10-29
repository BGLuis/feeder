import { Component, input } from '@angular/core';

@Component({
  selector: 'app-setting-row',
  standalone: true,
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-border-subtle last:border-b-0">
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-text-primary">{{ title() }}</span>
        @if (description()) {
          <span class="text-xs text-text-secondary leading-relaxed">{{ description() }}</span>
        }
      </div>
      <div class="shrink-0 flex items-center gap-3">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class SettingRowComponent {
  title = input.required<string>();
  description = input<string>('');
}
