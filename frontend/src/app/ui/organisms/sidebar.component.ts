import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  LucideRss,
  LucideLayoutDashboard,
  LucideNewspaper,
  LucidePlus,
  LucideServer,
  LucideSettings,
  LucideSun,
  LucideMoon,
  LucideLogOut,
  LucideChevronLeft,
  LucideChevronRight,
} from '@lucide/angular';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { AvatarComponent } from '../atoms/avatar.component';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    AvatarComponent,
    BottomNavComponent,
    LucideRss,
    LucideLayoutDashboard,
    LucideNewspaper,
    LucidePlus,
    LucideServer,
    LucideSettings,
    LucideSun,
    LucideMoon,
    LucideLogOut,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  template: `
    <!-- Desktop Sidebar -->
    <aside
      class="hidden md:flex h-full bg-bg-sidebar border-r border-border-default flex-col py-6 transition-all duration-200 relative select-none shrink-0"
      [class.w-[248px]]="isExpanded"
      [class.w-[72px]]="!isExpanded"
    >
      <!-- Collapse toggle button -->
      <button
        type="button"
        (click)="toggle()"
        class="absolute -right-3 top-8 bg-bg-surface border border-border-default text-icon-secondary hover:text-icon-primary rounded-full p-1 z-20 shadow-elevation-1 transition-transform hover:scale-110 focus:outline-none focus:shadow-focus-ring"
        [attr.aria-label]="isExpanded ? 'Recolher sidebar' : 'Expandir sidebar'"
      >
        @if (isExpanded) {
          <svg lucideChevronLeft class="w-3.5 h-3.5"></svg>
        } @else {
          <svg lucideChevronRight class="w-3.5 h-3.5"></svg>
        }
      </button>

      <!-- Logo Feeder -->
      <div
        class="flex items-center overflow-hidden h-10 px-4"
        [class.justify-center]="!isExpanded"
        [class.gap-3]="isExpanded"
      >
        <div class="w-9 h-9 rounded-xl bg-bg-inverse text-text-inverse flex items-center justify-center shrink-0 shadow-elevation-1">
          <svg lucideRss class="w-4 h-4"></svg>
        </div>
        @if (isExpanded) {
          <span class="text-xl font-medium text-text-primary tracking-tight truncate">Feeder</span>
        }
      </div>

      <!-- Navigation groups -->
      <nav class="flex-1 mt-8 flex flex-col w-full px-3 gap-6 overflow-y-auto">
        <!-- READ Section -->
        <div>
          @if (isExpanded) {
            <span class="text-overline uppercase text-text-tertiary px-3 mb-2 block tracking-wider font-semibold">
              Read
            </span>
          }
          <div class="flex flex-col gap-1">
            <a
              routerLink="/"
              [routerLinkActiveOptions]="{ exact: true }"
              routerLinkActive="bg-bg-selected text-text-primary border-l-[3px] border-l-border-focus font-medium"
              class="flex items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              [class.justify-center]="!isExpanded"
              [class.h-10]="!isExpanded"
              [class.w-10]="!isExpanded"
              [class.mx-auto]="!isExpanded"
              [class.px-3]="isExpanded"
              [class.py-2.5]="isExpanded"
              [class.gap-3]="isExpanded"
              [title]="!isExpanded ? ('NAV.DASHBOARD' | translate) : ''"
            >
              <svg lucideLayoutDashboard class="w-4 h-4 shrink-0"></svg>
              @if (isExpanded) {
                <span class="truncate">{{ 'NAV.DASHBOARD' | translate }}</span>
              }
            </a>

            <a
              routerLink="/reader"
              routerLinkActive="bg-bg-selected text-text-primary border-l-[3px] border-l-border-focus font-medium"
              class="flex items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              [class.justify-center]="!isExpanded"
              [class.h-10]="!isExpanded"
              [class.w-10]="!isExpanded"
              [class.mx-auto]="!isExpanded"
              [class.px-3]="isExpanded"
              [class.py-2.5]="isExpanded"
              [class.gap-3]="isExpanded"
              [title]="!isExpanded ? 'Timeline' : ''"
            >
              <svg lucideNewspaper class="w-4 h-4 shrink-0"></svg>
              @if (isExpanded) {
                <span class="truncate">{{ 'NAV.TIMELINE' | translate }}</span>
              }
            </a>

            <a
              routerLink="/discover"
              routerLinkActive="bg-bg-selected text-text-primary border-l-[3px] border-l-border-focus font-medium"
              class="flex items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              [class.justify-center]="!isExpanded"
              [class.h-10]="!isExpanded"
              [class.w-10]="!isExpanded"
              [class.mx-auto]="!isExpanded"
              [class.px-3]="isExpanded"
              [class.py-2.5]="isExpanded"
              [class.gap-3]="isExpanded"
              [title]="!isExpanded ? ('NAV.DISCOVER' | translate) : ''"
            >
              <svg lucidePlus class="w-4 h-4 shrink-0"></svg>
              @if (isExpanded) {
                <span class="truncate">{{ 'NAV.DISCOVER' | translate }}</span>
              }
            </a>
          </div>
        </div>

        <!-- SYSTEM Section -->
        <div>
          @if (isExpanded) {
            <span class="text-overline uppercase text-text-tertiary px-3 mb-2 block tracking-wider font-semibold">
              System
            </span>
          }
          <div class="flex flex-col gap-1">
            @if (authService.isAdmin()) {
              <a
                routerLink="/admin"
                routerLinkActive="bg-bg-selected text-text-primary border-l-[3px] border-l-border-focus font-medium"
                class="flex items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
                [class.justify-center]="!isExpanded"
                [class.h-10]="!isExpanded"
                [class.w-10]="!isExpanded"
                [class.mx-auto]="!isExpanded"
                [class.px-3]="isExpanded"
                [class.py-2.5]="isExpanded"
                [class.gap-3]="isExpanded"
                [title]="!isExpanded ? ('NAV.ADMIN' | translate) : ''"
              >
                <svg lucideServer class="w-4 h-4 shrink-0"></svg>
                @if (isExpanded) {
                  <span class="truncate">{{ 'NAV.ADMIN' | translate }}</span>
                }
              </a>
            }

            <a
              routerLink="/settings"
              routerLinkActive="bg-bg-selected text-text-primary border-l-[3px] border-l-border-focus font-medium"
              class="flex items-center rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-sm"
              [class.justify-center]="!isExpanded"
              [class.h-10]="!isExpanded"
              [class.w-10]="!isExpanded"
              [class.mx-auto]="!isExpanded"
              [class.px-3]="isExpanded"
              [class.py-2.5]="isExpanded"
              [class.gap-3]="isExpanded"
              [title]="!isExpanded ? ('NAV.SETTINGS' | translate) : ''"
            >
              <svg lucideSettings class="w-4 h-4 shrink-0"></svg>
              @if (isExpanded) {
                <span class="truncate">{{ 'NAV.SETTINGS' | translate }}</span>
              }
            </a>
          </div>
        </div>
      </nav>

      <!-- Footer: User & actions -->
      <div
        class="mt-auto pt-4 border-t border-border-subtle w-full flex items-center overflow-hidden px-3"
        [class.flex-col]="!isExpanded"
        [class.gap-3]="!isExpanded"
        [class.justify-between]="isExpanded"
      >
        @if (isExpanded) {
          <a
            routerLink="/settings"
            class="flex items-center gap-2.5 cursor-pointer group/user overflow-hidden flex-1 min-w-0 mr-2 p-1 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <app-avatar
              [name]="userName()"
              size="sm"
            ></app-avatar>
            <div class="flex flex-col overflow-hidden min-w-0">
              <span class="text-xs font-medium text-text-primary truncate">{{ userName() }}</span>
              <span class="text-[11px] text-text-tertiary capitalize truncate">{{ authService.currentUser()?.role || 'Member' }}</span>
            </div>
          </a>

          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              (click)="themeService.toggleTheme()"
              class="p-1.5 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-bg-hover transition-colors"
              [title]="themeService.isDarkMode() ? 'Modo claro' : 'Modo escuro'"
            >
              @if (themeService.isDarkMode()) {
                <svg lucideSun class="w-4 h-4"></svg>
              } @else {
                <svg lucideMoon class="w-4 h-4"></svg>
              }
            </button>
            <button
              type="button"
              (click)="logout()"
              class="p-1.5 rounded-md text-icon-secondary hover:text-icon-danger hover:bg-bg-danger-subtle transition-colors"
              title="Logout"
            >
              <svg lucideLogOut class="w-4 h-4"></svg>
            </button>
          </div>
        } @else {
          <a
            routerLink="/settings"
            title="Settings"
            class="hover:opacity-80 transition-opacity"
          >
            <app-avatar
              [name]="userName()"
              size="sm"
            ></app-avatar>
          </a>

          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="p-2 rounded-md text-icon-secondary hover:text-icon-primary hover:bg-bg-hover transition-colors"
            [title]="themeService.isDarkMode() ? 'Modo claro' : 'Modo escuro'"
          >
            @if (themeService.isDarkMode()) {
              <svg lucideSun class="w-4 h-4"></svg>
            } @else {
              <svg lucideMoon class="w-4 h-4"></svg>
            }
          </button>

          <button
            type="button"
            (click)="logout()"
            class="p-2 rounded-md text-icon-secondary hover:text-icon-danger hover:bg-bg-danger-subtle transition-colors"
            title="Logout"
          >
            <svg lucideLogOut class="w-4 h-4"></svg>
          </button>
        }
      </div>
    </aside>

    <!-- Mobile Bottom Navigation Component -->
    <app-bottom-nav></app-bottom-nav>
  `,
})
export class SidebarComponent {
  authService = inject(AuthService);
  translateService = inject(TranslateService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  isExpanded =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('sidebarExpanded') !== 'false'
      : true;

  toggle() {
    this.isExpanded = !this.isExpanded;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sidebarExpanded', String(this.isExpanded));
    }
  }

  userName(): string {
    const user = this.authService.currentUser();
    return user?.name || user?.email || 'User';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
