import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { ModalComponent } from './modal.component';
import { ToastHostComponent } from './toast-host.component';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

@Component({
  imports: [SidebarComponent, ModalComponent, ToastHostComponent],
  template: `
    <app-sidebar />
    <app-modal [open]="modalOpen" title="Edit Feed" (close)="modalOpen = false">
      <p>Modal body content</p>
    </app-modal>
    <app-toast-host />
  `,
})
class OrganismsHostComponent {
  modalOpen = true;
}

describe('organisms', () => {
  let toastService: ToastService;
  let mockStorage: Record<string, string> = {};

  beforeAll(() => {
    const fakeLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(async () => {
    mockStorage = {};
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideTranslateService({ lang: 'en' }),
        ToastService,
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ email: 'test@example.com', name: 'Test User', role: 'admin' }),
            isAdmin: () => true,
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
    toastService = TestBed.inject(ToastService);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      NAV: {
        ADMIN: 'System Admin',
        DASHBOARD: 'Overview',
        TIMELINE: 'Timeline',
        DISCOVER: 'Add feed',
        SETTINGS: 'Settings',
      },
    });
    translate.use('en');
  });

  it('sidebar toggles collapsed state and persists in localStorage', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const initialExpanded = fixture.componentInstance.isExpanded;
    fixture.componentInstance.toggle();
    fixture.detectChanges();

    expect(fixture.componentInstance.isExpanded).toBe(!initialExpanded);
    expect(globalThis.localStorage.getItem('sidebarExpanded')).toBe(String(!initialExpanded));
  });

  it('sidebar renders System Admin when user is admin', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;
    expect(aside.textContent).toContain('System Admin');
    expect(aside.textContent).toContain('Read');
    expect(aside.textContent).toContain('System');
  });

  it('modal renders title and closes on button click', () => {
    const fixture = TestBed.createComponent(OrganismsHostComponent);
    fixture.detectChanges();

    const modalTitle = fixture.nativeElement.querySelector('#modal-title') as HTMLElement;
    expect(modalTitle.textContent?.trim()).toBe('Edit Feed');

    const closeBtn = fixture.nativeElement.querySelector('app-modal button') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalOpen).toBe(false);
  });

  it('toast host renders toasts from ToastService', () => {
    const fixture = TestBed.createComponent(OrganismsHostComponent);
    fixture.detectChanges();

    toastService.success('Feed added successfully', {
      duration: 3000,
    });
    fixture.detectChanges();

    const toastItem = fixture.nativeElement.querySelector('.toast-item') as HTMLElement;
    expect(toastItem).toBeTruthy();
    expect(toastItem.textContent).toContain('Feed added successfully');
  });

  it('bottom-nav renders 4 mobile destinations with labels', () => {
    const fixture = TestBed.createComponent(OrganismsHostComponent);
    fixture.detectChanges();

    const bottomNav = fixture.nativeElement.querySelector('app-bottom-nav nav') as HTMLElement;
    expect(bottomNav).toBeTruthy();
    const links = bottomNav.querySelectorAll('a');
    expect(links.length).toBe(4);
    expect(bottomNav.textContent).toContain('Overview');
    expect(bottomNav.textContent).toContain('Timeline');
    expect(bottomNav.textContent).toContain('Add feed');
    expect(bottomNav.textContent).toContain('Settings');
  });
});
