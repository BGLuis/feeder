import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="w-64 h-full bg-[#050505] border-r border-zinc-900 flex flex-col">
      <div class="p-8 flex items-center gap-3">
        <div class="bg-zinc-100 text-zinc-900 p-2 rounded-[0.8rem] shadow-sm">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
        </div>
        <span class="text-xl font-medium text-white tracking-tight">Feeder</span>
      </div>
      
      <nav class="flex-1 mt-10">
        <a 
          routerLink="/" 
          [routerLinkActiveOptions]="{exact: true}"
          routerLinkActive="bg-white/10 text-white" 
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 font-medium transition-colors text-sm mb-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
          Overview
        </a>
        
        <a 
          routerLink="/reader" 
          routerLinkActive="bg-white/10 text-white" 
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 font-medium transition-colors text-sm mb-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Timeline
        </a>

        <a 
          routerLink="/discover" 
          routerLinkActive="bg-white/10 text-white" 
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 font-medium transition-colors text-sm mb-2"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          Discover Feeds
        </a>
        @if (authService.isAdmin()) {
          <a 
            routerLink="/admin" 
            routerLinkActive="bg-white/10 text-white" 
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 font-medium transition-colors text-sm mt-8"
          >
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            System Admin
          </a>
        }
      </nav>
      
      <div class="p-6 border-t border-zinc-900 group relative">
        <div class="flex items-center gap-3 cursor-pointer group/user" routerLink="/settings">
          <div class="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm text-zinc-300 font-medium uppercase group-hover/user:border-emerald-500/50 transition-colors">
            {{ authService.currentUser()?.email?.charAt(0) || 'U' }}
          </div>
          <div class="flex flex-col overflow-hidden group-hover/user:text-white transition-colors">
            <span class="text-sm font-medium text-zinc-200 truncate">{{ authService.currentUser()?.name || authService.currentUser()?.email || 'User' }}</span>
            <span class="text-xs text-zinc-500 capitalize">{{ authService.currentUser()?.role || 'Member' }}</span>
          </div>
        </div>
        <button (click)="logout()" class="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
