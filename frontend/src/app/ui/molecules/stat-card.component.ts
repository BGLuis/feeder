import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { BadgeComponent } from '../atoms/badge.component';

export type StatEmphasis = 'default' | 'highlight';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideArrowRight, BadgeComponent],
  template: `
    <div
      class="rounded-2xl border p-6 sm:p-8 flex flex-col justify-between shadow-elevation-1 transition-all"
      [class]="
        emphasis() === 'highlight'
          ? 'bg-bg-surface-raised border-border-accent'
          : 'bg-bg-surface border-border-default'
      "
    >
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <span class="text-overline uppercase text-text-tertiary tracking-[0.08em] font-semibold">
            {{ label() }}
          </span>
          @if (delta()) {
            <app-badge [label]="delta()!" tone="accent"></app-badge>
          }
        </div>

        <div class="text-display-stat text-text-primary font-light">
          {{ value() }}
        </div>

        @if (description()) {
          <p class="text-body-sm text-text-secondary mt-2">
            {{ description() }}
          </p>
        }
      </div>

      @if (link() && linkText()) {
        <div class="mt-6 pt-4 border-t border-border-subtle">
          <a
            [routerLink]="link()"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-text-accent hover:underline transition-colors"
          >
            <span>{{ linkText() }}</span>
            <svg lucideArrowRight class="w-4 h-4"></svg>
          </a>
        </div>
      }
    </div>
  `,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  delta = input<string | undefined>(undefined);
  description = input<string>('');
  link = input<string | undefined>(undefined);
  linkText = input<string | undefined>(undefined);
  emphasis = input<StatEmphasis>('default');
}
