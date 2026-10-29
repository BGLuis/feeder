import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
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
    window.matchMedia = (() => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  });

  beforeEach(() => {
    mockStorage = {};
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
  });

  it('sets dark theme, adds dark class to documentElement and saves to localStorage', () => {
    service.setDarkTheme();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(globalThis.localStorage.getItem('theme')).toBe('dark');
  });

  it('sets light theme, removes dark class from documentElement and saves to localStorage', () => {
    service.setDarkTheme();
    service.setLightTheme();
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(globalThis.localStorage.getItem('theme')).toBe('light');
  });

  it('toggles theme between dark and light', () => {
    service.setLightTheme();
    expect(service.isDarkMode()).toBe(false);
    service.toggleTheme();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    service.toggleTheme();
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
