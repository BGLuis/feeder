import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-bg-canvas text-text-primary overflow-hidden relative font-sans">
      <div class="relative z-10 w-full p-4 sm:p-6">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
