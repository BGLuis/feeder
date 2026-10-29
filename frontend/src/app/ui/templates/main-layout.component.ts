import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../organisms/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="flex flex-col md:flex-row h-[100dvh] w-full bg-bg-canvas text-text-primary overflow-hidden font-sans">
      <app-sidebar class="shrink-0 md:h-full z-30"></app-sidebar>
      <main class="flex-1 overflow-y-auto px-4 pt-6 pb-20 md:px-12 md:pt-10 md:pb-12">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class MainLayoutComponent {}
