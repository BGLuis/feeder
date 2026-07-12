import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input
      [type]="type()"
      [placeholder]="placeholder()"
      [(ngModel)]="value"
      class="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
    />
  `,
})
export class InputComponent {
  type = input<string>('text');
  placeholder = input<string>('');
  value = model<string>('');
}
