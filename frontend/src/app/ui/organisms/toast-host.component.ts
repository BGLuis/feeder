import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      aria-live="polite"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast-item pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg shadow-black/5 dark:border-zinc-800 dark:bg-[#161616] dark:shadow-black/40"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
          (mouseenter)="toastService.pause(toast.id)"
          (mouseleave)="toastService.resume(toast.id)"
        >
          <div class="flex items-start gap-3 p-3.5">
            <span
              class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              [class]="iconWrapClass(toast.kind)"
            >
              @switch (toast.kind) {
                @case ('success') {
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.6"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5" />
                  </svg>
                }
                @case ('error') {
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.4"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v5m0 4h.01" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                }
                @case ('loading') {
                  <span
                    class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400/40 border-t-zinc-500 dark:border-zinc-500/40 dark:border-t-zinc-300"
                  ></span>
                }
                @default {
                  <svg
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path stroke-linecap="round" d="M12 11v5m0-8h.01" />
                  </svg>
                }
              }
            </span>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">{{ toast.title }}</p>
              @if (toast.description) {
                <p class="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {{ toast.description }}
                </p>
              }
            </div>

            @if (toast.action) {
              <button
                type="button"
                (click)="runAction(toast)"
                class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
              >
                {{ toast.action.label }}
              </button>
            }

            <button
              type="button"
              (click)="toastService.dismiss(toast.id)"
              class="shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Dismiss"
            >
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
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
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'error':
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'loading':
        return 'bg-zinc-400/10 text-zinc-500 dark:text-zinc-400';
      default:
        return 'bg-zinc-400/10 text-zinc-500 dark:text-zinc-300';
    }
  }

  barClass(kind: string): string {
    return kind === 'error'
      ? 'bg-red-500/70'
      : kind === 'success'
        ? 'bg-emerald-500/70'
        : 'bg-zinc-400/60';
  }
}
