import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light') {
        this.applyTheme(false);
      } else if (stored === 'dark') {
        this.applyTheme(true);
      } else {
        // Check system preference without writing to localStorage
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.applyTheme(mediaQuery.matches);
        mediaQuery.addEventListener?.('change', (e) => {
          if (!localStorage.getItem('theme')) {
            this.applyTheme(e.matches);
          }
        });
      }
    }
  }

  toggleTheme() {
    if (this.isDarkMode()) {
      this.setLightTheme();
    } else {
      this.setDarkTheme();
    }
  }

  private applyTheme(dark: boolean) {
    this.isDarkMode.set(dark);
    if (typeof window !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  setDarkTheme() {
    this.applyTheme(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', 'dark');
    }
  }

  setLightTheme() {
    this.applyTheme(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', 'light');
    }
  }
}
