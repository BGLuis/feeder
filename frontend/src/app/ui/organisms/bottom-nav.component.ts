import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideLayoutDashboard,
  LucideNewspaper,
  LucidePlus,
  LucideSettings,
} from '@lucide/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    LucideLayoutDashboard,
    LucideNewspaper,
    LucidePlus,
    LucideSettings,
  ],
  template: `
    <nav
      class="md:hidden fixed bottom-0 inset-x-0 z-40 h-16 bg-bg-surface border-t border-border-default flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <a
        routerLink="/"
        [routerLinkActiveOptions]="{ exact: true }"
        routerLinkActive="text-text-primary font-medium"
        class="press flex flex-col items-center justify-center flex-1 h-full py-1 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <svg lucideLayoutDashboard class="w-5 h-5 mb-0.5"></svg>
        <span class="text-[10px] tracking-tight leading-none">{{ 'NAV.DASHBOARD' | translate }}</span>
      </a>

      <a
        routerLink="/reader"
        routerLinkActive="text-text-primary font-medium"
        class="press flex flex-col items-center justify-center flex-1 h-full py-1 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <svg lucideNewspaper class="w-5 h-5 mb-0.5"></svg>
        <span class="text-[10px] tracking-tight leading-none">{{ 'NAV.TIMELINE' | translate }}</span>
      </a>

      <a
        routerLink="/discover"
        routerLinkActive="text-text-primary font-medium"
        class="press flex flex-col items-center justify-center flex-1 h-full py-1 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <svg lucidePlus class="w-5 h-5 mb-0.5"></svg>
        <span class="text-[10px] tracking-tight leading-none">{{ 'NAV.DISCOVER' | translate }}</span>
      </a>

      <a
        routerLink="/settings"
        routerLinkActive="text-text-primary font-medium"
        class="press flex flex-col items-center justify-center flex-1 h-full py-1 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <svg lucideSettings class="w-5 h-5 mb-0.5"></svg>
        <span class="text-[10px] tracking-tight leading-none">{{ 'NAV.SETTINGS' | translate }}</span>
      </a>
    </nav>
  `,
})
export class BottomNavComponent {}
