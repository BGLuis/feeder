import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideInfo,
  LucideCircleCheck,
  LucideTriangleAlert,
  LucideCircleAlert,
  LucideX,
} from '@lucide/angular';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ALERT_CLASSES: Record<AlertTone, { container: string; icon: string }> = {
  info: {
    container: 'bg-bg-info-subtle border-border-info text-text-info',
    icon: 'text-icon-info',
  },
  success: {
    container: 'bg-bg-accent-subtle border-border-accent text-text-accent',
    icon: 'text-icon-accent',
  },
  warning: {
    container: 'bg-bg-warning-subtle border-border-warning text-text-warning',
    icon: 'text-icon-warning',
  },
  danger: {
    container: 'bg-bg-danger-subtle border-border-danger text-text-danger',
    icon: 'text-icon-danger',
  },
};

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [
    CommonModule,
    LucideInfo,
    LucideCircleCheck,
    LucideTriangleAlert,
    LucideCircleAlert,
    LucideX,
  ],
  template: `
    <div
      role="alert"
      class="rounded-xl border p-4 flex items-start gap-3 transition-all"
      [class]="toneClasses().container"
    >
      <div class="shrink-0 mt-0.5" [class]="toneClasses().icon">
        @switch (tone()) {
          @case ('info') {
            <svg lucideInfo class="w-5 h-5"></svg>
          }
          @case ('success') {
            <svg lucideCircleCheck class="w-5 h-5"></svg>
          }
          @case ('warning') {
            <svg lucideTriangleAlert class="w-5 h-5"></svg>
          }
          @case ('danger') {
            <svg lucideCircleAlert class="w-5 h-5"></svg>
          }
        }
      </div>

      <div class="min-w-0 flex-1 text-sm">
        @if (title()) {
          <h4 class="font-medium mb-0.5">{{ title() }}</h4>
        }
        @if (description()) {
          <p class="leading-relaxed opacity-90">{{ description() }}</p>
        }
        <ng-content></ng-content>
      </div>

      @if (dismissible()) {
        <button
          type="button"
          (click)="dismiss.emit()"
          class="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar alerta"
        >
          <svg lucideX class="w-4 h-4"></svg>
        </button>
      }
    </div>
  `,
})
export class AlertComponent {
  tone = input<AlertTone>('info');
  title = input<string>('');
  description = input<string>('');
  dismissible = input<boolean>(false);

  dismiss = output<void>();

  toneClasses = computed(() => ALERT_CLASSES[this.tone()]);
}
