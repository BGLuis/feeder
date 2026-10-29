import { Component, signal } from '@angular/core';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { PageHeaderComponent } from '../ui/molecules/page-header.component';
import { ButtonComponent } from '../ui/atoms/button.component';
import { BadgeComponent } from '../ui/atoms/badge.component';
import {
  LucideDatabase,
  LucideServer,
  LucideCpu,
  LucideRefreshCw,
} from '@lucide/angular';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    MainLayoutComponent,
    PageHeaderComponent,
    ButtonComponent,
    BadgeComponent,
    LucideDatabase,
    LucideServer,
    LucideCpu,
    LucideRefreshCw,
  ],
  template: `
    <app-main-layout>
      <div class="max-w-4xl mx-auto">
        <app-page-header
          title="System Administration"
          subtitle="Monitor backend services, queue health, and perform maintenance tasks."
        ></app-page-header>

        <!-- Service status cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <!-- MySQL Status -->
          <div
            class="bg-bg-surface rounded-2xl border border-border-default p-6 flex flex-col justify-between shadow-elevation-1 relative"
          >
            <div>
              <div class="flex items-center justify-between mb-4">
                <div
                  class="w-11 h-11 rounded-xl bg-bg-muted flex items-center justify-center text-icon-secondary"
                >
                  <svg lucideDatabase class="w-5 h-5"></svg>
                </div>
                <app-badge label="Connected" tone="accent" [dot]="true"></app-badge>
              </div>
              <h3 class="text-heading-h3 font-medium text-text-primary">Database</h3>
              <p class="text-text-secondary text-xs mt-1">MySQL TypeORM</p>
            </div>
            <div class="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-tertiary">
              <span>Latency</span>
              <span class="font-mono text-text-primary font-medium">1.2ms</span>
            </div>
          </div>

          <!-- Redis Status -->
          <div
            class="bg-bg-surface rounded-2xl border border-border-default p-6 flex flex-col justify-between shadow-elevation-1 relative"
          >
            <div>
              <div class="flex items-center justify-between mb-4">
                <div
                  class="w-11 h-11 rounded-xl bg-bg-muted flex items-center justify-center text-icon-secondary"
                >
                  <svg lucideServer class="w-5 h-5"></svg>
                </div>
                <app-badge label="Connected" tone="accent" [dot]="true"></app-badge>
              </div>
              <h3 class="text-heading-h3 font-medium text-text-primary">Redis Cache</h3>
              <p class="text-text-secondary text-xs mt-1">BullMQ Storage</p>
            </div>
            <div class="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-tertiary">
              <span>Queue Jobs</span>
              <span class="font-mono text-text-primary font-medium">0 active</span>
            </div>
          </div>

          <!-- Worker Status -->
          <div
            class="bg-bg-surface rounded-2xl border border-border-default p-6 flex flex-col justify-between shadow-elevation-1 relative"
          >
            <div>
              <div class="flex items-center justify-between mb-4">
                <div
                  class="w-11 h-11 rounded-xl bg-bg-muted flex items-center justify-center text-icon-secondary"
                >
                  <svg lucideCpu class="w-5 h-5"></svg>
                </div>
                <app-badge label="Idle & Ready" tone="info" [dot]="true"></app-badge>
              </div>
              <h3 class="text-heading-h3 font-medium text-text-primary">Scraper Worker</h3>
              <p class="text-text-secondary text-xs mt-1">Playwright Tasks</p>
            </div>
            <div class="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-tertiary">
              <span>Concurrency</span>
              <span class="font-mono text-text-primary font-medium">4 workers</span>
            </div>
          </div>
        </div>

        <!-- Logs & Queue Section -->
        <div class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 class="text-heading-h2 font-medium text-text-primary">System Logs & Queue</h2>
              <p class="text-body-sm text-text-secondary mt-0.5">Live operational events stream</p>
            </div>
            <app-button (click)="refreshLogs()" variant="secondary" size="md">
              <svg lucideRefreshCw class="w-4 h-4" [class.animate-spin]="isRefreshing()"></svg>
              <span>Refresh Logs</span>
            </app-button>
          </div>

          <!-- Console terminal -->
          <div
            class="bg-bg-field rounded-xl border border-border-default p-4 font-mono text-xs text-text-secondary h-64 overflow-x-auto overflow-y-auto flex flex-col gap-2"
          >
            <p><span class="text-text-tertiary">[10:02:15]</span> <span class="text-text-accent font-semibold">INFO</span> BullMQ Queue initialized</p>
            <p><span class="text-text-tertiary">[10:02:16]</span> <span class="text-text-accent font-semibold">INFO</span> Connected to Feeder Database successfully</p>
            <p><span class="text-text-tertiary">[10:05:30]</span> <span class="text-text-accent font-semibold">INFO</span> ScraperWorker processed job #29 (0 ms)</p>
            <p><span class="text-text-tertiary">[10:15:00]</span> <span class="text-text-info font-semibold">DEBUG</span> Polling sources for new articles...</p>
            <p><span class="text-text-tertiary">[10:20:00]</span> <span class="text-text-accent font-semibold">INFO</span> All feeds synchronized smoothly</p>
            <p class="text-text-tertiary italic mt-auto">Waiting for new events...</p>
          </div>
        </div>
      </div>
    </app-main-layout>
  `,
})
export class AdminComponent {
  isRefreshing = signal(false);

  refreshLogs() {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 600);
  }
}
