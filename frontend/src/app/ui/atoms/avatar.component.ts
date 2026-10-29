import { Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div
      class="rounded-full border border-border-default bg-bg-muted flex items-center justify-center font-medium uppercase text-text-primary overflow-hidden shrink-0 select-none"
      [class]="sizeClass()"
      [title]="name()"
    >
      @if (src()) {
        <img [src]="src()" [alt]="name()" class="h-full w-full object-cover" />
      } @else {
        <span>{{ initial() }}</span>
      }
    </div>
  `,
})
export class AvatarComponent {
  name = input<string>('User');
  src = input<string | null | undefined>(null);
  size = input<AvatarSize>('md');

  initial = computed(() => {
    const n = this.name()?.trim();
    return n ? n.charAt(0).toUpperCase() : 'U';
  });

  sizeClass = computed(() => SIZES[this.size()]);
}
