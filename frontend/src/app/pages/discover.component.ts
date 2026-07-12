import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedsService } from '../core/services/feeds.service';
import { MainLayoutComponent } from '../ui/templates/main-layout.component';
import { Router } from '@angular/router';
import { CodeEditorComponent, CodeTemplate } from '../ui/code-editor.component';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [MainLayoutComponent, ReactiveFormsModule, CodeEditorComponent],
  template: `
    <app-main-layout>
      <div class="max-w-3xl mx-auto py-8">
        <header class="mb-10">
          <h1 class="text-4xl tracking-tight font-medium text-zinc-50 mb-3">Add new feed</h1>
          <p class="text-zinc-400 text-lg leading-relaxed max-w-[65ch]">Subscribe to a new RSS feed or Webhook. All data is processed privately.</p>
        </header>

        <div class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8 md:p-10">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-8">
            
            <div class="flex flex-col gap-3">
              <label class="text-sm font-medium text-zinc-200" for="url">Feed URL</label>
              <input 
                id="url"
                type="url" 
                formControlName="url" 
                placeholder="https://example.com/feed.xml"
                class="px-4 py-3.5 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-sm font-medium text-zinc-200" for="name">Feed Name <span class="text-zinc-500 font-normal ml-1">(Optional)</span></label>
              <input 
                id="name"
                type="text" 
                formControlName="name" 
                placeholder="My Tech Blog"
                class="px-4 py-3.5 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all text-zinc-100 placeholder:text-zinc-600"
              />
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-sm font-medium text-zinc-200">Tags <span class="text-zinc-500 font-normal ml-1">(Press Enter or Comma)</span></label>
              <div class="flex flex-wrap items-center gap-2 p-2 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-500/50 transition-all min-h-[56px] text-zinc-100">
                @for (tag of currentTags(); track tag) {
                  <span class="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm font-medium">
                    <svg class="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {{ tag }}
                    <button type="button" (click)="removeTag(tag)" class="text-zinc-500 hover:text-white transition-colors ml-1 p-0.5 focus:outline-none">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                }
                <input 
                  type="text" 
                  #tagInput
                  (keydown.enter)="$event.preventDefault(); addTag(tagInput.value); tagInput.value = ''"
                  (keydown.comma)="$event.preventDefault(); addTag(tagInput.value); tagInput.value = ''"
                  (blur)="addTag(tagInput.value); tagInput.value = ''"
                  placeholder="tech, youtube, news..."
                  class="flex-1 min-w-[140px] bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-100 placeholder:text-zinc-600 px-2 py-1.5"
                />
              </div>
            </div>

            <div class="flex items-center justify-between py-6 border-y border-zinc-800/50">
              <div class="flex flex-col gap-1">
                <label class="text-base font-medium text-zinc-200" for="isPrivate">Private Feed</label>
                <span class="text-sm text-zinc-500">Requires authentication or contains sensitive data</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" formControlName="isPrivate" id="isPrivate" class="sr-only peer">
                <div class="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 border border-zinc-700 peer-checked:border-emerald-500"></div>
              </label>
            </div>

            <div class="flex flex-col gap-3">
              <label class="text-sm font-medium text-zinc-200" for="selectors">Advanced Selectors <span class="text-zinc-500 font-normal ml-1">(JSON)</span></label>
              <app-code-editor
                title="Seletores HTML"
                language="json"
                height="200px"
                [code]="form.get('selectors')?.value || ''"
                [templates]="selectorTemplates"
                (codeChange)="onSelectorsChange($event)"
              ></app-code-editor>
            </div>

            <div class="pt-2 flex justify-end">
              <button 
                type="submit" 
                [disabled]="form.invalid || loading()"
                class="bg-zinc-100 hover:bg-white text-zinc-950 px-8 py-3.5 rounded-full font-medium transition-all focus:outline-none focus:ring-4 focus:ring-zinc-100/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-sm shadow-sm"
              >
                @if (loading()) {
                  <span class="inline-block w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-950 rounded-full animate-spin"></span>
                  Subscribing...
                } @else {
                  Subscribe Feed
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                }
              </button>
            </div>

            @if (error()) {
              <div class="p-4 bg-red-950/30 text-red-400 rounded-2xl text-sm border border-red-900/50 flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ error() }}</span>
              </div>
            }
          </form>
        </div>
      </div>
    </app-main-layout>
  `
})
export class DiscoverComponent {
  private fb = inject(FormBuilder);
  private feedsService = inject(FeedsService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    name: [''],
    isPrivate: [false],
    selectors: ['']
  });

  currentTags = signal<string[]>([]);

  addTag(tagValue: string) {
    const tag = tagValue.trim().toLowerCase();
    if (tag && !this.currentTags().includes(tag)) {
      this.currentTags.update(tags => [...tags, tag]);
    }
  }

  removeTag(tagToRemove: string) {
    this.currentTags.update(tags => tags.filter(t => t !== tagToRemove));
  }

  selectorTemplates: CodeTemplate[] = [
    { name: 'RSS Padrão (Limpar)', code: '' },
    { name: 'Artigo Simples', code: '{\n  "title": "h1",\n  "content": ".article-body",\n  "author": ".author-name"\n}' },
    { name: 'Medium / Substack', code: '{\n  "title": "h1",\n  "content": "article",\n  "date": "time"\n}' }
  ];

  onSelectorsChange(newCode: string) {
    this.form.patchValue({ selectors: newCode });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const val = this.form.value;
    let parsedSelectors = undefined;

    if (val.selectors) {
      try {
        parsedSelectors = JSON.parse(val.selectors);
      } catch (e) {
        this.error.set('Invalid JSON in selectors');
        this.loading.set(false);
        return;
      }
    }

    try {
      await this.feedsService.subscribe({
        url: val.url!,
        name: val.name || undefined,
        tags: this.currentTags().length > 0 ? this.currentTags() : undefined,
        isPrivate: val.isPrivate || false,
        selectors: parsedSelectors
      });
      this.router.navigate(['/']);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to subscribe');
    } finally {
      this.loading.set(false);
    }
  }
}
