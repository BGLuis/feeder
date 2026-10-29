import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToggleComponent } from './toggle.component';
import { CounterComponent } from './counter.component';
import { ChipComponent } from './chip.component';
import { TagComponent } from './tag.component';
import { BadgeComponent } from './badge.component';
import { SegmentedComponent } from './segmented.component';
import { AvatarComponent } from './avatar.component';
import { SourceMarkComponent } from './source-mark.component';
import { SearchFieldComponent } from './search-field.component';
import { SelectComponent } from './select.component';

import { ButtonComponent } from './button.component';
import { InputComponent } from './input.component';
import { IconButtonComponent } from './icon-button.component';

@Component({
  imports: [
    ToggleComponent,
    CounterComponent,
    ChipComponent,
    TagComponent,
    BadgeComponent,
    SegmentedComponent,
    AvatarComponent,
    SourceMarkComponent,
    SearchFieldComponent,
    SelectComponent,
    ButtonComponent,
    InputComponent,
    IconButtonComponent,
  ],
  template: `
    <app-toggle label="Notifications" [(checked)]="on" [disabled]="toggleDisabled()" />
    <app-counter [value]="n()" />
    <app-chip label="Tech" [count]="5" [(selected)]="chipSelected" />
    <app-tag label="javascript" tone="accent" [removable]="true" (remove)="tagRemoved.set(true)" />
    <app-badge label="Active" tone="accent" [dot]="true" />
    <app-segmented [options]="segmentOptions" [(value)]="selectedSegment" />
    <app-avatar name="Alice Bob" size="md" />
    <app-source-mark name="Hacker News" color="#ff6600" size="sm" />
    <app-search-field [(value)]="searchText" placeholder="Filter articles" />
    <app-select [options]="selectOptions" [(value)]="selectedValue" />
    <app-button variant="primary" size="md">Click me</app-button>
    <app-input [(value)]="inputValue" placeholder="Enter text" [invalid]="inputInvalid()" />
    <app-icon-button label="Close modal"><span class="icon">X</span></app-icon-button>
  `,
})
class HostComponent {
  on = signal(false);
  toggleDisabled = signal(false);
  n = signal(0);
  chipSelected = signal(false);
  tagRemoved = signal(false);
  inputValue = signal('initial');
  inputInvalid = signal(false);
  segmentOptions = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
  ];
  selectedSegment = signal('all');
  searchText = signal('');
  selectOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
  ];
  selectedValue = signal('1');
}

describe('atoms', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('toggle exposes role=switch and flips aria-checked on click', () => {
    const fixture = setup();
    const btn = fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-checked')).toBe('false');
    btn.click();
    fixture.detectChanges();
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.on()).toBe(true);
  });

  it('counter is hidden at 0, shows the value, and caps at 99+', () => {
    const fixture = setup();
    const text = () => (fixture.nativeElement.querySelector('app-counter') as HTMLElement).textContent!.trim();
    expect(text()).toBe('');
    fixture.componentInstance.n.set(7);
    fixture.detectChanges();
    expect(text()).toBe('7');
    fixture.componentInstance.n.set(100);
    fixture.detectChanges();
    expect(text()).toBe('99+');
  });

  it('chip toggles selection on click', () => {
    const fixture = setup();
    const chipBtn = fixture.nativeElement.querySelector('app-chip button') as HTMLButtonElement;
    expect(chipBtn.getAttribute('aria-pressed')).toBe('false');
    chipBtn.click();
    fixture.detectChanges();
    expect(chipBtn.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.chipSelected()).toBe(true);
  });

  it('tag emits remove event', () => {
    const fixture = setup();
    const removeBtn = fixture.nativeElement.querySelector('app-tag button') as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();
    removeBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.tagRemoved()).toBe(true);
  });

  it('badge displays label and dot', () => {
    const fixture = setup();
    const badge = fixture.nativeElement.querySelector('app-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toContain('Active');
    expect(badge.querySelector('span.rounded-full.h-1\\.5')).toBeTruthy();
  });

  it('segmented updates value on option click', () => {
    const fixture = setup();
    const buttons = fixture.nativeElement.querySelectorAll('app-segmented button');
    expect(buttons.length).toBe(2);
    expect(fixture.componentInstance.selectedSegment()).toBe('all');
    (buttons[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedSegment()).toBe('unread');
  });

  it('avatar extracts uppercase initial', () => {
    const fixture = setup();
    const avatar = fixture.nativeElement.querySelector('app-avatar') as HTMLElement;
    expect(avatar.textContent?.trim()).toBe('A');
  });

  it('source-mark displays initial and background color', () => {
    const fixture = setup();
    const mark = fixture.nativeElement.querySelector('app-source-mark > div') as HTMLElement;
    expect(mark.textContent?.trim()).toBe('H');
    expect(mark.style.backgroundColor).toContain('255, 102, 0');
  });

  it('search-field updates value and clears', () => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('app-search-field input') as HTMLInputElement;
    input.value = 'query';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.searchText()).toBe('query');

    const clearBtn = fixture.nativeElement.querySelector('app-search-field button') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    clearBtn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.searchText()).toBe('');
  });

  it('button defaults to type=button and renders content and classes', () => {
    const fixture = setup();
    const btn = fixture.nativeElement.querySelector('app-button button') as HTMLButtonElement;
    expect(btn.type).toBe('button');
    expect(btn.textContent?.trim()).toBe('Click me');
    expect(btn.classList.contains('bg-bg-inverse')).toBe(true);
  });

  it('input updates value and displays invalid state', () => {
    const fixture = setup();
    const input = fixture.nativeElement.querySelector('app-input input') as HTMLInputElement;
    expect(input.value).toBe('initial');
    expect(input.placeholder).toBe('Enter text');

    fixture.componentInstance.inputInvalid.set(true);
    fixture.detectChanges();
    expect(input.classList.contains('border-border-danger')).toBe(true);
  });

  it('icon-button renders aria-label', () => {
    const fixture = setup();
    const btn = fixture.nativeElement.querySelector('app-icon-button button') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Close modal');
  });

  it('toggle does not change state when disabled', () => {
    const fixture = setup();
    fixture.componentInstance.toggleDisabled.set(true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.on()).toBe(false);
  });
});
