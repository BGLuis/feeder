import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WebhooksService, Webhook } from '../core/services/webhooks.service';
import { CodeEditorComponent, CodeTemplate } from '../ui/atoms/code-editor.component';
import { WebhookRowComponent } from '../ui/molecules/webhook-row.component';
import { AlertComponent } from '../ui/molecules/alert.component';
import { ButtonComponent } from '../ui/atoms/button.component';
import { SelectComponent, SelectOption } from '../ui/atoms/select.component';
import { EmptyStateComponent } from '../ui/molecules/empty-state.component';
import { LucideWebhook, LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-webhooks-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CodeEditorComponent,
    WebhookRowComponent,
    AlertComponent,
    ButtonComponent,
    SelectComponent,
    EmptyStateComponent,
    LucideWebhook,
    LucidePlus,
  ],
  template: `
    <section class="bg-bg-surface rounded-2xl shadow-elevation-1 border border-border-default p-6 sm:p-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 class="text-heading-h2 font-medium text-text-primary flex items-center gap-2.5">
          <svg lucideWebhook class="w-5 h-5 text-icon-secondary"></svg>
          <span>Webhooks Configuration</span>
        </h2>

        @if (!showForm()) {
          <app-button (click)="openForm()" variant="primary" size="md">
            <svg lucidePlus class="w-4 h-4"></svg>
            <span>Add Webhook</span>
          </app-button>
        }
      </div>

      <div class="flex flex-col gap-4">
        @if (webhooksService.webhooks().length === 0 && !showForm()) {
          <app-empty-state
            title="No webhooks yet"
            description="Configure external endpoints to receive real-time notifications on new articles."
          >
            <div action>
              <app-button (click)="openForm()" variant="secondary" size="md">
                Add your first webhook
              </app-button>
            </div>
          </app-empty-state>
        }

        <!-- Webhooks List -->
        @if (!showForm()) {
          <div class="flex flex-col gap-3">
            @for (webhook of webhooksService.webhooks(); track webhook.id) {
              <app-webhook-row
                [webhook]="webhook"
                (toggleActive)="toggleWebhook(webhook.id, $event)"
                (delete)="deleteWebhook($event)"
              ></app-webhook-row>
            }
          </div>
        }

        <!-- Add Webhook Form -->
        @if (showForm()) {
          <form
            [formGroup]="webhookForm"
            (ngSubmit)="saveWebhook()"
            class="flex flex-col gap-5 p-6 bg-bg-field border border-border-default rounded-xl"
          >
            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary">Target URL</label>
              <input
                type="url"
                formControlName="url"
                placeholder="https://api.example.com/webhook"
                class="w-full h-11 px-3.5 bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring font-mono text-sm transition-colors"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-label text-text-primary">Trigger Event</label>
                <app-select
                  [options]="triggerOptions"
                  [value]="webhookForm.get('triggerType')?.value"
                  (valueChange)="webhookForm.patchValue({ triggerType: $event })"
                ></app-select>
              </div>

              @if (webhookForm.get('triggerType')?.value !== 'ALL') {
                <div class="flex flex-col gap-1.5">
                  <label class="text-label text-text-primary">Trigger Value</label>
                  <input
                    type="text"
                    formControlName="triggerValue"
                    placeholder="e.g. 'tech' or source ID"
                    class="w-full h-11 px-3.5 bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring text-sm transition-colors"
                  />
                </div>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary">Secret (Optional HMAC)</label>
              <input
                type="text"
                formControlName="secret"
                placeholder="Leave blank to auto-generate"
                class="w-full h-11 px-3.5 bg-bg-surface border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-focus-ring font-mono text-xs transition-colors"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-label text-text-primary">Payload Template (JSON)</label>
              <p ngNonBindable class="text-xs text-text-tertiary mb-1">
                Available variables: <code>{{item.title}}</code>, <code>{{item.url}}</code>, <code>{{item.content}}</code>, <code>{{item.imageUrl}}</code>, <code>{{feed.name}}</code>
              </p>
              <app-code-editor
                title="Webhook Payload"
                language="json"
                height="220px"
                [code]="payloadCode"
                [templates]="webhookTemplates"
                (codeChange)="onPayloadChange($event)"
              ></app-code-editor>
            </div>

            @if (errorMessage()) {
              <app-alert tone="danger" [description]="errorMessage()"></app-alert>
            }

            <div class="flex items-center justify-end gap-3 mt-2">
              <app-button (click)="closeForm()" variant="ghost" size="md">
                Cancel
              </app-button>
              <app-button
                (click)="saveWebhook()"
                [disabled]="webhookForm.invalid || loading()"
                variant="primary"
                size="md"
              >
                @if (loading()) {
                  <span
                    class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5"
                  ></span>
                  Saving...
                } @else {
                  Save Webhook
                }
              </app-button>
            </div>
          </form>
        }
      </div>
    </section>
  `,
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
    triggerValue: [''],
  });

  readonly triggerOptions: SelectOption[] = [
    { label: 'All Feeds (Any new article)', value: 'ALL' },
    { label: 'Specific Tag', value: 'TAG' },
    { label: 'Specific Source/Feed', value: 'SOURCE' },
  ];

  payloadCode =
    '{\n  "event": "new_article",\n  "feed": "{{feed.name}}",\n  "article": {\n    "title": "{{item.title}}",\n    "url": "{{item.url}}",\n    "image": "{{item.imageUrl}}"\n  }\n}';

  webhookTemplates: CodeTemplate[] = [
    {
      name: 'Default Payload',
      code: '{\n  "event": "new_article",\n  "feed": "{{feed.name}}",\n  "article": {\n    "title": "{{item.title}}",\n    "url": "{{item.url}}"\n  }\n}',
    },
    {
      name: 'Discord / Slack Webhook',
      code: '{\n  "content": "Novo artigo publicado em **{{feed.name}}**!\\n**{{item.title}}**\\n{{item.url}}"\n}',
    },
  ];

  ngOnInit() {
    this.webhooksService.loadWebhooks();
  }

  openForm() {
    this.showForm.set(true);
    this.errorMessage.set('');
  }

  closeForm() {
    this.showForm.set(false);
    this.webhookForm.reset({ triggerType: 'ALL' });
  }

  onPayloadChange(code: string) {
    this.payloadCode = code;
  }

  async saveWebhook() {
    if (this.webhookForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const val = this.webhookForm.value;

    try {
      await this.webhooksService.createWebhook({
        url: val.url!,
        secret: val.secret || undefined,
        triggerType: val.triggerType as any,
        triggerValue: val.triggerValue || undefined,
        payloadTemplate: this.payloadCode,
      });

      this.closeForm();
    } catch (err: any) {
      this.errorMessage.set(err.error?.message || err.message || 'Failed to save webhook');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleWebhook(id: string, active: boolean) {
    try {
      await this.webhooksService.updateWebhook(id, { isActive: active });
    } catch (err) {
      console.error(err);
    }
  }

  async deleteWebhook(id: string) {
    if (confirm('Are you sure you want to delete this webhook?')) {
      await this.webhooksService.deleteWebhook(id);
    }
  }
}
