import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="toggle()"
      class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      [class]="checked() ? 'bg-bg-accent' : 'bg-bg-muted'"
    >
      <span
        class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-fast ease-standard"
        [class]="checked() ? 'translate-x-[22px]' : 'translate-x-0.5'"
      ></span>
    </button>
  `,
})
export class ToggleComponent {
  checked = model<boolean>(false);
  label = input.required<string>();
  disabled = input<boolean>(false);

  toggle() {
    if (!this.disabled()) {
      this.checked.set(!this.checked());
    }
  }
}
