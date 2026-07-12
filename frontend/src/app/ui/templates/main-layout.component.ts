import { Component } from '@angular/core';
import { SidebarComponent } from '../organisms/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <div class="flex h-screen w-full bg-[#09090b] text-zinc-50 overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <app-sidebar></app-sidebar>
      <main class="flex-1 overflow-y-auto px-6 py-6 md:px-12 md:py-8 lg:px-16">
        <ng-content></ng-content>
      </main>
    </div>
  `,
})
export class MainLayoutComponent {}
