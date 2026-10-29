import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input
      [type]="type()"
      [name]="name()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [autocomplete]="autocomplete()"
      [value]="value()"
      (input)="onInput($event)"
      [class]="
        'w-full rounded-lg border bg-bg-field px-3 text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:border-border-focus focus:shadow-focus-ring disabled:opacity-50 disabled:cursor-not-allowed ' +
        (size() === 'lg' ? 'h-12 text-base' : 'h-10 text-sm') +
        (invalid() ? ' border-border-danger focus:shadow-focus-ring-danger' : ' border-border-default')
      "
    />
  `,
})
export class InputComponent {
  type = input<string>('text');
  name = input<string>('');
  placeholder = input<string>('');
  size = input<'md' | 'lg'>('md');
  disabled = input<boolean>(false);
  readonly = input<boolean>(false);
  autocomplete = input<string>('off');
  invalid = input<boolean>(false);
  value = model<string>('');

  onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.value.set(target.value);
  }
}
