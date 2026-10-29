import { Component, ElementRef, ViewChild, HostListener, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [FormsModule, LucideSearch, LucideX],
  template: `
    <div class="relative flex items-center w-full">
      <svg
        lucideSearch
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-icon-secondary pointer-events-none"
      ></svg>
      <input
        #inputRef
        type="text"
        [placeholder]="placeholder()"
        [(ngModel)]="value"
        (keydown.escape)="clear()"
        [disabled]="disabled()"
        class="w-full h-10 pl-9 pr-10 rounded-lg border border-border-default bg-bg-field text-text-primary placeholder:text-text-tertiary text-sm transition-colors focus:border-border-focus focus:outline-none focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      />
      @if (value()) {
        <button
          type="button"
          (click)="clear()"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-icon-tertiary hover:text-icon-primary hover:bg-bg-hover transition-colors"
          aria-label="Limpar pesquisa"
        >
          <svg lucideX class="w-3.5 h-3.5"></svg>
        </button>
      } @else if (showShortcut()) {
        <kbd
          class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border-subtle bg-bg-muted text-[11px] font-mono text-text-tertiary select-none"
        >/</kbd>
      }
    </div>
  `,
})
export class SearchFieldComponent {
  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement>;

  value = model<string>('');
  placeholder = input<string>('Search...');
  disabled = input<boolean>(false);
  showShortcut = input<boolean>(true);

  clear() {
    this.value.set('');
  }

  focus() {
    this.inputRef?.nativeElement.focus();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcut(e: KeyboardEvent) {
    if (!this.showShortcut() || this.disabled()) return;
    if (e.key === '/' && document.activeElement !== this.inputRef?.nativeElement) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault();
        this.focus();
      }
    }
  }
}
