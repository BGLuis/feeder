import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CodeEditorComponent, CodeTemplate } from '../ui/atoms/code-editor.component';
import { WebhooksConfigComponent } from './webhooks-config.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../core/theme.service';
import { PageHeaderComponent } from '../ui/molecules/page-header.component';
import { SettingRowComponent } from '../ui/molecules/setting-row.component';
import { AlertComponent } from '../ui/molecules/alert.component';
import { ButtonComponent } from '../ui/atoms/button.component';
import { BadgeComponent } from '../ui/atoms/badge.component';
import { ToggleComponent } from '../ui/atoms/toggle.component';
import { SelectComponent } from '../ui/atoms/select.component';
import {
  LucideUser,
  LucideShieldCheck,
  LucideSliders,
  LucideCode,
  LucideServer,
  LucideKeyRound,
  LucideArrowRight,
} from '@lucide/angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CodeEditorComponent,
    WebhooksConfigComponent,
    TranslatePipe,
    PageHeaderComponent,
    SettingRowComponent,
    AlertComponent,
    ButtonComponent,
    BadgeComponent,
    ToggleComponent,
    SelectComponent,
    LucideUser,
    LucideShieldCheck,
    LucideSliders,
    LucideCode,
    LucideServer,
    LucideKeyRound,
    LucideArrowRight,
  ],
  template: `
    <div class="max-w-[800px] mx-auto">
        <app-page-header
          title="User Settings"
          subtitle="Manage your account preferences, security, and authentication methods."
        ></app-page-header>

        <div class="flex flex-col gap-8">
          <!-- Profile Section -->
          <section
            class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8"
          >
            <h2 class="text-heading-h2 font-medium text-text-primary mb-6 flex items-center gap-2.5">
              <svg lucideUser class="w-5 h-5 text-icon-secondary"></svg>
              <span>Profile Information</span>
            </h2>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="flex flex-col gap-1.5">
                  <label class="text-label text-text-primary">Display Name</label>
                  <input
                    type="text"
                    formControlName="name"
                    placeholder="John Doe"
                    class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring text-sm transition-colors"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-label text-text-primary">Email Address</label>
                  <input
                    type="email"
                    formControlName="email"
                    class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring text-sm transition-colors"
                  />
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div class="flex items-center gap-2.5">
                  <span class="text-label text-text-primary">Account Role:</span>
                  <app-badge
                    [label]="authService.currentUser()?.role || 'Member'"
                    tone="accent"
                    [dot]="true"
                  ></app-badge>
                </div>

                <app-button
                  (click)="saveProfile()"
                  [disabled]="profileForm.invalid || !profileForm.dirty || loading()"
                  variant="primary"
                  size="md"
                >
                  @if (loading()) {
                    <span
                      class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"
                    ></span>
                  }
                  Save Changes
                </app-button>
              </div>

              @if (successMessage()) {
                <app-alert tone="success" [description]="successMessage()"></app-alert>
              }
              @if (errorMessage()) {
                <app-alert tone="danger" [description]="errorMessage()"></app-alert>
              }
            </form>
          </section>

          <!-- Security & Passkeys Section -->
          <section
            class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8"
          >
            <h2 class="text-heading-h2 font-medium text-text-primary mb-6 flex items-center gap-2.5">
              <svg lucideShieldCheck class="w-5 h-5 text-icon-secondary"></svg>
              <span>Security & Passkeys</span>
            </h2>

            <div class="flex flex-col gap-4">
              <p class="text-body-sm text-text-secondary leading-relaxed">
                Enhance your account security by registering a Passkey (Touch ID, Face ID, or
                Windows Hello). This allows you to login instantly without typing a password.
              </p>

              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-bg-field border border-border-default rounded-xl gap-4"
              >
                <div class="flex items-center gap-3.5">
                  <div
                    class="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-icon-secondary shrink-0"
                  >
                    <svg lucideKeyRound class="w-5 h-5"></svg>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-text-primary">Hardware Passkeys</p>
                    <p class="text-xs text-text-tertiary mt-0.5">FIDO2 / WebAuthn standard</p>
                  </div>
                </div>

                <app-button (click)="setupPasskey()" variant="secondary" size="md">
                  Setup Passkey
                </app-button>
              </div>
            </div>
          </section>

          <!-- Webhooks Section -->
          <app-webhooks-config></app-webhooks-config>

          <!-- Preferences Section -->
          <section
            class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8"
          >
            <h2 class="text-heading-h2 font-medium text-text-primary mb-6 flex items-center gap-2.5">
              <svg lucideSliders class="w-5 h-5 text-icon-secondary"></svg>
              <span>{{ 'SETTINGS.PREFERENCES_TITLE' | translate }}</span>
            </h2>

            <div class="divide-y divide-border-subtle">
              <app-setting-row
                [title]="'COMMON.LANGUAGE' | translate"
                [description]="'SETTINGS.LANGUAGE_DESC' | translate"
              >
                <div class="w-36">
                  <app-select
                    [options]="languageOptions"
                    [value]="translateService.currentLang() || 'en'"
                    (valueChange)="onLangChange($event)"
                  ></app-select>
                </div>
              </app-setting-row>

              <app-setting-row
                [title]="'SETTINGS.DARK_MODE' | translate"
                [description]="'SETTINGS.DARK_MODE_DESC' | translate"
              >
                <app-toggle
                  [checked]="themeService.isDarkMode()"
                  label="Toggle dark mode"
                  (checkedChange)="themeService.toggleTheme()"
                ></app-toggle>
              </app-setting-row>
            </div>
          </section>

          <!-- Admin Portal Link (Visible only for admins) -->
          @if (authService.isAdmin()) {
            <section
              class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8"
            >
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3.5">
                  <div
                    class="w-10 h-10 rounded-full bg-bg-accent-subtle text-icon-accent flex items-center justify-center shrink-0"
                  >
                    <svg lucideServer class="w-5 h-5"></svg>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-text-primary">System Administration</h3>
                    <p class="text-xs text-text-secondary mt-0.5">
                      Inspect background queues, system metrics, and operational logs.
                    </p>
                  </div>
                </div>

                <a routerLink="/admin">
                  <app-button variant="secondary" size="md">
                    <span>Open Admin</span>
                    <svg lucideArrowRight class="w-4 h-4"></svg>
                  </app-button>
                </a>
              </div>
            </section>
          }

          <!-- Advanced JSON Config Section -->
          <section
            class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8"
          >
            <h2 class="text-heading-h2 font-medium text-text-primary mb-2 flex items-center gap-2.5">
              <svg lucideCode class="w-5 h-5 text-icon-secondary"></svg>
              <span>Advanced Configuration (JSON)</span>
            </h2>
            <p class="text-body-sm text-text-secondary mb-6">
              Use the editor below to safely build your custom JSON configurations. You can use
              ready-made templates to start quickly without formatting errors.
            </p>

            <app-code-editor
              title="Custom JSON Data"
              language="json"
              height="300px"
              [code]="customConfigCode"
              [templates]="jsonTemplates"
              (codeChange)="onCodeChange($event)"
            ></app-code-editor>
          </section>
        </div>
      </div>
  `,
})
export class SettingsComponent {
  authService = inject(AuthService);
  translateService = inject(TranslateService);
  themeService = inject(ThemeService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Español', value: 'es' },
    { label: 'Português', value: 'pt' },
  ];

