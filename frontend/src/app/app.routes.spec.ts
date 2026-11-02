import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, RouterOutlet } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { Component } from '@angular/core';

@Component({
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
class TestRootComponent {}

describe('app.routes navigation', () => {
  let router: Router;

  const mockStorage: Record<string, string> = {};
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
          Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
        },
      },
      writable: true,
      configurable: true,
    });
  });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TestRootComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('navigates login -> reader -> settings successfully', async () => {
    // 1. Navigate to /login (unauthenticated)
    const loginOk = await router.navigateByUrl('/login');
    expect(loginOk).toBe(true);
    expect(router.url).toBe('/login');

    // Set valid token to satisfy authGuard
    const validPayload = btoa(
      JSON.stringify({
        sub: '123',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    localStorage.setItem('access_token', `header.${validPayload}.signature`);

    // 2. Navigate to /reader
    const readerOk = await router.navigateByUrl('/reader');
    expect(readerOk).toBe(true);
    expect(router.url).toBe('/reader');

    // 3. Navigate to /settings
    const settingsOk = await router.navigateByUrl('/settings');
    expect(settingsOk).toBe(true);
    expect(router.url).toBe('/settings');
  });
});
