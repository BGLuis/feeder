import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../ui/templates/auth-layout.component';
import { AuthService } from '../core/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthLayoutComponent, FormsModule, RouterLink],
  template: `
    <app-auth-layout>
      <div class="w-full max-w-md mx-auto">
        <div class="bg-white dark:bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-200 dark:border-zinc-800/50 p-8 md:p-10 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-zinc-800/10 to-transparent opacity-50"></div>
          
          <div class="relative z-10">
            <div class="text-center mb-10">
              <h1 class="text-4xl font-light text-zinc-900 dark:text-zinc-50 tracking-tight">Create Account</h1>
              <p class="text-zinc-600 dark:text-zinc-400 mt-3 text-sm">Join the private aggregation platform.</p>
            </div>

            <div class="space-y-6">
              <div class="space-y-2 text-left">
                <label class="text-sm font-medium text-zinc-800 dark:text-zinc-200 block">Email</label>
                <input type="email" placeholder="nome@exemplo.com" [(ngModel)]="email"
                  class="w-full px-4 py-3.5 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-600" />
              </div>
              
              <div class="space-y-2 text-left">
                <label class="text-sm font-medium text-zinc-800 dark:text-zinc-200 block">Password</label>
                <input type="password" placeholder="••••••••" [(ngModel)]="password"
                  class="w-full px-4 py-3.5 bg-zinc-50 dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-600" />
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
                <button (click)="onRegister()"
                  [disabled]="loading() || !email() || !password()"
                  class="w-full bg-zinc-100 hover:bg-white text-zinc-950 px-8 py-3.5 rounded-full font-medium transition-all focus:outline-none focus:ring-4 focus:ring-zinc-100/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm shadow-sm">
                  @if (loading()) {
                    <span class="inline-block w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin"></span>
                  }
                  Sign Up
                </button>
              </div>
            </div>

            <p class="text-center text-sm text-zinc-500 mt-8">
              Already have an account? 
              <a routerLink="/login" class="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:text-white font-medium transition-colors">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </app-auth-layout>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal('');
  password = signal('');
  errorMessage = signal('');
  loading = signal(false);

  async onRegister() {
    this.errorMessage.set('');
    this.loading.set(true);
    try {
      await this.authService.register(this.email(), this.password());
      this.router.navigate(['/']);
    } catch (err) {
      this.errorMessage.set('Failed to create account. Email might be in use.');
    } finally {
      this.loading.set(false);
    }
  }
}
