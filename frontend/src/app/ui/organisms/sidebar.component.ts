import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, CommonModule],
  template: `
    <!-- Desktop Sidebar -->
    <aside 
      class="hidden md:flex h-full bg-white dark:bg-[#050505] border-r border-zinc-200 dark:border-zinc-900 flex-col py-6 transition-all duration-300 relative"
      [class.w-64]="isExpanded"
      [class.w-20]="!isExpanded"
    >
      <button (click)="toggle()" class="absolute -right-3 top-8 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-white rounded-full p-1.5 z-10 transition-colors shadow-md cursor-pointer">
        @if (isExpanded) {
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        } @else {
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        }
      </button>

      <div class="flex items-center overflow-hidden" [class.justify-center]="!isExpanded" [class.px-8]="isExpanded" [class.gap-3]="isExpanded">
        <div class="bg-zinc-100 text-zinc-900 p-2 rounded-[0.8rem] shadow-sm shrink-0">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
        </div>
        @if (isExpanded) {
          <span class="text-xl font-medium text-zinc-900 dark:text-white tracking-tight shrink-0">Feeder</span>
        }
      </div>
      
      <nav class="flex-1 mt-10 flex flex-col w-full px-4 overflow-hidden">
        <a 
          routerLink="/" 
          [routerLinkActiveOptions]="{exact: true}"
          routerLinkActive="bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white" 
          class="flex items-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-white/5 hover:text-zinc-800 dark:text-zinc-200 transition-all mb-2"
          [class.justify-center]="!isExpanded"
          [class.w-12]="!isExpanded" [class.h-12]="!isExpanded" [class.mx-auto]="!isExpanded"
          [class.px-4]="isExpanded" [class.py-3]="isExpanded" [class.gap-3]="isExpanded"
          [title]="!isExpanded ? ('NAV.DASHBOARD' | translate) : ''"
        >
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
          @if (isExpanded) {
            <span class="font-medium text-sm whitespace-nowrap">{{ 'NAV.DASHBOARD' | translate }}</span>
          }
        </a>
        
        <a 
          routerLink="/reader" 
          routerLinkActive="bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white" 
          class="flex items-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-white/5 hover:text-zinc-800 dark:text-zinc-200 transition-all mb-2"
          [class.justify-center]="!isExpanded"
          [class.w-12]="!isExpanded" [class.h-12]="!isExpanded" [class.mx-auto]="!isExpanded"
          [class.px-4]="isExpanded" [class.py-3]="isExpanded" [class.gap-3]="isExpanded"
          [title]="!isExpanded ? 'Timeline' : ''"
        >
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          @if (isExpanded) {
            <span class="font-medium text-sm whitespace-nowrap">Timeline</span>
          }
        </a>

        <a 
          routerLink="/discover" 
          routerLinkActive="bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white" 
          class="flex items-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-white/5 hover:text-zinc-800 dark:text-zinc-200 transition-all mb-2"
          [class.justify-center]="!isExpanded"
          [class.w-12]="!isExpanded" [class.h-12]="!isExpanded" [class.mx-auto]="!isExpanded"
          [class.px-4]="isExpanded" [class.py-3]="isExpanded" [class.gap-3]="isExpanded"
          [title]="!isExpanded ? ('NAV.DISCOVER' | translate) : ''"
        >
          <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          @if (isExpanded) {
            <span class="font-medium text-sm whitespace-nowrap">{{ 'NAV.DISCOVER' | translate }}</span>
          }
        </a>
        
        @if (authService.isAdmin()) {
          <a 
            routerLink="/admin" 
            routerLinkActive="bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white" 
            class="flex items-center rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-white/5 hover:text-zinc-800 dark:text-zinc-200 transition-all mt-auto mb-2"
            [class.justify-center]="!isExpanded"
            [class.w-12]="!isExpanded" [class.h-12]="!isExpanded" [class.mx-auto]="!isExpanded"
            [class.px-4]="isExpanded" [class.py-3]="isExpanded" [class.gap-3]="isExpanded"
            [title]="!isExpanded ? 'System Admin' : ''"
          >
            <svg class="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            @if (isExpanded) {
              <span class="font-medium text-sm whitespace-nowrap">System Admin</span>
            }
          </a>
        }
      </nav>
      
      <div class="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-900 w-full flex items-center overflow-hidden"
           [class.flex-col]="!isExpanded" [class.gap-4]="!isExpanded"
           [class.px-6]="isExpanded" [class.justify-between]="isExpanded">
           
        @if (isExpanded) {
          <div class="flex items-center gap-3 cursor-pointer group/user overflow-hidden" routerLink="/settings">
            <div class="w-10 h-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-sm text-zinc-700 dark:text-zinc-300 font-medium uppercase group-hover/user:border-emerald-500/50 transition-colors">
              {{ authService.currentUser()?.email?.charAt(0) || 'U' }}
            </div>
            <div class="flex flex-col overflow-hidden group-hover/user:text-zinc-900 dark:text-white transition-colors">
              <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{{ authService.currentUser()?.name || authService.currentUser()?.email || 'User' }}</span>
              <span class="text-xs text-zinc-500 capitalize">{{ authService.currentUser()?.role || 'Member' }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="themeService.toggleTheme()" class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shrink-0" title="Toggle Theme">
              @if (themeService.isDarkMode()) {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              } @else {
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              }
            </button>
            <button (click)="logout()" class="text-zinc-500 hover:text-red-400 transition-colors shrink-0" title="Logout">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        } @else {
          <a routerLink="/settings" class="w-10 h-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-sm text-zinc-700 dark:text-zinc-300 font-medium uppercase hover:border-emerald-500/50 transition-colors" title="Settings">
            {{ authService.currentUser()?.email?.charAt(0) || 'U' }}
          </a>
          <button (click)="themeService.toggleTheme()" class="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors" title="Toggle Theme">
            @if (themeService.isDarkMode()) {
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            } @else {
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            }
          </button>
          <button (click)="logout()" class="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Logout">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        }
      </div>
    </aside>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden flex items-center justify-around w-full h-16 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-900 pb-[env(safe-area-inset-bottom)] px-2">
      <a 
        routerLink="/" 
        [routerLinkActiveOptions]="{exact: true}"
        routerLinkActive="text-zinc-900 dark:text-white bg-zinc-200 dark:bg-white/10" 
        class="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors"
      >
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
      </a>
      
      <a 
        routerLink="/reader" 
        routerLinkActive="text-zinc-900 dark:text-white bg-zinc-200 dark:bg-white/10" 
        class="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors"
      >
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </a>

      <a 
        routerLink="/discover" 
        routerLinkActive="text-zinc-900 dark:text-white bg-zinc-200 dark:bg-white/10" 
        class="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors"
      >
        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
      </a>

      @if (authService.isAdmin()) {
        <a 
          routerLink="/admin" 
          routerLinkActive="text-zinc-900 dark:text-white bg-zinc-200 dark:bg-white/10" 
          class="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </a>
      }

      <a 
        routerLink="/settings" 
        routerLinkActive="border-white"
        class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-transparent flex items-center justify-center text-xs text-zinc-700 dark:text-zinc-300 font-medium uppercase transition-all"
      >
        {{ authService.currentUser()?.email?.charAt(0) || 'U' }}
      </a>
    </nav>
  `,
})
export class SidebarComponent {
  authService = inject(AuthService);
  translateService = inject(TranslateService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  
  isExpanded = typeof localStorage !== 'undefined' ? localStorage.getItem('sidebarExpanded') !== 'false' : true;

  toggle() {
    this.isExpanded = !this.isExpanded;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sidebarExpanded', String(this.isExpanded));
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
