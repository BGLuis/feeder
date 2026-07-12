import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { AuthService } from '../core/auth.service';
import { CodeEditorComponent, CodeTemplate } from '../ui/code-editor.component';
import { WebhooksConfigComponent } from './webhooks-config.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MainLayoutComponent, ReactiveFormsModule, CodeEditorComponent, WebhooksConfigComponent],
  template: `
    <app-main-layout>
      <div class="max-w-3xl mx-auto py-8">
        <header class="mb-10">
          <h1 class="text-4xl tracking-tight font-medium text-zinc-50 mb-3">User Settings</h1>
          <p class="text-zinc-400 text-lg leading-relaxed max-w-[65ch]">Manage your account preferences, security, and authentication methods.</p>
        </header>

        <div class="flex flex-col gap-6">
          <!-- Profile Section -->
          <section class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
            <h2 class="text-xl font-medium text-zinc-100 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Information
            </h2>
            
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="flex flex-col gap-6">
              
              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
                <input 
                  type="text" 
                  formControlName="name"
                  placeholder="John Doe"
                  class="w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                <input 
                  type="email" 
                  formControlName="email"
                  class="w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200"
                />
              </div>
              
              <div class="flex items-center justify-between mt-2">
                <div>
                  <label class="block text-sm font-medium text-zinc-400 mb-2">Role</label>
                  <div class="inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium uppercase tracking-wider">
                    {{ authService.currentUser()?.role || 'Member' }}
                  </div>
                </div>

                <button 
                  type="submit" 
                  [disabled]="profileForm.invalid || !profileForm.dirty || loading()"
                  class="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  @if (loading()) {
                    <span class="inline-block w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin"></span>
                  }
                  Save Changes
                </button>
              </div>

              @if (successMessage()) {
                <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm border border-emerald-500/20 mt-2">
                  {{ successMessage() }}
                </div>
              }
              @if (errorMessage()) {
                <div class="p-3 bg-red-950/30 text-red-400 rounded-xl text-sm border border-red-900/50 mt-2">
                  {{ errorMessage() }}
                </div>
              }
            </form>
          </section>

          <!-- Security Section -->
          <section class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-medium text-zinc-100 flex items-center gap-2">
                <svg class="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security & Passkeys
              </h2>
            </div>
            
            <div class="flex flex-col gap-4">
              <p class="text-zinc-400 text-sm leading-relaxed mb-2">
                Enhance your account security by registering a Passkey (Touch ID, Face ID, or Windows Hello). This allows you to login instantly without typing a password.
              </p>
              
              <div class="flex items-center justify-between p-4 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-400">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-zinc-200 font-medium text-sm">Hardware Passkeys</p>
                    <p class="text-zinc-500 text-xs mt-0.5">Not configured</p>
                  </div>
                </div>
                <button (click)="setupPasskey()" class="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 rounded-full text-sm font-medium transition-colors">
                  Setup Passkey
                </button>
              </div>
            </div>
          </section>

          <!-- Webhooks Section -->
          <app-webhooks-config></app-webhooks-config>

          <!-- Preferences Section -->
          <section class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
            <h2 class="text-xl font-medium text-zinc-100 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              App Preferences
            </h2>
            
            <div class="flex items-center justify-between py-2">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-zinc-200">Dark Mode</label>
                <span class="text-xs text-zinc-500">The app is permanently locked to dark mode. Because it looks better.</span>
              </div>
              <label class="relative inline-flex items-center cursor-not-allowed opacity-70">
                <input type="checkbox" checked disabled class="sr-only peer">
                <div class="w-11 h-6 bg-emerald-500 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[22px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-emerald-500"></div>
              </label>
            </div>
          </section>
          <section class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
            <h2 class="text-xl font-medium text-zinc-100 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Advanced Configuration (JSON)
            </h2>
            <p class="text-zinc-400 text-sm mb-6">
              Use the editor below to safely build your custom JSON configurations. You can use ready-made templates to start quickly without worrying about formatting errors.
            </p>
            
            <app-code-editor
              title="Custom JSON Data"
              language="json"
              height="350px"
              [code]="customConfigCode"
              [templates]="jsonTemplates"
              (codeChange)="onCodeChange($event)"
            ></app-code-editor>
            
          </section>
        </div>
      </div>
    </app-main-layout>
  `
})
export class SettingsComponent {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  profileForm = this.fb.group({
    name: [this.authService.currentUser()?.name || ''],
    email: [this.authService.currentUser()?.email || '', [Validators.required, Validators.email]]
  });

  customConfigCode = '{\n  "feature_flags": {\n    "new_dashboard": false\n  }\n}';
  
  jsonTemplates: CodeTemplate[] = [
    {
      name: 'Configuração Básica',
      code: '{\n  "theme": "dark",\n  "notifications": true\n}'
    },
    {
      name: 'Integração de API',
      code: '{\n  "api_endpoint": "https://api.example.com",\n  "timeout_ms": 5000,\n  "retries": 3,\n  "headers": {\n    "Authorization": "Bearer <TOKEN>"\n  }\n}'
    },
    {
      name: 'Regras de Permissão (Roles)',
      code: '{\n  "roles": [\n    {\n      "id": "admin",\n      "permissions": ["read", "write", "delete"]\n    },\n    {\n      "id": "viewer",\n      "permissions": ["read"]\n    }\n  ]\n}'
    }
  ];

  onCodeChange(newCode: string) {
    this.customConfigCode = newCode;
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
      this.errorMessage.set(err.error?.message || err.message || 'Failed to setup passkey. Ensure your browser/device supports WebAuthn.');
    }
  }
}
