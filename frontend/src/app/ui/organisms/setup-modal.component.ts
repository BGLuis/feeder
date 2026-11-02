import { Component, ElementRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideSun, LucideMoon } from '@lucide/angular';
import { ThemeService } from '../../core/theme.service';
import { ButtonComponent } from '../atoms/button.component';
import { SelectComponent, SelectOption } from '../atoms/select.component';

@Component({
  selector: 'app-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, LucideSun, LucideMoon, ButtonComponent, SelectComponent],
  template: `
    @if (isVisible()) {
      <div
        #setupBackdrop
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-[4px]"
        (keydown)="onKeydown($event)"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-modal-title"
        tabindex="-1"
      >
        <div
          #setupPanel
          class="bg-bg-surface border border-border-default rounded-3xl p-8 max-w-md w-full shadow-elevation-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <h2 id="setup-modal-title" class="text-heading-h2 font-medium text-text-primary mb-2">
            {{ 'SETUP.WELCOME' | translate }}
          </h2>
          <p class="text-body-sm text-text-secondary mb-8">
            {{ 'SETUP.DESC' | translate }}
          </p>

          <div class="flex flex-col gap-6">
            <!-- Language -->
            <div class="flex flex-col gap-2">
              <label class="text-label text-text-primary">
                {{ 'COMMON.LANGUAGE' | translate }}
              </label>
              <app-select
                [options]="languageOptions"
                [(value)]="selectedLang"
                (valueChange)="onLangChange()"
              ></app-select>
            </div>

            <!-- Theme -->
            <div class="flex flex-col gap-2">
              <label class="text-label text-text-primary">
                {{ 'SETUP.THEME' | translate }}
              </label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="selectedTheme = 'dark'"
                  [class]="
                    selectedTheme === 'dark'
                      ? 'border-border-accent bg-bg-accent-subtle text-text-accent'
                      : 'border-border-default bg-bg-muted text-text-secondary hover:text-text-primary'
                  "
                  class="border rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer"
                >
                  <svg lucideMoon class="w-6 h-6"></svg>
                  <span class="text-sm font-medium">{{
                    'SETUP.DARK' | translate
                  }}</span>
                </button>

                <button
                  type="button"
                  (click)="selectedTheme = 'light'"
                  [class]="
                    selectedTheme === 'light'
                      ? 'border-border-accent bg-bg-accent-subtle text-text-accent'
                      : 'border-border-default bg-bg-muted text-text-secondary hover:text-text-primary'
                  "
                  class="border rounded-xl p-4 flex flex-col items-center gap-2 transition-all cursor-pointer"
                >
                  <svg lucideSun class="w-6 h-6"></svg>
                  <span class="text-sm font-medium">{{
                    'SETUP.LIGHT' | translate
                  }}</span>
                </button>
              </div>
            </div>

            <app-button
              (click)="finishSetup()"
              variant="primary"
              size="lg"
              customClass="w-full mt-4"
            >
              {{ 'SETUP.FINISH' | translate }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SetupModalComponent implements OnInit {
  translateService = inject(TranslateService);
  themeService = inject(ThemeService);

  isVisible = signal<boolean>(false);
  selectedLang = 'en';
  selectedTheme: 'light' | 'dark' = 'dark';

  readonly languageOptions: SelectOption[] = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Português', value: 'pt' },
  ];

  @ViewChild('setupPanel') setupPanel?: ElementRef<HTMLElement>;
  private previousActiveElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const visible = this.isVisible();
      if (visible) {
        if (typeof document !== 'undefined') {
          this.previousActiveElement = document.activeElement as HTMLElement | null;
        }
        setTimeout(() => {
          this.focusFirstElement();
        }, 0);
      } else {
        this.restoreFocus();
      }
    });
  }

  private getFocusableElements(): HTMLElement[] {
    if (!this.setupPanel?.nativeElement) return [];
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this.setupPanel.nativeElement.querySelectorAll<HTMLElement>(selector));
  }

  private focusFirstElement() {
    const focusables = this.getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    }
  }

  private restoreFocus() {
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  ngOnInit() {
    const isConfigured = localStorage.getItem('app_configured');
    if (!isConfigured) {
      this.isVisible.set(true);
      const lang = this.translateService.currentLang();
      this.selectedLang = lang || 'en';
      this.selectedTheme = this.themeService.isDarkMode() ? 'dark' : 'light';
    }
  }

  onLangChange() {
    this.translateService.use(this.selectedLang);
    localStorage.setItem('lang', this.selectedLang);
  }

  finishSetup() {
    if (this.selectedTheme === 'dark' && !this.themeService.isDarkMode()) {
      this.themeService.toggleTheme();
    } else if (this.selectedTheme === 'light' && this.themeService.isDarkMode()) {
      this.themeService.toggleTheme();
    }

    localStorage.setItem('app_configured', 'true');
    this.isVisible.set(false);
  }
}
