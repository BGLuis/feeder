import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { provideRouter } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { provideTranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { FeedsService } from '../core/services/feeds.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let feedsServiceSpy: any;

  beforeEach(async () => {
    window.matchMedia = (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    feedsServiceSpy = {
      getSubscriptions: () => Promise.resolve([{ id: '1', customName: 'Angular Blog', source: { id: 's1', name: 'Angular Blog', url: 'https://blog.angular.dev' } }])
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'en' }),
        { provide: AuthService, useValue: { currentUser: signal(null), isAdmin: () => false } },
        { provide: FeedsService, useValue: feedsServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should load feeds on init', async () => {
    fixture.detectChanges(); // ngOnInit is called
    await fixture.whenStable(); // wait for promises
    fixture.detectChanges(); // update view with signal changes

    expect(component.feeds().length).toBe(1);
    expect(component.loading()).toBe(false);
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Angular Blog');
  });

  it('should handle error when loading feeds', async () => {
    feedsServiceSpy.getSubscriptions = vi.fn().mockRejectedValue(new Error('network error'));
    
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.feeds().length).toBe(0);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('network error');
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-alert')).toBeTruthy();
    expect(compiled.textContent).toContain('network error');
    expect(compiled.querySelector('app-empty-state')).toBeFalsy();
    expect(compiled.textContent).not.toContain('No feeds yet');
  });

  it('should call getSubscriptions again when clicking retry', async () => {
    feedsServiceSpy.getSubscriptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([
        { id: '1', customName: 'Angular Blog', source: { id: 's1', name: 'Angular Blog', url: 'https://blog.angular.dev' } },
      ]);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('app-alert button') as HTMLElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(feedsServiceSpy.getSubscriptions).toHaveBeenCalledTimes(2);
    expect(component.feeds().length).toBe(1);
    expect(component.error()).toBeNull();
  });
});
