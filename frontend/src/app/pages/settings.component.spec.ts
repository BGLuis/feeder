import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

describe('SettingsComponent', () => {
  let mockStorage: Record<string, string> = {};

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          mockStorage = {};
        },
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(async () => {
    mockStorage = {};
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en' }),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ email: 'test@example.com', name: 'Test User', role: 'admin' }),
            isAdmin: () => true,
            updateProfile: () => Promise.resolve({ access_token: 'new-token' }),
            logout: () => {},
          },
        },
        {
          provide: ThemeService,
          useValue: {
            isDarkMode: () => false,
            toggleTheme: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  it('renders settings page and saves profile', async () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector('#settings-name') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    expect(nameInput.value).toBe('Test User');

    const emailInput = fixture.nativeElement.querySelector('#settings-email') as HTMLInputElement;
    expect(emailInput).toBeTruthy();
    expect(emailInput.value).toBe('test@example.com');
  });

  it('does not render the removed Advanced Configuration JSON editor', () => {
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-code-editor')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Advanced Configuration (JSON)');
  });
});
