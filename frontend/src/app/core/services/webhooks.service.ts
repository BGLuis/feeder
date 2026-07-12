import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  isActive: boolean;
  triggerType: 'ALL' | 'TAG' | 'SOURCE';
  triggerValue: string | null;
  payloadTemplate: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class WebhooksService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/webhooks';

  webhooks = signal<Webhook[]>([]);

  async loadWebhooks() {
    this.http.get<Webhook[]>(this.apiUrl).subscribe({
      next: (data) => this.webhooks.set(data),
      error: (err) => console.error('Error loading webhooks', err)
    });
  }

  async createWebhook(data: { url: string; secret?: string; triggerType: string; triggerValue?: string; payloadTemplate?: string }) {
    return new Promise((resolve, reject) => {
      this.http.post(this.apiUrl, data).subscribe({
        next: (res) => {
          this.loadWebhooks();
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }

  async updateWebhook(id: string, data: Partial<Webhook>) {
    return new Promise((resolve, reject) => {
      this.http.put(`${this.apiUrl}/${id}`, data).subscribe({
        next: (res) => {
          this.loadWebhooks();
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }

  async deleteWebhook(id: string) {
    return new Promise((resolve, reject) => {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: (res) => {
          this.loadWebhooks();
          resolve(res);
        },
        error: (err) => reject(err)
      });
    });
  }
}
