import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden selection:bg-emerald-500/30 relative">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#0a0a0a] to-[#0a0a0a]"></div>
      <div class="relative z-10 w-full p-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
