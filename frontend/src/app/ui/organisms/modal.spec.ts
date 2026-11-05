import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';
import { SetupModalComponent } from './setup-modal.component';
import { provideTranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../core/theme.service';

@Component({
  imports: [ModalComponent],
  template: `
    <button id="modal-trigger" type="button" (click)="isOpen.set(true)">Open Modal</button>
    <app-modal [open]="isOpen()" title="Test Modal" (close)="isOpen.set(false)">
      <input id="modal-input" type="text" />
    </app-modal>
  `,
})
class ModalTestHostComponent {
  isOpen = signal(false);
}

describe('Modal and SetupModal accessibility', () => {
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
      providers: [
        provideTranslateService({ lang: 'en' }),
        {
          provide: ThemeService,
          useValue: {
            isDarkMode: () => false,
            toggleTheme: () => {},
            setDarkTheme: () => {},
            setLightTheme: () => {},
          },
        },
      ],
    }).compileComponents();
  });

  describe('ModalComponent', () => {
    it('asserts role="dialog", aria-modal="true", and focus management', async () => {
      const fixture = TestBed.createComponent(ModalTestHostComponent);
      fixture.detectChanges();

      const trigger = fixture.nativeElement.querySelector('#modal-trigger') as HTMLButtonElement;
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Open modal
      fixture.componentInstance.isOpen.set(true);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      const dialogEl = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(dialogEl).toBeTruthy();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');

      // Focus should have moved inside the dialog
      expect(dialogEl.contains(document.activeElement)).toBe(true);

      // Close modal
      fixture.componentInstance.isOpen.set(false);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
      // Focus restored back to trigger
      expect(document.activeElement).toBe(trigger);
    });

    it('traps focus inside the modal on Tab and Shift+Tab', async () => {
      const fixture = TestBed.createComponent(ModalTestHostComponent);
      fixture.componentInstance.isOpen.set(true);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      const dialogEl = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      expect(focusables.length).toBeGreaterThan(1);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialogEl.dispatchEvent(tabEvent);
      expect(document.activeElement).toBe(first);

      first.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      dialogEl.dispatchEvent(shiftTabEvent);
      expect(document.activeElement).toBe(last);
    });
  });

  describe('SetupModalComponent', () => {
    it('asserts role="dialog", aria-modal="true", and focus management', async () => {
      // Not configured, so setup modal opens automatically
      const fixture = TestBed.createComponent(SetupModalComponent);
      const hostTrigger = document.createElement('button');
      document.body.appendChild(hostTrigger);
      hostTrigger.focus();
      expect(document.activeElement).toBe(hostTrigger);

      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      const dialogEl = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(dialogEl).toBeTruthy();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');

      // Focus moved into the dialog
      expect(dialogEl.contains(document.activeElement)).toBe(true);

      // Finish setup / close
      fixture.componentInstance.finishSetup();
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(hostTrigger);
      hostTrigger.remove();
    });

    it('traps focus inside setup modal on Tab and Shift+Tab', async () => {
      const fixture = TestBed.createComponent(SetupModalComponent);
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 50));

      const dialogEl = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      const focusables = dialogEl.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      expect(focusables.length).toBeGreaterThan(1);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialogEl.dispatchEvent(tabEvent);
      expect(document.activeElement).toBe(first);

      first.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      dialogEl.dispatchEvent(shiftTabEvent);
      expect(document.activeElement).toBe(last);
    });
  });
});
