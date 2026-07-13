import { Component, inject, signal, OnInit } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    @if (isVisible()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div class="bg-white dark:bg-[#121212] border border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h2 class="text-2xl font-medium text-zinc-900 dark:text-white mb-2">
            {{ 'SETUP.WELCOME' | translate }}
          </h2>
          <p class="text-zinc-600 dark:text-zinc-400 text-sm mb-8">
            {{ 'SETUP.DESC' | translate }}
          </p>
          
          <div class="flex flex-col gap-6">
            <!-- Language -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {{ 'COMMON.LANGUAGE' | translate }}
              </label>
              <select 
                [(ngModel)]="selectedLang"
                (change)="onLangChange()"
                class="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all">
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="pt">🇧🇷 Português</option>
              </select>
            </div>

            <!-- Theme -->
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {{ 'SETUP.THEME' | translate }}
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button 
                  (click)="selectedTheme = 'dark'"
                  [class.border-emerald-500]="selectedTheme === 'dark'"
                  [class.border-zinc-300]="selectedTheme !== 'dark'"
                  [class.dark:border-zinc-800]="selectedTheme !== 'dark'"
                  [class.bg-emerald-500]="selectedTheme === 'dark'"
                  [class.bg-opacity-10]="selectedTheme === 'dark'"
                  [class.bg-zinc-100]="selectedTheme !== 'dark'"
                  [class.dark:bg-zinc-900]="selectedTheme !== 'dark'"
                  class="border rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
                  <svg class="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{{ 'SETUP.DARK' | translate }}</span>
                </button>
                
                <button 
                  (click)="selectedTheme = 'light'"
                  [class.border-emerald-500]="selectedTheme === 'light'"
                  [class.border-zinc-300]="selectedTheme !== 'light'"
                  [class.dark:border-zinc-800]="selectedTheme !== 'light'"
                  [class.bg-emerald-500]="selectedTheme === 'light'"
                  [class.bg-opacity-10]="selectedTheme === 'light'"
                  [class.bg-zinc-100]="selectedTheme !== 'light'"
                  [class.dark:bg-zinc-900]="selectedTheme !== 'light'"
                  class="border rounded-xl p-4 flex flex-col items-center gap-2 transition-all">
                  <svg class="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{{ 'SETUP.LIGHT' | translate }}</span>
                </button>
              </div>
            </div>

            <button 
              (click)="finishSetup()"
              class="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-900 dark:text-white font-medium py-3 rounded-xl transition-colors mt-4">
              {{ 'SETUP.FINISH' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SetupModalComponent implements OnInit {
  translateService = inject(TranslateService);
  themeService = inject(ThemeService);
  
  isVisible = signal(false);
  selectedLang = 'en';
  selectedTheme = 'dark';

  ngOnInit() {
    const isSetupCompleted = localStorage.getItem('feeder_setup_completed');
    if (!isSetupCompleted) {
      this.isVisible.set(true);
      this.initializeDefaults();
    }
  }

  initializeDefaults() {
    // Auto-detect browser language
    const browserLang = this.translateService.getBrowserLang();
    if (browserLang && browserLang.match(/en|es|pt/)) {
      this.selectedLang = browserLang;
    }
    
    // Auto-detect browser theme preference
    this.selectedTheme = this.themeService.isDarkMode() ? 'dark' : 'light';
    
    this.onLangChange();
  }

  onLangChange() {
    this.translateService.use(this.selectedLang);
  }

  finishSetup() {
    if (this.selectedTheme === 'dark') {
      this.themeService.setDarkTheme();
    } else {
      this.themeService.setLightTheme();
    }
    localStorage.setItem('feeder_setup_completed', 'true');
    this.isVisible.set(false);
  }
}
