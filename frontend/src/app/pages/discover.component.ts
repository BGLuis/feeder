import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedsService } from '../core/services/feeds.service';
import { ToastService } from '../core/services/toast.service';
import { Router } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import { CodeEditorComponent, CodeTemplate } from '../ui/atoms/code-editor.component';
import { PageHeaderComponent } from '../ui/molecules/page-header.component';
import { SettingRowComponent } from '../ui/molecules/setting-row.component';
import { AlertComponent } from '../ui/molecules/alert.component';
import { ButtonComponent } from '../ui/atoms/button.component';
import { TagComponent } from '../ui/atoms/tag.component';
import { ToggleComponent } from '../ui/atoms/toggle.component';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LucideArrowRight,
    CodeEditorComponent,
    PageHeaderComponent,
    SettingRowComponent,
    AlertComponent,
    ButtonComponent,
    TagComponent,
    ToggleComponent,
  ],
  template: `
    <div class="max-w-3xl mx-auto">
        <app-page-header
          title="Add new feed"
          subtitle="Subscribe to a new RSS feed or Webhook. All data is processed privately."
        ></app-page-header>

        <div
          class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8 md:p-10"
        >
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <!-- Feed URL -->
            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary" for="url">
                Feed URL
              </label>
              <input
                id="url"
                type="url"
                formControlName="url"
                placeholder="https://example.com/feed.xml"
                class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors text-sm font-mono"
              />
            </div>

            <!-- Feed Name -->
            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary" for="name">
                Feed Name
                <span class="text-text-tertiary font-normal text-xs ml-1">(Optional)</span>
              </label>
              <input
                id="name"
                type="text"
                formControlName="name"
                placeholder="My Tech Blog"
                class="w-full h-11 px-3.5 bg-bg-field border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring transition-colors text-sm"
              />
            </div>

            <!-- Tags -->
            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary">
                Tags
                <span class="text-text-tertiary font-normal text-xs ml-1">(Press Enter or Comma)</span>
              </label>
              <div
                class="flex flex-wrap items-center gap-2 p-2 bg-bg-field border border-border-default rounded-lg focus-within:border-border-focus focus-within:shadow-focus-ring transition-colors min-h-[48px]"
              >
                @for (tag of currentTags(); track tag) {
                  <app-tag
                    [label]="tag"
                    tone="accent"
                    [removable]="true"
                    (remove)="removeTag(tag)"
                  ></app-tag>
                }
                <input
                  type="text"
                  #tagInput
                  (keydown.enter)="
                    $event.preventDefault(); addTag(tagInput.value); tagInput.value = ''
                  "
                  (keydown.comma)="
                    $event.preventDefault(); addTag(tagInput.value); tagInput.value = ''
                  "
                  (blur)="addTag(tagInput.value); tagInput.value = ''"
                  placeholder="tech, youtube, news..."
                  class="flex-1 min-w-[140px] bg-transparent border-none focus:outline-none text-text-primary placeholder:text-text-tertiary text-sm px-2 py-1"
                />
              </div>
            </div>

            <!-- Private Feed Setting -->
            <app-setting-row
              title="Private Feed"
              description="Requires authentication or contains sensitive data"
            >
              <app-toggle
                [checked]="form.get('isPrivate')?.value || false"
                label="Toggle private feed"
                (checkedChange)="form.patchValue({ isPrivate: $event })"
              ></app-toggle>
            </app-setting-row>

            <!-- Advanced Selectors -->
            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary" for="selectors">
                Advanced Selectors
                <span class="text-text-tertiary font-normal text-xs ml-1">(JSON)</span>
              </label>
              <app-code-editor
                title="HTML Selectors"
                language="json"
                height="200px"
                [code]="form.get('selectors')?.value || ''"
                [templates]="selectorTemplates"
                (codeChange)="onSelectorsChange($event)"
              ></app-code-editor>
            </div>

            @if (error()) {
              <app-alert tone="danger" [description]="error()!"></app-alert>
            }

            <div class="pt-2 flex justify-end">
              <app-button
                (click)="onSubmit()"
                [disabled]="form.invalid || loading()"
                variant="primary"
                size="lg"
              >
                @if (loading()) {
                  <span
                    class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"
                  ></span>
                  Subscribing...
                } @else {
                  <span>Subscribe Feed</span>
                  <svg lucideArrowRight class="w-4 h-4"></svg>
                }
              </app-button>
            </div>
          </form>
        </div>
      </div>
  `,
})
export class DiscoverComponent {
  private fb = inject(FormBuilder);
  private feedsService = inject(FeedsService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    name: [''],
    isPrivate: [false],
    selectors: [''],
  });

  currentTags = signal<string[]>([]);

  addTag(tagValue: string) {
    const tag = tagValue.trim().toLowerCase();
    if (tag && !this.currentTags().includes(tag)) {
      this.currentTags.update((tags) => [...tags, tag]);
    }
  }

  removeTag(tagToRemove: string) {
    this.currentTags.update((tags) => tags.filter((t) => t !== tagToRemove));
  }

  selectorTemplates: CodeTemplate[] = [
    { name: 'RSS Padrão (Limpar)', code: '' },
    {
      name: 'Artigo Simples',
      code: '{\n  "title": "h1",\n  "content": ".article-body",\n  "author": ".author-name"\n}',
    },
    {
      name: 'Medium / Substack',
      code: '{\n  "title": "h1",\n  "content": "article",\n  "date": "time"\n}',
    },
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
        selectors: parsedSelectors,
      });
      this.toast.success('Feed subscribed', {
        description: val.name || val.url || undefined,
      });
      this.router.navigate(['/']);
    } catch (err: any) {
      const message = err?.message || 'Failed to subscribe';
      this.error.set(message);
      this.toast.error('Could not subscribe', { description: message });
    } finally {
      this.loading.set(false);
    }
  }
}
