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

const mockFeed = {
  id: 'sub-1',
  customName: 'Tech Feed',
  source: { id: 'src-1', name: 'Tech News', url: 'https://example.com/rss' },
};

const mockArticle = {
  id: 'art-1',
  title: 'Tech Article',
  url: 'https://example.com/1',
  publishedAt: new Date().toISOString(),
  source: { id: 'src-1', name: 'Tech News' },
};

describe('Accessibility axe checks', () => {
  let mockStorage: Record<string, string> = {};

  beforeAll(() => {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

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
            getSubscriptions: () => Promise.resolve([mockFeed]),
            getFeeds: () => Promise.resolve([mockFeed]),
            getArticles: () => Promise.resolve({ data: [mockArticle], total: 1 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('login page has 0 label and button-name violations and explicit for/id pairing', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const emailInput = fixture.nativeElement.querySelector('#login-email');
    const emailLabel = fixture.nativeElement.querySelector('label[for="login-email"]');
    const passwordInput = fixture.nativeElement.querySelector('#login-password');
    const passwordLabel = fixture.nativeElement.querySelector('label[for="login-password"]');

    expect(emailInput).toBeTruthy();
    expect(emailLabel).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(passwordLabel).toBeTruthy();

    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);
  });

  it('dashboard page has 0 label and button-name violations with rendered data and modal', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);

    // Open edit modal and verify its rendered form controls satisfy axe
    fixture.componentInstance.openEditModal(mockFeed as any);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const modalResults = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(modalResults.violations).toEqual([]);
  });

  it('reader page has 0 label and button-name violations with rendered articles', async () => {
    const fixture = TestBed.createComponent(ReaderComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const results = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'rule', values: ['button-name', 'label'] },
    });
    expect(results.violations).toEqual([]);
  });
});
