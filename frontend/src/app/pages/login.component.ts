import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../ui/templates/auth-layout.component';
import { LucideFingerprint } from '@lucide/angular';
import { AuthService } from '../core/auth.service';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../ui/atoms/button.component';
import { AlertComponent } from '../ui/molecules/alert.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    AuthLayoutComponent,
    LucideFingerprint,
    FormsModule,
    RouterLink,
    ButtonComponent,
    AlertComponent,
  ],
  template: `
    <app-auth-layout>
      <div class="w-full max-w-md mx-auto">
        <div
          class="bg-bg-surface rounded-2xl shadow-elevation-2 border border-border-default p-8 md:p-10 relative overflow-hidden"
        >
          <div class="relative z-10">
            <div class="text-center mb-8">
              <h1 class="text-editorial-headline-l font-serif text-text-primary">
                Feeder
              </h1>
              <p class="text-body text-text-secondary mt-2">
                Welcome back. Enter your details.
              </p>
            </div>

            <div class="space-y-5">
              <div class="space-y-1.5 text-left">
                <label class="text-label text-text-primary block">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  [ngModel]="email()"
                  (ngModelChange)="email.set($event)"
                  class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors text-sm"
                />
              </div>

              <div class="space-y-1.5 text-left">
                <label class="text-label text-text-primary block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  [ngModel]="password()"
                  (ngModelChange)="password.set($event)"
                  class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors text-sm"
                />
              </div>

              @if (errorMessage()) {
                <app-alert tone="danger" [description]="errorMessage()"></app-alert>
              }

              <div class="pt-2">
                <app-button
                  (click)="onLogin()"
                  [disabled]="loading()"
                  variant="primary"
                  size="lg"
                  customClass="w-full"
                >
                  @if (loading()) {
                    <span
                      class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></span>
                  }
                  Sign In
                </app-button>
              </div>
            </div>

            <div class="my-6 flex items-center gap-4">
              <div class="h-px bg-border-subtle flex-1"></div>
              <span class="text-overline uppercase text-text-tertiary font-semibold">Or continue with</span>
              <div class="h-px bg-border-subtle flex-1"></div>
            </div>

            <app-button
              (click)="onLoginWithPasskey()"
              [disabled]="loading()"
              variant="secondary"
              size="lg"
              customClass="w-full"
            >
              <svg lucideFingerprint class="w-5 h-5 text-icon-secondary"></svg>
              <span>Passkey</span>
            </app-button>

            <p class="text-center text-body-sm text-text-secondary mt-8">
              Don't have an account?
              <a
                routerLink="/register"
                class="text-text-accent hover:underline font-medium transition-colors ml-1"
                >Sign up</a
              >
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
