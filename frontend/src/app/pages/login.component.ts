import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../ui/templates/auth-layout.component';
import { LucideFingerprint } from '@lucide/angular';
import { AuthService } from '../core/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AuthLayoutComponent, LucideFingerprint, FormsModule, RouterLink],
  template: `
    <app-auth-layout>
      <div class="w-full max-w-md mx-auto">
        <div class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8 md:p-10 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-800/10 to-transparent opacity-50"></div>
          
          <div class="relative z-10">
            <div class="text-center mb-10">
              <h1 class="text-4xl font-light text-zinc-50 tracking-tight">Feeder</h1>
              <p class="text-zinc-400 mt-3 text-sm">Welcome back. Enter your details.</p>
            </div>

            <div class="space-y-6">
              <div class="space-y-2 text-left">
                <label class="text-sm font-medium text-zinc-200 block">Email</label>
                <input type="email" placeholder="nome@exemplo.com" [(ngModel)]="email"
                  class="w-full px-4 py-3.5 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-100 placeholder:text-zinc-600" />
              </div>
              
              <div class="space-y-2 text-left">
                <label class="text-sm font-medium text-zinc-200 block">Password</label>
                <input type="password" placeholder="••••••••" [(ngModel)]="password"
                  class="w-full px-4 py-3.5 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-100 placeholder:text-zinc-600" />
              </div>

              @if (errorMessage()) {
                <div class="p-4 bg-red-950/30 text-red-400 rounded-2xl text-sm border border-red-900/50 flex items-start gap-3">
                  <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ errorMessage() }}</span>
                </div>
              }

              <div class="pt-2">
                <button (click)="onLogin()"
                  [disabled]="loading()"
                  class="w-full bg-zinc-100 hover:bg-white text-zinc-950 px-8 py-3.5 rounded-full font-medium transition-all focus:outline-none focus:ring-4 focus:ring-zinc-100/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm shadow-sm">
                  @if (loading()) {
                    <span class="inline-block w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin"></span>
                  }
                  Sign In
                </button>
              </div>
            </div>

            <div class="my-8 flex items-center gap-4">
              <div class="h-px bg-zinc-800/50 flex-1"></div>
              <span class="text-xs text-zinc-600 font-medium uppercase tracking-widest">Or continue with</span>
              <div class="h-px bg-zinc-800/50 flex-1"></div>
            </div>

            <button (click)="onLoginWithPasskey()"
              [disabled]="loading()"
              class="w-full bg-[#0a0a0a] border border-zinc-800/50 hover:bg-zinc-800/30 text-zinc-300 px-8 py-3.5 rounded-full font-medium transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm group">
              <svg lucideFingerprint class="w-5 h-5 text-zinc-500 group-hover:text-emerald-500 transition-colors"></svg>
              Passkey
            </button>

            <p class="text-center text-sm text-zinc-500 mt-8">
              Don't have an account? 
              <a routerLink="/register" class="text-zinc-300 hover:text-white font-medium transition-colors">Sign up</a>
            </p>
          </div>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  errorMessage = signal('');
  loading = signal(false);

  async onLogin() {
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      await this.authService.login(this.email(), this.password());
      this.router.navigate(['/']);
    } catch (err) {
      this.errorMessage.set('Invalid credentials. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async onLoginWithPasskey() {
    this.errorMessage.set('');
    if (!this.email()) {
      this.errorMessage.set('Please provide an email to use Passkey.');
      return;
    }
    
    this.loading.set(true);
    try {
      await this.authService.loginWithPasskey(this.email());
      this.router.navigate(['/']);
    } catch (err) {
      this.errorMessage.set('Passkey authentication failed.');
    } finally {
      this.loading.set(false);
    }
  }
}
