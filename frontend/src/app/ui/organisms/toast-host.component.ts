import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import {
  LucideCheck,
  LucideCircleAlert,
  LucideInfo,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [LucideCheck, LucideCircleAlert, LucideInfo, LucideX],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-16 md:bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      aria-live="polite"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast-item pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-elevation-3"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
          (mouseenter)="toastService.pause(toast.id)"
          (mouseleave)="toastService.resume(toast.id)"
        >
          <div class="flex items-start gap-3 p-4">
            <span
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              [class]="iconWrapClass(toast.kind)"
            >
              @switch (toast.kind) {
                @case ('success') {
                  <svg lucideCheck class="w-3.5 h-3.5"></svg>
                }
                @case ('error') {
                  <svg lucideCircleAlert class="w-3.5 h-3.5"></svg>
                }
                @case ('loading') {
                  <span
                    class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-default border-t-text-primary"
                  ></span>
                }
                @default {
                  <svg lucideInfo class="w-3.5 h-3.5"></svg>
                }
              }
            </span>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-text-primary">{{ toast.title }}</p>
              @if (toast.description) {
                <p class="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {{ toast.description }}
                </p>
              }
            </div>

            @if (toast.action) {
              <button
                type="button"
                (click)="runAction(toast)"
                class="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-text-accent hover:bg-bg-accent-subtle transition-colors"
              >
                {{ toast.action.label }}
              </button>
            }

            <button
              type="button"
              (click)="toastService.dismiss(toast.id)"
              class="shrink-0 rounded-md p-1 text-icon-tertiary transition-colors hover:text-icon-primary hover:bg-bg-hover"
              aria-label="Dismiss"
            >
              <svg lucideX class="w-3.5 h-3.5"></svg>
            </button>
          </div>

          @if (toast.duration > 0) {
            <span
              class="toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left"
              [class]="barClass(toast.kind)"
              [style.animation-duration.ms]="toast.duration"
            ></span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-item {
        animation: toast-in 200ms cubic-bezier(0.2, 0.9, 0.3, 1);
      }
      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .toast-progress {
        animation-name: toast-bar;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }
      .toast-item:hover .toast-progress {
        animation-play-state: paused;
      }
      @keyframes toast-bar {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .toast-item {
          animation: none;
        }
        .toast-progress {
          animation: none;
          transform: scaleX(1);
        }
      }
    `,
  ],
})
export class ToastHostComponent {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  runAction(toast: { id: number; action?: { run: () => void } }) {
    toast.action?.run();
    this.toastService.dismiss(toast.id);
  }

  iconWrapClass(kind: string): string {
    switch (kind) {
      case 'success':
        return 'bg-bg-accent-subtle text-text-accent';
      case 'error':
        return 'bg-bg-danger-subtle text-text-danger';
      case 'loading':
        return 'bg-bg-muted text-text-secondary';
      default:
        return 'bg-bg-info-subtle text-text-info';
    }
  }

  barClass(kind: string): string {
    return kind === 'error'
      ? 'bg-bg-danger'
      : kind === 'success'
        ? 'bg-bg-accent'
        : 'bg-border-strong';
  }
}
