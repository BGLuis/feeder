import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReaderComponent } from './reader.component';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { FeedsService } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';

describe('ReaderComponent', () => {
  let component: ReaderComponent;
  let fixture: ComponentFixture<ReaderComponent>;
  let feedsServiceSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    window.matchMedia = (() => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;

    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });

    feedsServiceSpy = {
      getTags: vi.fn().mockResolvedValue(['tech', 'news']),
      getArticles: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'art-1',
            title: 'Initial Article',
            link: 'https://example.com/1',
            publishedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    };

    toastSpy = {
      error: vi.fn(),
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReaderComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'en' }),
        { provide: FeedsService, useValue: feedsServiceSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReaderComponent);
    component = fixture.componentInstance;
  });

  it('should render articles on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.articles().length).toBe(1);
    expect(component.error()).toBeNull();
  });

  it('should render error alert and no empty state on initial load failure', async () => {
    feedsServiceSpy.getArticles = vi.fn().mockRejectedValue(new Error('failed to load'));

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.articles().length).toBe(0);
    expect(component.error()).toBe('failed to load');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-alert')).toBeTruthy();
    expect(compiled.textContent).toContain('failed to load');
    expect(compiled.querySelector('app-empty-state')).toBeFalsy();
  });

  it('should call getArticles again when clicking retry', async () => {
    feedsServiceSpy.getArticles = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed to load'))
      .mockResolvedValueOnce({
        data: [
          {
            id: 'art-retry',
            title: 'Retry Article',
            link: 'https://example.com/retry',
            publishedAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('app-alert button') as HTMLElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(feedsServiceSpy.getArticles).toHaveBeenCalledTimes(2);
    expect(component.articles().length).toBe(1);
    expect(component.error()).toBeNull();
  });

  it('should drop out-of-order response and keep second query articles', async () => {
    let resolveFirst!: (val: any) => void;
    let resolveSecond!: (val: any) => void;

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    feedsServiceSpy.getArticles = vi
      .fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    // ngOnInit triggers first request
    fixture.detectChanges();

    // Trigger second request before first resolves
    const p2 = component.loadArticles(true);

    // Resolve second request first
    resolveSecond({
      data: [{ id: 'second-query-article', title: 'Second', link: 'https://example.com/2', publishedAt: new Date().toISOString() }],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    await p2;

    expect(component.articles().length).toBe(1);
    expect(component.articles()[0].id).toBe('second-query-article');

    // Resolve first request later (out of order)
    resolveFirst({
      data: [{ id: 'first-query-article', title: 'First', link: 'https://example.com/1', publishedAt: new Date().toISOString() }],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    await fixture.whenStable();

    // First response must be dropped because it is stale
    expect(component.articles().length).toBe(1);
    expect(component.articles()[0].id).toBe('second-query-article');
  });
});
