import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import axe from 'axe-core';
import { LoginComponent } from '../pages/login.component';
import { DashboardComponent } from '../pages/dashboard.component';
import { ReaderComponent } from '../pages/reader.component';
import { AuthService } from './auth.service';
import { FeedsService } from './services/feeds.service';
import { of } from 'rxjs';

describe('Accessibility axe checks', () => {
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
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(async () => {
    mockStorage = {};
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en' }),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ email: 'user@example.com', name: 'User' }),
            isAdmin: () => false,
            login: () => Promise.resolve({ access_token: 'tok' }),
            loginWithPasskey: () => Promise.resolve({ access_token: 'tok' }),
          },
        },
        {
          provide: FeedsService,
          useValue: {
            getSubscriptions: () => Promise.resolve([]),
            getFeeds: () => Promise.resolve([]),
            getArticles: () => Promise.resolve({ items: [], total: 0 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('login page has 0 label and button-name violations', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);
  });

  it('dashboard page has 0 label and button-name violations', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);
  });

  it('reader page has 0 label and button-name violations', async () => {
    const fixture = TestBed.createComponent(ReaderComponent);
    fixture.detectChanges();
    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);
  });
});