  profileForm = this.fb.group({
    name: [this.authService.currentUser()?.name || ''],
    email: [this.authService.currentUser()?.email || '', [Validators.required, Validators.email]],
  });

  customConfigCode = '{\n  "feature_flags": {\n    "new_dashboard": false\n  }\n}';

  jsonTemplates: CodeTemplate[] = [
    {
      name: 'Configuração Básica',
      code: '{\n  "theme": "dark",\n  "notifications": true\n}',
    },
    {
      name: 'Integração de API',
      code: '{\n  "api_endpoint": "https://api.example.com",\n  "timeout_ms": 5000,\n  "retries": 3,\n  "headers": {\n    "Authorization": "Bearer <TOKEN>"\n  }\n}',
    },
    {
      name: 'Regras de Permissão (Roles)',
      code: '{\n  "roles": [\n    {\n      "id": "admin",\n      "permissions": ["read", "write", "delete"]\n    },\n    {\n      "id": "viewer",\n      "permissions": ["read"]\n    }\n  ]\n}',
    },
  ];

  onCodeChange(newCode: string) {
    this.customConfigCode = newCode;
  }

  onLangChange(lang: string) {
    this.translateService.use(lang);
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* ignore */
    }
  }

  async saveProfile() {
    if (this.profileForm.invalid) return;

    this.loading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    try {
      const { name, email } = this.profileForm.value;
      await this.authService.updateProfile(name!, email!);
      this.successMessage.set('Profile updated successfully.');
      this.profileForm.markAsPristine();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || err.message || 'Failed to update profile');
    } finally {
      this.loading.set(false);
    }
  }

  async setupPasskey() {
    this.errorMessage.set('');
    this.successMessage.set('');
    const email = this.authService.currentUser()?.email;
    if (!email) {
      this.errorMessage.set('Email is required to setup a passkey.');
      return;
    }

    try {
      await this.authService.registerPasskey(email);
      this.successMessage.set('Passkey registered successfully!');
    } catch (err: any) {
      this.errorMessage.set(
        err.error?.message ||
          err.message ||
          'Failed to setup passkey. Ensure your browser/device supports WebAuthn.',
      );
    }
  }
}
