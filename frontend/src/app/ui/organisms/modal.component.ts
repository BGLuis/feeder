import { Component, HostListener, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [LucideX],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-[4px] modal-scrim-enter"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="title() ? 'modal-title' : null"
      >
        <div
          class="relative w-full max-w-[600px] max-h-[90vh] flex flex-col rounded-3xl border border-border-default bg-bg-surface shadow-elevation-4 overflow-hidden modal-panel-enter"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 p-6 sm:p-8 pb-4 border-b border-border-subtle">
            <div>
              @if (title()) {
                <h2 id="modal-title" class="text-heading-h2 font-medium text-text-primary tracking-tight">
                  {{ title() }}
                </h2>
              }
              @if (subtitle()) {
                <p class="text-body-sm text-text-secondary mt-1">
                  {{ subtitle() }}
                </p>
              }
            </div>

            <button
              type="button"
              (click)="close.emit()"
              class="press p-2 -mr-2 -mt-2 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              aria-label="Fechar"
            >
              <svg lucideX class="w-5 h-5"></svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 sm:p-8 overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>

          <!-- Footer -->
          <div class="p-6 sm:p-8 pt-4 border-t border-border-subtle bg-bg-surface flex items-center justify-end gap-3 empty:hidden">
            <ng-content select="[footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  open = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  closeOnBackdrop = input<boolean>(true);

  close = output<void>();

  onBackdropClick(event: MouseEvent) {
    if (this.closeOnBackdrop()) {
      this.close.emit();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.open()) {
      this.close.emit();
    }
  }
}
