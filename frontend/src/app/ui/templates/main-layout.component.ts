import { Component } from '@angular/core';
import { SidebarComponent } from '../organisms/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <div class="flex flex-col-reverse md:flex-row h-[100dvh] w-full bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 overflow-hidden selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 selection:text-emerald-800 dark:selection:text-emerald-200">
      <app-sidebar class="w-full md:w-auto shrink-0 md:h-full z-50"></app-sidebar>
      <main class="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8 lg:px-16">
        <ng-content></ng-content>
      </main>
    </div>
  `,
})
export class MainLayoutComponent {}
