import { Component, computed, input, signal } from '@angular/core';

export type SourceMarkSize = 'sm' | 'md' | 'lg';

const SIZES: Record<SourceMarkSize, string> = {
  sm: 'h-5 w-5 text-[10px] rounded',
  md: 'h-6 w-6 text-xs rounded-md',
  lg: 'h-10 w-10 text-base rounded-lg',
};

@Component({
  selector: 'app-source-mark',
  standalone: true,
  template: `
    <div
      class="flex items-center justify-center font-semibold uppercase shrink-0 overflow-hidden select-none"
      [class]="sizeClass()"
      [style.background-color]="showFavicon() ? 'transparent' : color() || 'var(--color-bg-muted)'"
      [style.color]="showFavicon() ? 'inherit' : (color() ? '#FFFFFF' : 'var(--color-text-secondary)')"
      [title]="name()"
    >
      @if (showFavicon()) {
        <img
          [src]="favicon()"
          [alt]="name()"
          (error)="onImageError()"
          class="h-full w-full object-contain"
        />
      } @else {
        <span>{{ initial() }}</span>
      }
    </div>
  `,
})
export class SourceMarkComponent {
  name = input<string>('Source');
  color = input<string | null | undefined>(null);
  favicon = input<string | null | undefined>(null);
  size = input<SourceMarkSize>('md');

  hasImageError = signal<boolean>(false);

  showFavicon = computed(() => !!this.favicon() && !this.hasImageError());

  onImageError() {
    this.hasImageError.set(true);
  }

  initial = computed(() => {
    const n = this.name()?.trim();
    return n ? n.charAt(0).toUpperCase() : 'S';
  });

  sizeClass = computed(() => SIZES[this.size()]);
}
