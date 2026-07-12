import { Component } from '@angular/core';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="max-w-4xl mx-auto py-8">
        <header class="mb-10">
          <h1 class="text-4xl tracking-tight font-medium text-zinc-50 mb-3">System Administration</h1>
          <p class="text-zinc-400 text-lg leading-relaxed max-w-[65ch]">Monitor backend services, queue health, and perform maintenance tasks.</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <!-- MySQL Status -->
          <div class="bg-[#121212] rounded-3xl border border-zinc-800/50 p-6 flex flex-col relative overflow-hidden">
            <div class="absolute top-0 right-0 p-6">
              <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 mb-4">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-zinc-100">Database</h3>
            <p class="text-zinc-500 text-sm mt-1">MySQL TypeORM</p>
            <div class="mt-4 pt-4 border-t border-zinc-800/50">
              <p class="text-emerald-400 text-sm font-medium">Connected</p>
            </div>
          </div>

          <!-- Redis Status -->
          <div class="bg-[#121212] rounded-3xl border border-zinc-800/50 p-6 flex flex-col relative overflow-hidden">
            <div class="absolute top-0 right-0 p-6">
              <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 mb-4">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-zinc-100">Redis Cache</h3>
            <p class="text-zinc-500 text-sm mt-1">BullMQ Storage</p>
            <div class="mt-4 pt-4 border-t border-zinc-800/50">
              <p class="text-emerald-400 text-sm font-medium">Connected</p>
            </div>
          </div>

          <!-- Worker Status -->
          <div class="bg-[#121212] rounded-3xl border border-zinc-800/50 p-6 flex flex-col relative overflow-hidden">
            <div class="absolute top-0 right-0 p-6">
              <span class="flex h-3 w-3 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-400 mb-4">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-zinc-100">Scraper Worker</h3>
            <p class="text-zinc-500 text-sm mt-1">Playwright Tasks</p>
            <div class="mt-4 pt-4 border-t border-zinc-800/50">
              <p class="text-emerald-400 text-sm font-medium">Idle & Ready</p>
            </div>
          </div>
        </div>

        <div class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-xl font-medium text-zinc-100">System Logs & Queue</h2>
            <button class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-full text-sm font-medium transition-colors border border-zinc-700">
              Refresh Logs
            </button>
          </div>
          
          <div class="bg-[#0a0a0a] rounded-2xl border border-zinc-800/50 p-4 font-mono text-xs text-zinc-400 h-64 overflow-y-auto flex flex-col gap-2">
            <p><span class="text-zinc-600">[10:02:15]</span> <span class="text-emerald-400">INFO</span> BullMQ Queue initialized</p>
            <p><span class="text-zinc-600">[10:02:16]</span> <span class="text-emerald-400">INFO</span> Connected to Feeder Database successfully</p>
            <p><span class="text-zinc-600">[10:05:30]</span> <span class="text-emerald-400">INFO</span> ScraperWorker processed job #29 (0 ms)</p>
            <p><span class="text-zinc-600">[10:15:00]</span> <span class="text-zinc-500">DEBUG</span> Polling sources for new articles...</p>
            <p class="text-zinc-600 italic mt-auto">Waiting for new logs...</p>
          </div>
        </div>
      </div>
    </app-main-layout>
  `
})
export class AdminComponent {
}
