import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebhooksService, Webhook } from '../core/services/webhooks.service';
import { CodeEditorComponent, CodeTemplate } from '../ui/code-editor.component';

@Component({
  selector: 'app-webhooks-config',
  standalone: true,
  imports: [ReactiveFormsModule, CodeEditorComponent],
  template: `
    <section class="bg-[#121212] rounded-[2rem] shadow-sm border border-zinc-800/50 p-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-medium text-zinc-100 flex items-center gap-2">
          <svg class="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Webhooks Configuration
        </h2>
        
        @if (!showForm()) {
          <button (click)="openForm()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium transition-colors">
            Add Webhook
          </button>
        }
      </div>

      <div class="flex flex-col gap-4">
        @if (webhooksService.webhooks().length === 0 && !showForm()) {
          <p class="text-zinc-500 text-sm">No webhooks configured yet.</p>
        }

        <!-- Webhooks List -->
        @if (!showForm()) {
          @for (webhook of webhooksService.webhooks(); track webhook.id) {
            <div class="flex flex-col p-4 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-zinc-200 font-medium text-sm">{{ webhook.url }}</p>
                  <p class="text-zinc-500 text-xs mt-1">Trigger: {{ webhook.triggerType }} {{ webhook.triggerValue ? '(' + webhook.triggerValue + ')' : '' }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 rounded text-xs" [class.bg-emerald-500]="webhook.isActive" [class.text-white]="webhook.isActive" [class.bg-zinc-800]="!webhook.isActive" [class.text-zinc-400]="!webhook.isActive">
                    {{ webhook.isActive ? 'Active' : 'Inactive' }}
                  </span>
                  <button (click)="deleteWebhook(webhook.id)" class="p-2 text-red-400 hover:bg-red-950/30 rounded-full transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        }

        <!-- Add Webhook Form -->
        @if (showForm()) {
          <form [formGroup]="webhookForm" (ngSubmit)="saveWebhook()" class="flex flex-col gap-6 p-6 bg-[#0a0a0a] border border-zinc-800/50 rounded-2xl">
            <div>
              <label class="block text-sm font-medium text-zinc-400 mb-2">Target URL</label>
              <input type="url" formControlName="url" placeholder="https://api.example.com/webhook" class="w-full px-4 py-3 bg-[#121212] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-2">Trigger Event</label>
                <select formControlName="triggerType" class="w-full px-4 py-3 bg-[#121212] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200">
                  <option value="ALL">All Feeds (Any new article)</option>
                  <option value="TAG">Specific Tag</option>
                  <option value="SOURCE">Specific Source/Feed</option>
                </select>
              </div>

              @if (webhookForm.get('triggerType')?.value !== 'ALL') {
                <div>
                  <label class="block text-sm font-medium text-zinc-400 mb-2">Trigger Value</label>
                  <input type="text" formControlName="triggerValue" placeholder="e.g., 'tech' or source ID" class="w-full px-4 py-3 bg-[#121212] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200" />
                </div>
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-zinc-400 mb-2">Secret (Optional, for HMAC-SHA256 signature)</label>
              <input type="text" formControlName="secret" placeholder="Leave blank to auto-generate" class="w-full px-4 py-3 bg-[#121212] border border-zinc-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm text-zinc-200" />
            </div>

            <div>
              <label class="block text-sm font-medium text-zinc-400 mb-2">Payload Template (JSON)</label>
              <p ngNonBindable class="text-xs text-zinc-500 mb-3">Available variables: <code>{{item.title}}</code>, <code>{{item.url}}</code>, <code>{{item.content}}</code>, <code>{{item.imageUrl}}</code>, <code>{{feed.name}}</code></p>
              
              <app-code-editor
                title="Webhook Payload"
                language="json"
                height="250px"
                [code]="payloadCode"
                [templates]="webhookTemplates"
                (codeChange)="onPayloadChange($event)"
              ></app-code-editor>
            </div>

            <div class="flex items-center justify-end gap-3 mt-2">
              <button type="button" (click)="closeForm()" class="px-5 py-2.5 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" [disabled]="webhookForm.invalid || loading()" class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                @if (loading()) {
                  <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                }
                Save Webhook
              </button>
            </div>
            
            @if (errorMessage()) {
              <div class="p-3 bg-red-950/30 text-red-400 rounded-xl text-sm border border-red-900/50 mt-2">
                {{ errorMessage() }}
              </div>
            }
          </form>
        }
      </div>
    </section>
  `
})
export class WebhooksConfigComponent implements OnInit {
  webhooksService = inject(WebhooksService);
  private fb = inject(FormBuilder);
  
  showForm = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  
  webhookForm = this.fb.group({
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    secret: [''],
    triggerType: ['ALL'],
    triggerValue: ['']
  });

  payloadCode = '{\n  "event": "new_article",\n  "feed": "{{feed.name}}",\n  "article": {\n    "title": "{{item.title}}",\n    "url": "{{item.url}}",\n    "image": "{{item.imageUrl}}"\n  }\n}';
  
  webhookTemplates: CodeTemplate[] = [
    {
      name: 'Default Payload',
      code: '{\n  "event": "new_article",\n  "feed": "{{feed.name}}",\n  "article": {\n    "title": "{{item.title}}",\n    "url": "{{item.url}}",\n    "image": "{{item.imageUrl}}"\n  }\n}'
    },
    {
      name: 'Slack/Discord Compatible',
      code: '{\n  "content": "New article in {{feed.name}}!\\n**{{item.title}}**\\n{{item.url}}"\n}'
    }
  ];

  ngOnInit() {
    this.webhooksService.loadWebhooks();
  }

  openForm() {
    this.webhookForm.reset({ triggerType: 'ALL' });
    this.errorMessage.set('');
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  onPayloadChange(newCode: string) {
    this.payloadCode = newCode;
  }

  async saveWebhook() {
    if (this.webhookForm.invalid) return;
    
    this.loading.set(true);
    this.errorMessage.set('');
    
    try {
      const formValue = this.webhookForm.value;
      
      // Basic validation for JSON
      try {
        JSON.parse(this.payloadCode);
      } catch (e) {
        throw new Error('Payload Template must be valid JSON');
      }

      await this.webhooksService.createWebhook({
        url: formValue.url!,
        secret: formValue.secret || undefined,
        triggerType: formValue.triggerType!,
        triggerValue: formValue.triggerValue || undefined,
        payloadTemplate: this.payloadCode
      });
      
      this.closeForm();
    } catch (err: any) {
      this.errorMessage.set(err.message || err.error?.message || 'Failed to save webhook');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteWebhook(id: string) {
    if (confirm('Are you sure you want to delete this webhook?')) {
      try {
        await this.webhooksService.deleteWebhook(id);
      } catch (err: any) {
        console.error('Failed to delete webhook', err);
      }
    }
  }
}
