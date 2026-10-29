import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideWebhook, LucideTrash2 } from '@lucide/angular';
import { BadgeComponent } from '../atoms/badge.component';
import { ToggleComponent } from '../atoms/toggle.component';

@Component({
  selector: 'app-webhook-row',
  standalone: true,
  imports: [CommonModule, LucideWebhook, LucideTrash2, BadgeComponent, ToggleComponent],
  template: `
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border-default bg-bg-surface hover:border-border-strong transition-all"
    >
      <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        <div
          class="w-10 h-10 rounded-xl bg-bg-muted flex items-center justify-center text-icon-secondary shrink-0"
        >
          <svg lucideWebhook class="w-5 h-5"></svg>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="font-mono text-sm font-medium text-text-primary truncate">
              {{ webhook().url }}
            </span>
            <app-badge
              [label]="webhook().isActive ? 'Active' : 'Inactive'"
              [tone]="webhook().isActive ? 'accent' : 'neutral'"
              [dot]="true"
            ></app-badge>
          </div>

          <div class="flex items-center gap-3 text-xs text-text-tertiary">
            <span>Trigger: <strong class="text-text-secondary font-medium">{{ webhook().triggerType }}</strong></span>
            @if (webhook().triggerValue) {
              <span>({{ webhook().triggerValue }})</span>
            }
            @if (lastDelivery()) {
              <span>•</span>
              <span>Last delivery: {{ lastDelivery() }}</span>
            }
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <app-toggle
          [checked]="webhook().isActive"
          [label]="'Toggle webhook ' + webhook().url"
          (checkedChange)="toggleActive.emit($event)"
        ></app-toggle>

        <button
          type="button"
          (click)="delete.emit(webhook().id)"
          class="p-2 rounded-full text-icon-tertiary hover:text-icon-danger hover:bg-bg-danger-subtle transition-colors"
          title="Delete webhook"
        >
          <svg lucideTrash2 class="w-4 h-4"></svg>
        </button>
      </div>
    </div>
  `,
})
export class WebhookRowComponent {
  webhook = input.required<any>();

  toggleActive = output<boolean>();
  delete = output<any>();

  lastDelivery = computed(() => {
    const d = this.webhook().lastDeliveryAt || this.webhook().updatedAt;
    if (!d) return null;
    try {
      return new Date(d).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  });
}
